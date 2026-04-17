import { ipcMain, app } from "electron"
import fs from "fs/promises"
import path from "path"
import { exec } from "child_process"
import { promisify } from "util"
import { logo } from "./index"
import { executePowerShell } from "./powershell"
import { getLicenseTier } from "./licenseTier.js"
import si from "systeminformation"
import log from "electron-log"

console.log = log.log
console.error = log.error
console.warn = log.warn

const execPromise = promisify(exec)
const userDataPath = app.getPath("userData")
const tweaksStatePath = path.join(userDataPath, "tweakStates.json")
const isDev = !app.isPackaged
const tweaksDir = isDev ? path.join(process.cwd(), "Backend", "tweaks") : path.join(process.resourcesPath, "tweaks")

const tweakCatalogCache = {
  data: null,
  timestamp: 0,
}

const tweakStateCache = {
  data: null,
}

const TWEAK_CATALOG_TTL_MS = 15000
let tweakExecutionQueue = Promise.resolve()

const getExePath = (exeName) => {
  if (isDev) {
    return path.resolve(process.cwd(), "Backend", "resources", exeName)
  }
  return path.join(process.resourcesPath, exeName)
}

const getNipPath = () => {
  if (isDev) {
    return path.resolve(process.cwd(), "Backend", "resources", "vienvidia.nip")
  }
  return path.join(process.resourcesPath, "vienvidia.nip")
}

const normalizeError = (error, fallbackMessage) => {
  if (!error) {
    return fallbackMessage
  }
  if (typeof error === "string") {
    return error
  }
  if (error.message) {
    return error.message
  }
  return fallbackMessage
}

const runInTweakQueue = async (runner) => {
  const queuedTask = tweakExecutionQueue.then(runner, runner)
  tweakExecutionQueue = queuedTask.catch(() => undefined)
  return queuedTask
}

async function loadTweaks(forceRefresh = false) {
  const now = Date.now()
  if (!forceRefresh && tweakCatalogCache.data && now - tweakCatalogCache.timestamp < TWEAK_CATALOG_TTL_MS) {
    return tweakCatalogCache.data
  }

  const entries = await fs.readdir(tweaksDir, { withFileTypes: true })
  const tweaks = []

  for (const dir of entries) {
    if (!dir.isDirectory()) continue

    const name = dir.name
    const folder = path.join(tweaksDir, name)
    const applyPath = path.join(folder, "apply.ps1")
    const unapplyPath = path.join(folder, "unapply.ps1")
    const metaPath = path.join(folder, "meta.json")

    const hasMeta = await fs
      .access(metaPath)
      .then(() => true)
      .catch(() => false)

    if (!hasMeta) continue

    let psapply = ""
    let psunapply = ""

    try {
      const rawApply = await fs.readFile(applyPath, "utf8")
      // Replace $PSScriptRoot with the actual folder path so dependencies can be found
      // Using single quotes to avoid escaping issues in PowerShell
      psapply = rawApply.replace(/\$PSScriptRoot/g, `'${folder}'`)
    } catch (error) {
      if (error.code !== "ENOENT") {
        console.warn(`Error reading apply.ps1 for tweak: ${name}`, error)
      } else {
        console.warn(`[vie]: Tweak "${name}" is missing apply.ps1 - skipping`)
      }
      continue
    }

    if (!psapply || psapply.trim().length === 0) {
      console.warn(`[vie]: Tweak "${name}" has empty apply.ps1 - skipping`)
      continue
    }

    try {
      const rawUnapply = await fs.readFile(unapplyPath, "utf8")
      psunapply = rawUnapply.replace(/\$PSScriptRoot/g, `'${folder}'`)
    } catch (error) {
      if (error.code !== "ENOENT") {
        console.warn(`Error reading unapply.ps1 for tweak: ${name}`, error)
      }
    }

    let meta = {}

    try {
      meta = JSON.parse(await fs.readFile(metaPath, "utf8"))
    } catch (error) {
      console.warn(`Error reading meta.json for tweak: ${name}`, error)
      continue
    }

    tweaks.push({
      id: name,
      name,
      psapply,
      psunapply: psunapply || "",
      ...meta,
    })
  }

  console.log(`[vie]: Loaded ${tweaks.length} valid tweaks`)
  tweakCatalogCache.data = tweaks
  tweakCatalogCache.timestamp = now
  return tweaks
}

