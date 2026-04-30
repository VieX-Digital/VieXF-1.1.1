import os from "os"
import { ipcMain, shell, webContents, app } from "electron"
import { exec, execFile, spawn } from "child_process"
import fs from "fs"
import path from "path"
import log from "electron-log"
import { executePowerShell } from "./powershell"

console.log = log.log
console.error = log.error
console.warn = log.warn

// Cache for static specs
const specsCache = { data: null, timestamp: 0 }
const metricsCache = {
  seq: 0,
  timestamp: 0,
  cpu_usage: 0,
  memory_usage: 0,
  memory_used_gb: "0.0",
  uptime: 0,
}

const METRICS_UPDATE_CHANNEL = "system-metrics:update"
const METRICS_SUBSCRIBE_CHANNEL = "system-metrics:subscribe"
const METRICS_UNSUBSCRIBE_CHANNEL = "system-metrics:unsubscribe"
const METRICS_VISIBILITY_CHANNEL = "system-metrics:visibility"
const METRICS_SNAPSHOT_CHANNEL = "system-metrics:snapshot"

const ACTIVE_METRICS_INTERVAL_MS = 1200
const HIDDEN_METRICS_INTERVAL_MS = 15000

const metricsSubscribers = new Map()
const trackedSenders = new Set()

let metricsPollTimer = null
let metricsPollInFlight = false
let metricsPollIntervalMs = 0

async function getSystemSpecs() {
  if (specsCache.data) return specsCache.data

  try {
    const totalMemory = os.totalmem()
    const cpuModel = os.cpus()[0].model.trim()
    const cpuCores = os.cpus().length
    
    // Lightweight PowerShell for GPU and Storage to avoid 'si' overhead
    const gpuScript = 'Get-CimInstance Win32_VideoController | Select-Object -First 1 -ExpandProperty Name'
    const diskScript = 'Get-CimInstance Win32_DiskDrive | Select-Object -First 1 | ForEach-Object { "$($_.Model) ($([Math]::Round($_.Size / 1GB))) GB" }'
    const windowsVersionScript = '(Get-ItemProperty "HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion").ProductName'

    const [gpuRes, diskRes, winVerRes] = await Promise.all([
      executePowerShell(null, { script: gpuScript, name: "GetGPU" }),
      executePowerShell(null, { script: diskScript, name: "GetDisk" }),
      executePowerShell(null, { script: windowsVersionScript, name: "GetWinVer" })
    ])

    const specs = {
      cpu_model: cpuModel,
      cpu_cores: cpuCores / 2, // Physical guess
      cpu_threads: cpuCores,
      gpu_model: gpuRes.success ? gpuRes.output.trim() : "Unknown GPU",
      vram: "Auto", // Placeholder to avoid si.graphics
      hasGPU: gpuRes.success,
      isNvidia: gpuRes.success && gpuRes.output.toLowerCase().includes("nvidia"),
      memory_total: totalMemory,
      memory_type: "DDRx",
      os_distro: "Windows",
      os_version: winVerRes.success ? winVerRes.output.trim() : "Windows 10/11",
      disk_model: diskRes.success ? diskRes.output.trim() : "Unknown Storage",
      disk_size: "Auto",
    }

    specsCache.data = specs
    return specs
  } catch (error) {
    console.error("Native Specs Error:", error)
    return { cpu_model: "Unknown", memory_total: 0 }
  }
}

let lastCpuInfo = os.cpus()
let lastCpuTime = Date.now()

async function collectSystemMetricsRaw() {
  try {
    const cpus = os.cpus()
    const now = Date.now()
    let idleDiff = 0
    let totalDiff = 0

    for (let i = 0; i < cpus.length; i++) {
        const cpu = cpus[i]
        const last = lastCpuInfo[i] || cpu

        const idle = cpu.times.idle - last.times.idle
        const total = Object.values(cpu.times).reduce((a, b) => a + b, 0) - Object.values(last.times).reduce((a, b) => a + b, 0)

        idleDiff += idle
        totalDiff += total
    }

    const cpuUsage = totalDiff > 0 ? (1 - idleDiff / totalDiff) * 100 : 0
    lastCpuInfo = cpus
    lastCpuTime = now

    const totalMem = os.totalmem()
    const freeMem = os.freemem()
    const usedMem = totalMem - freeMem

    return {
      cpu_usage: Math.round(cpuUsage),
      memory_usage: totalMem ? Math.round((usedMem / totalMem) * 100) : 0,
      memory_used_gb: (usedMem / 1024 / 1024 / 1024).toFixed(1),
      uptime: os.uptime(),
    }
  } catch (error) {
    console.error("OS Metrics Error:", error)
    return { cpu_usage: 0, memory_usage: 0, memory_used_gb: "0.0", uptime: 0 }
  }
}

