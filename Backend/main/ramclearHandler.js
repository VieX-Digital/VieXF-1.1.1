import { ipcMain, webContents } from "electron"
import { executePowerShell } from "./powershell"
import log from "electron-log"
import os from "os"

console.log = log.log
console.error = log.error
console.warn = log.warn

// ── Push-based subscriber system (mirrors system.js pattern) ──────────────
const RAMCLEAR_UPDATE_CHANNEL = "ramclear:stats:update"
const RAMCLEAR_INTERVAL_MS = 3000
const ramclearSubscribers = new Map()
const trackedRamSenders = new Set()
let ramPollTimer = null
let ramPollInFlight = false

// ── RAM Stats Collection (pure Node.js, zero PowerShell) ──────────────────
// Uses os.totalmem/freemem for basic stats. For Standby/Cache breakdown,
// we call WMI once via a lightweight PowerShell query.

const ramStatsCache = {
  totalMb: 0,
  activeMb: 0,
  standbyMb: 0,
  freeMb: 0,
  usagePercent: 0,
  timestamp: 0,
}

async function collectRamStats() {
  try {
    const totalBytes = os.totalmem()
    const freeBytes = os.freemem()
    const totalMb = Math.round(totalBytes / 1024 / 1024)
    const freeMb = Math.round(freeBytes / 1024 / 1024)
    const usedMb = totalMb - freeMb

    // Try to get Standby/Cache breakdown from WMI (cached query, lightweight)
    let standbyMb = 0
    try {
      const script = `
        $mem = Get-CimInstance Win32_PerfFormattedData_PerfOS_Memory -ErrorAction Stop
        $standby = [Math]::Round(([double]$mem.StandbyCacheNormalPriorityBytes + [double]$mem.StandbyCacheReserveBytes + [double]$mem.StandbyCacheCoreBytes) / 1MB, 0)
        Write-Output $standby
      `
      const result = await executePowerShell(null, { script, name: "ramclear-standby" })
      if (result.success) {
        standbyMb = parseInt(result.output.trim(), 10) || 0
      }
    } catch {
      // Fallback: estimate standby as (total - free - active)
      standbyMb = 0
    }

    const activeMb = usedMb - standbyMb
    const usagePercent = totalMb > 0 ? Math.round((usedMb / totalMb) * 100) : 0

    ramStatsCache.totalMb = totalMb
    ramStatsCache.activeMb = Math.max(0, activeMb)
    ramStatsCache.standbyMb = Math.max(0, standbyMb)
    ramStatsCache.freeMb = freeMb
    ramStatsCache.usagePercent = usagePercent
    ramStatsCache.timestamp = Date.now()

    return { ...ramStatsCache }
  } catch (error) {
    console.error("[ramclear] Stats collection error:", error)
    return { ...ramStatsCache }
  }
}

// ── RAM Cleaning via Windows API (C# Add-Type in PowerShell) ──────────────
// Uses EmptyWorkingSet per-process (chunked to prevent stutter) +
// NtSetSystemInformation for Standby List cleanup when usage > 70%.

const cleanRamScript = `
$ErrorActionPreference = 'Stop'

# Load Windows API for EmptyWorkingSet
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
using System.Diagnostics;

public static class RamCleaner {
    [DllImport("psapi.dll", SetLastError = true)]
    public static extern bool EmptyWorkingSet(IntPtr hProcess);

    [DllImport("ntdll.dll", SetLastError = true)]
    public static extern int NtSetSystemInformation(int InfoClass, ref int Info, int Length);

    // SystemMemoryListInformation = 80, MemoryPurgeStandbyList = 4
    public static int PurgeStandbyList() {
        int command = 4;
        return NtSetSystemInformation(80, ref command, sizeof(int));
    }

    public static int CleanWorkingSets() {
        int cleaned = 0;
        Process[] procs = Process.GetProcesses();
        // Process in chunks of 50 to avoid CPU spike
        for (int i = 0; i < procs.Length; i++) {
            try {
                if (procs[i].WorkingSet64 > 10 * 1024 * 1024) { // Only >10MB
                    EmptyWorkingSet(procs[i].Handle);
                    cleaned++;
                }
            } catch { }

            // Yield every 50 processes to prevent stuttering
            if (i > 0 && i % 50 == 0) {
                System.Threading.Thread.Sleep(80);
            }
        }
        return cleaned;
    }
}
"@ -ReferencedAssemblies @('System.dll')

$totalBefore = [Math]::Round(([double](Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory) / 1024, 0)

# Step 1: Clean working sets (chunked, anti-stutter)
$processCount = [RamCleaner]::CleanWorkingSets()

# Step 2: Purge Standby List only if RAM usage > 70%
$os = Get-CimInstance Win32_OperatingSystem
$totalMem = [double]$os.TotalVisibleMemorySize
$freeMem = [double]$os.FreePhysicalMemory
$usagePercent = [Math]::Round((($totalMem - $freeMem) / $totalMem) * 100, 0)

$standbyPurged = $false
if ($usagePercent -gt 70) {
    try {
        $result = [RamCleaner]::PurgeStandbyList()
        $standbyPurged = ($result -eq 0)
    } catch { }
    # Small delay after standby purge to let system settle
    Start-Sleep -Milliseconds 200
}

$totalAfter = [Math]::Round(([double](Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory) / 1024, 0)
$freedMb = $totalAfter - $totalBefore

@{
    success = $true
    freedMb = [Math]::Max(0, $freedMb)
    beforeFreeMb = $totalBefore
    afterFreeMb = $totalAfter
    processCount = $processCount
    standbyPurged = $standbyPurged
} | ConvertTo-Json -Compress
`