const findTweak = (tweaks, idOrName) => {
  return tweaks.find((t) => t.id === idOrName || t.name === idOrName)
}

async function loadTweakStatesObject() {
  if (tweakStateCache.data) {
    return { ...tweakStateCache.data }
  }

  try {
    const raw = await fs.readFile(tweaksStatePath, "utf8")
    const parsed = JSON.parse(raw)
    const normalized = parsed && typeof parsed === "object" ? parsed : {}
    tweakStateCache.data = normalized
    return { ...normalized }
  } catch (error) {
    if (error.code === "ENOENT") {
      tweakStateCache.data = {}
      return {}
    }

    console.error("Error loading tweak states:", error)
    tweakStateCache.data = {}
    return {}
  }
}

async function saveTweakStatesObject(states) {
  const normalizedStates = states && typeof states === "object" ? states : {}
  tweakStateCache.data = { ...normalizedStates }

  await fs.mkdir(path.dirname(tweaksStatePath), { recursive: true })
  await fs.writeFile(tweaksStatePath, JSON.stringify(normalizedStates, null, 2), "utf8")
}

const getActiveTweaks = async () => {
  const states = await loadTweakStatesObject()
  return Object.keys(states).filter((key) => !!states[key])
}

async function detectGPU() {
  try {
    const graphicsData = await si.graphics()
    if (!graphicsData.controllers || graphicsData.controllers.length === 0) {
      return { hasGPU: false, isNvidia: false, model: null }
    }

    const dedicatedControllers = graphicsData.controllers.filter((controller) => {
      const model = (controller.model || "").toLowerCase()
      return (
        (model.includes("nvidia") &&
          (model.includes("gtx") ||
            model.includes("rtx") ||
            model.includes("titan") ||
            model.includes("quadro") ||
            model.includes("mx") ||
            model.includes("tesla") ||
            model.includes("a100") ||
            model.includes("a40"))) ||
        (model.includes("amd") &&
          (model.includes("radeon") ||
            model.includes("rx") ||
            model.includes("vega") ||
            model.includes("firepro") ||
            model.includes("instinct")) &&
          !model.includes("graphics") &&
          !model.includes("integrated")) ||
        (model.includes("intel") && model.includes("arc"))
      )
    })

    const dedicatedGPU = dedicatedControllers.sort((a, b) => (b.vram || 0) - (a.vram || 0))[0]
    const hasGPU = !!dedicatedGPU
    const isNvidia = hasGPU && dedicatedGPU.model.toLowerCase().includes("nvidia")

    return {
      hasGPU,
      isNvidia,
      model: dedicatedGPU?.model || null,
    }
  } catch (error) {
    console.error("Error detecting GPU:", error)
    return { hasGPU: false, isNvidia: false, model: null }
  }
}

function isGPUTweak(tweak) {
  return tweak.category && tweak.category.includes("GPU")
}

function isNvidiaTweak(tweak) {
  return tweak.name === "optimize-nvidia-settings"
}

function NvidiaProfileInspector() {
  const exePath = getExePath("nvidiaProfileInspector.exe")
  const nipPath = getNipPath()
  return new Promise((resolve, reject) => {
    let hasResolved = false
    const timeout = setTimeout(() => {
      if (!hasResolved) {
        hasResolved = true
        console.error("[vie]: Nvidia Inspector timed out after 30s")
        reject(new Error("Nvidia Inspector execution timed out"))
      }
    }, 30000)

    exec(`"${exePath}" -silentImport "${nipPath}"`, (error, stdout, stderr) => {
      if (hasResolved) return

      clearTimeout(timeout)
      hasResolved = true

      console.log("stdout:", stdout)
      console.log("stderr:", stderr)

      if (error) {
        console.error("Error:", error)
        reject(error)
      } else {
        resolve(stdout || "Completed with no output.")
      }
    })
  })
}