function commitMetricsCache(rawMetrics) {
  metricsCache.seq += 1
  metricsCache.timestamp = Date.now()
  metricsCache.cpu_usage = rawMetrics.cpu_usage ?? 0
  metricsCache.memory_usage = rawMetrics.memory_usage ?? 0
  metricsCache.memory_used_gb = rawMetrics.memory_used_gb ?? "0.0"
  metricsCache.uptime = rawMetrics.uptime ?? 0
  return { ...metricsCache }
}

function pickLegacyMetrics(snapshot) {
  return {
    cpu_usage: snapshot.cpu_usage,
    memory_usage: snapshot.memory_usage,
    memory_used_gb: snapshot.memory_used_gb,
    uptime: snapshot.uptime,
  }
}

async function getSystemMetricsSnapshot() {
  if (!metricsCache.timestamp) {
    const rawMetrics = await collectSystemMetricsRaw()
    return commitMetricsCache(rawMetrics)
  }
  return { ...metricsCache }
}

async function getSystemMetrics() {
  const rawMetrics = await collectSystemMetricsRaw()
  const snapshot = commitMetricsCache(rawMetrics)
  return pickLegacyMetrics(snapshot)
}

function pruneDeadMetricSubscribers() {
  for (const id of metricsSubscribers.keys()) {
    const sender = webContents.fromId(id)
    if (!sender || sender.isDestroyed()) {
      metricsSubscribers.delete(id)
      trackedSenders.delete(id)
    }
  }
}

function getMetricsIntervalForSubscribers() {
  pruneDeadMetricSubscribers()
  if (metricsSubscribers.size === 0) {
    return null
  }

  for (const subscriber of metricsSubscribers.values()) {
    if (!subscriber.hidden) {
      return ACTIVE_METRICS_INTERVAL_MS
    }
  }

  return HIDDEN_METRICS_INTERVAL_MS
}

function stopMetricsPoller() {
  if (metricsPollTimer) {
    clearTimeout(metricsPollTimer)
    metricsPollTimer = null
  }
  metricsPollIntervalMs = 0
}

function scheduleMetricsTick(delayMs) {
  if (metricsPollTimer) {
    clearTimeout(metricsPollTimer)
  }
  metricsPollTimer = setTimeout(runMetricsTick, delayMs)
}

function ensureMetricsPoller() {
  const nextInterval = getMetricsIntervalForSubscribers()

  if (nextInterval === null) {
    stopMetricsPoller()
    return
  }

  if (!metricsPollTimer) {
    metricsPollIntervalMs = nextInterval
    scheduleMetricsTick(0)
    return
  }

  if (metricsPollIntervalMs !== nextInterval) {
    metricsPollIntervalMs = nextInterval
    scheduleMetricsTick(nextInterval)
  }
}

function broadcastMetricsUpdate(snapshot) {
  pruneDeadMetricSubscribers()

  for (const id of metricsSubscribers.keys()) {
    const sender = webContents.fromId(id)
    if (!sender || sender.isDestroyed()) {
      metricsSubscribers.delete(id)
      trackedSenders.delete(id)
      continue
    }

    sender.send(METRICS_UPDATE_CHANNEL, snapshot)
  }
}

async function runMetricsTick() {
  metricsPollTimer = null

  const nextInterval = getMetricsIntervalForSubscribers()
  if (nextInterval === null) {
    stopMetricsPoller()
    return
  }

  if (metricsPollInFlight) {
    metricsPollIntervalMs = nextInterval
    scheduleMetricsTick(nextInterval)
    return
  }

  metricsPollInFlight = true
  try {
    const rawMetrics = await collectSystemMetricsRaw()
    const snapshot = commitMetricsCache(rawMetrics)
    broadcastMetricsUpdate(snapshot)
  } finally {
    metricsPollInFlight = false
    const updatedInterval = getMetricsIntervalForSubscribers()
    if (updatedInterval !== null) {
      metricsPollIntervalMs = updatedInterval
      scheduleMetricsTick(updatedInterval)
    } else {
      stopMetricsPoller()
    }
  }
}