async function cleanRam() {
  try {
    const result = await executePowerShell(null, {
      script: cleanRamScript,
      name: "ramclear-clean",
    })

    if (!result.success) {
      return { success: false, error: result.error || "RAM clean failed" }
    }

    // Parse the JSON output
    const lines = String(result.output || "")
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)

    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        const parsed = JSON.parse(lines[i])
        log.info("[ramclear] Cleaned:", parsed)
        return parsed
      } catch {}
    }

    return { success: false, error: "Unable to parse clean result" }
  } catch (error) {
    console.error("[ramclear] Clean error:", error)
    return { success: false, error: error.message }
  }
}

// ── Push-based polling for subscribers ────────────────────────────────────

function pruneDeadRamSubscribers() {
  for (const id of ramclearSubscribers.keys()) {
    const sender = webContents.fromId(id)
    if (!sender || sender.isDestroyed()) {
      ramclearSubscribers.delete(id)
      trackedRamSenders.delete(id)
    }
  }
}

function stopRamPoller() {
  if (ramPollTimer) {
    clearTimeout(ramPollTimer)
    ramPollTimer = null
  }
}

function scheduleRamTick(delayMs) {
  if (ramPollTimer) clearTimeout(ramPollTimer)
  ramPollTimer = setTimeout(runRamTick, delayMs)
}

function ensureRamPoller() {
  pruneDeadRamSubscribers()
  if (ramclearSubscribers.size === 0) {
    stopRamPoller()
    return
  }
  if (!ramPollTimer) {
    scheduleRamTick(0)
  }
}

async function runRamTick() {
  ramPollTimer = null
  pruneDeadRamSubscribers()
  if (ramclearSubscribers.size === 0) {
    stopRamPoller()
    return
  }

  if (ramPollInFlight) {
    scheduleRamTick(RAMCLEAR_INTERVAL_MS)
    return
  }

  ramPollInFlight = true
  try {
    const stats = await collectRamStats()
    for (const id of ramclearSubscribers.keys()) {
      const sender = webContents.fromId(id)
      if (sender && !sender.isDestroyed()) {
        sender.send(RAMCLEAR_UPDATE_CHANNEL, stats)
      } else {
        ramclearSubscribers.delete(id)
        trackedRamSenders.delete(id)
      }
    }
  } finally {
    ramPollInFlight = false
    if (ramclearSubscribers.size > 0) {
      scheduleRamTick(RAMCLEAR_INTERVAL_MS)
    }
  }
}

// ── IPC Handlers ──────────────────────────────────────────────────────────

export function setupRamClearHandlers() {
  ipcMain.removeHandler("ramclear:stats")
  ipcMain.removeHandler("ramclear:clean")
  ipcMain.removeAllListeners("ramclear:subscribe")
  ipcMain.removeAllListeners("ramclear:unsubscribe")

  ipcMain.handle("ramclear:stats", async () => {
    return await collectRamStats()
  })

  ipcMain.handle("ramclear:clean", async () => {
    return await cleanRam()
  })

  ipcMain.on("ramclear:subscribe", (event) => {
    const senderId = event.sender.id
    ramclearSubscribers.set(senderId, { hidden: false })

    if (!trackedRamSenders.has(senderId)) {
      trackedRamSenders.add(senderId)
      event.sender.once("destroyed", () => {
        ramclearSubscribers.delete(senderId)
        trackedRamSenders.delete(senderId)
        ensureRamPoller()
      })
    }

    ensureRamPoller()

    // Send immediate snapshot
    void collectRamStats().then((stats) => {
      if (!event.sender.isDestroyed()) {
        event.sender.send(RAMCLEAR_UPDATE_CHANNEL, stats)
      }
    })
  })

  ipcMain.on("ramclear:unsubscribe", (event) => {
    const senderId = event.sender.id
    ramclearSubscribers.delete(senderId)
    trackedRamSenders.delete(senderId)
    ensureRamPoller()
  })
}

export default { setupRamClearHandlers }