async function runTweakScript(tweak, id, targetState) {
  if (targetState) {
    if (!tweak.psapply || tweak.psapply.trim().length === 0) {
      return {
        id,
        success: false,
        state: false,
        changed: false,
        error: `Tweak "${id}" has no apply script`,
      }
    }

    const tier = String(tweak.tier || "free").toLowerCase()
    if (tier === "pro" && getLicenseTier() !== "pro") {
      return {
        id,
        success: false,
        state: false,
        changed: false,
        error: `Tweak "${id}" requires VieXF Pro (Cài đặt → VieXF Pro).`,
      }
    }

    if (isGPUTweak(tweak)) {
      const gpuInfo = await detectGPU()
      if (!gpuInfo.hasGPU) {
        return {
          id,
          success: false,
          state: false,
          changed: false,
          error: `Tweak "${id}" requires a dedicated GPU`,
        }
      }
    }

    if (isNvidiaTweak(tweak)) {
      const gpuInfo = await detectGPU()
      if (!gpuInfo.isNvidia) {
        return {
          id,
          success: false,
          state: false,
          changed: false,
          error: `Tweak "${id}" requires an NVIDIA GPU`,
        }
      }
    }

    if (id === "optimize-nvidia-settings") {
      console.log(logo, "Running Nvidia settings optimization...")
      await NvidiaProfileInspector()
      return { id, success: true, state: true, changed: true }
    }

    console.log(`[vie]: Applying tweak: ${id}`)
    const psOpts = { script: tweak.psapply, name: id }
    if (id === "vie-amx" && getLicenseTier() === "pro") {
      psOpts.env = { VIEXF_LICENSE_PRO: "1" }
    }
    const result = await executePowerShell(null, psOpts)
    if (!result?.success) {
      return {
        id,
        success: false,
        state: false,
        changed: false,
        error: result?.error || `Failed to apply tweak "${id}"`,
      }
    }

    return { id, success: true, state: true, changed: true }
  }

  if (!tweak.psunapply || tweak.psunapply.trim().length === 0) {
    return {
      id,
      success: true,
      state: true,
      changed: false,
      message: "One-way tweak cannot be reverted",
    }
  }

  console.log(`[vie]: Unapplying tweak: ${id}`)
  const result = await executePowerShell(null, { script: tweak.psunapply, name: id })
  if (!result?.success) {
    return {
      id,
      success: false,
      state: true,
      changed: false,
      error: result?.error || `Failed to unapply tweak "${id}"`,
    }
  }

  return { id, success: true, state: false, changed: true }
}

async function setTweakState(id, targetState) {
  if (!id || typeof id !== "string") {
    return {
      id: String(id || ""),
      success: false,
      state: false,
      changed: false,
      error: "Invalid tweak id",
    }
  }

  if (typeof targetState !== "boolean") {
    return {
      id,
      success: false,
      state: false,
      changed: false,
      error: "Invalid tweak state",
    }
  }

  const currentStates = await loadTweakStatesObject()
  const currentState = !!currentStates[id]

  if (currentState === targetState) {
    return {
      id,
      success: true,
      state: currentState,
      changed: false,
      message: "Already in requested state",
    }
  }

  const tweaks = await loadTweaks()
  const tweak = findTweak(tweaks, id)
  if (!tweak) {
    return {
      id,
      success: false,
      state: currentState,
      changed: false,
      error: `Tweak "${id}" not found`,
    }
  }

  try {
    const executionResult = await runTweakScript(tweak, id, targetState)
    if (!executionResult.success) {
      return {
        ...executionResult,
        state: currentState,
      }
    }

    const nextState = !!executionResult.state
    if (executionResult.changed) {
      if (nextState) {
        currentStates[id] = true
      } else {
        delete currentStates[id]
      }
      await saveTweakStatesObject(currentStates)
    }

    return {
      id,
      success: true,
      state: nextState,
      changed: !!executionResult.changed,
      message: executionResult.message,
    }
  } catch (error) {
    return {
      id,
      success: false,
      state: currentState,
      changed: false,
      error: normalizeError(error, `Failed to execute tweak "${id}"`),
    }
  }
}