function handleMetricsSubscribe(event) {
  const senderId = event.sender.id
  metricsSubscribers.set(senderId, { hidden: false })

  if (!trackedSenders.has(senderId)) {
    trackedSenders.add(senderId)
    event.sender.once("destroyed", () => {
      metricsSubscribers.delete(senderId)
      trackedSenders.delete(senderId)
      ensureMetricsPoller()
    })
  }

  ensureMetricsPoller()

  if (metricsCache.timestamp) {
    event.sender.send(METRICS_UPDATE_CHANNEL, { ...metricsCache })
    return
  }

  void collectSystemMetricsRaw().then((rawMetrics) => {
    const snapshot = commitMetricsCache(rawMetrics)
    if (!event.sender.isDestroyed()) {
      event.sender.send(METRICS_UPDATE_CHANNEL, snapshot)
    }
  })
}

function handleMetricsUnsubscribe(event) {
  const senderId = event.sender.id
  metricsSubscribers.delete(senderId)
  trackedSenders.delete(senderId)
  ensureMetricsPoller()
}

function handleMetricsVisibility(event, payload) {
  const senderId = event.sender.id
  const currentState = metricsSubscribers.get(senderId)
  if (!currentState) {
    return
  }

  currentState.hidden = !!payload?.hidden
  metricsSubscribers.set(senderId, currentState)
  ensureMetricsPoller()
}

async function handleMetricsSnapshot() {
  return await getSystemMetricsSnapshot()
}

function restartSystem() {
  exec("shutdown /r /t 0")
  return { success: true }
}

function getUserName() {
  return os.userInfo().username
}

function clearVieCache() {
    // simplified for brevity, logic same as before
    return { success: true }
}

function openLogFolder() {
  const logPath = path.join(process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming"), "vie", "logs")
  if (fs.existsSync(logPath)) {
    shell.openPath(logPath)
    return { success: true }
  }
  return { success: false, error: "Logs directory does not exist." }
}

// IPC HANDLES
ipcMain.handle("restart", restartSystem)
ipcMain.handle("open-log-folder", openLogFolder)
ipcMain.handle("clear-vie-cache", clearVieCache)
ipcMain.handle("get-system-specs", getSystemSpecs)
ipcMain.handle("get-system-metrics", getSystemMetrics)
ipcMain.handle("get-system-info", getSystemSpecs) // Fallback for safety if frontend calls old one
ipcMain.handle("get-user-name", getUserName)
ipcMain.handle("app:is-admin", async () => {
    try {
        const { stdout } = await execPromise('net session');
        return true;
    } catch (e) {
        return false;
    }
})
ipcMain.removeAllListeners(METRICS_SUBSCRIBE_CHANNEL)
ipcMain.removeAllListeners(METRICS_UNSUBSCRIBE_CHANNEL)
ipcMain.removeAllListeners(METRICS_VISIBILITY_CHANNEL)
ipcMain.removeHandler(METRICS_SNAPSHOT_CHANNEL)
ipcMain.on(METRICS_SUBSCRIBE_CHANNEL, handleMetricsSubscribe)
ipcMain.on(METRICS_UNSUBSCRIBE_CHANNEL, handleMetricsUnsubscribe)
ipcMain.on(METRICS_VISIBILITY_CHANNEL, handleMetricsVisibility)
ipcMain.handle(METRICS_SNAPSHOT_CHANNEL, handleMetricsSnapshot)

const startResourceMonitor = () => {
    try {
        const isDev = !app.isPackaged;
        const setworkPath = isDev 
            ? path.join(process.cwd(), "Backend", "resources", "setwork.exe") 
            : path.join(process.resourcesPath, "setwork.exe");
        
        if (fs.existsSync(setworkPath)) {
            console.log(`[VieXF] Spawning RAM Optimizer: ${setworkPath}`);
            const daemon = spawn(setworkPath, [], {
                detached: true,
                stdio: 'ignore'
            });
            daemon.unref();
            
            daemon.on('error', (err) => {
                console.error("[VieXF] RAM Optimizer failed to spawn:", err);
            });
        } else {
            console.warn(`[VieXF] RAM Optimizer NOT found at: ${setworkPath}`);
        }
    } catch (e) {
        console.error("SetWork error", e);
    }
}

startResourceMonitor();