async function setTweaksBatch(changes) {
  if (!Array.isArray(changes) || changes.length === 0) {
    return { results: [] }
  }

  const results = []
  for (const change of changes) {
    const id = change?.id
    const state = !!change?.state
    const result = await setTweakState(id, state)
    results.push(result)
  }

  return { results }
}

export const setupTweaksHandlers = () => {
  ipcMain.removeHandler("tweak-states:load")
  ipcMain.removeHandler("tweak-states:save")
  ipcMain.removeHandler("tweaks:fetch")
  ipcMain.removeHandler("tweak:set")
  ipcMain.removeHandler("tweak:set-batch")
  ipcMain.removeHandler("tweak:toggle")
  ipcMain.removeHandler("tweak:apply")
  ipcMain.removeHandler("tweak:unapply")
  ipcMain.removeHandler("tweak:active")
  ipcMain.removeHandler("nvidia-inspector")

  ipcMain.handle("tweak-states:load", async () => {
    const states = await loadTweakStatesObject()
    return JSON.stringify(states)
  })

  ipcMain.handle("tweak-states:save", async (_, payload) => {
    try {
      const nextStates = typeof payload === "string" ? JSON.parse(payload) : payload
      await saveTweakStatesObject(nextStates)
      return true
    } catch (error) {
      console.error("Error saving tweak states:", error)
      throw error
    }
  })

  ipcMain.handle("tweaks:fetch", async () => {
    return await loadTweaks(true)
  })

  ipcMain.handle("tweak:set", async (_, { id, state }) => {
    return await runInTweakQueue(() => setTweakState(id, !!state))
  })

  ipcMain.handle("tweak:set-batch", async (_, { changes }) => {
    return await runInTweakQueue(() => setTweaksBatch(changes))
  })

  ipcMain.handle("tweak:toggle", async (_, { id, state }) => {
    return await runInTweakQueue(() => setTweakState(id, !!state))
  })

  ipcMain.handle("tweak:apply", async (_, idOrName) => {
    const result = await runInTweakQueue(() => setTweakState(idOrName, true))
    if (!result.success) {
      throw new Error(result.error || `Failed to apply tweak "${idOrName}"`)
    }
    return result
  })

  ipcMain.handle("tweak:unapply", async (_, idOrName) => {
    const result = await runInTweakQueue(() => setTweakState(idOrName, false))
    if (!result.success) {
      throw new Error(result.error || `Failed to unapply tweak "${idOrName}"`)
    }
    return result
  })

  ipcMain.handle("tweak:active", async () => {
    return await getActiveTweaks()
  })

  ipcMain.handle("nvidia-inspector", (_, args) => {
    return NvidiaProfileInspector(args)
  })
}

export const cleanupTweaksHandlers = () => {
  ipcMain.removeHandler("tweak-states:load")
  ipcMain.removeHandler("tweak-states:save")
  ipcMain.removeHandler("tweaks:fetch")
  ipcMain.removeHandler("tweak:set")
  ipcMain.removeHandler("tweak:set-batch")
  ipcMain.removeHandler("tweak:toggle")
  ipcMain.removeHandler("tweak:apply")
  ipcMain.removeHandler("tweak:unapply")
  ipcMain.removeHandler("tweak:active")
  ipcMain.removeHandler("nvidia-inspector")
}

export default {
  setupTweaksHandlers,
  cleanupTweaksHandlers,
}

