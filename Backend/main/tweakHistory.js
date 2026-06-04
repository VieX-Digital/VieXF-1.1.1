import fs from "fs/promises"
import path from "path"
import { app, ipcMain } from "electron"
import log from "electron-log"

const userDataPath = app.getPath("userData")
const HISTORY_FILE = path.join(userDataPath, "tweak-history.json")
const MAX_ENTRIES = 500

async function readHistory() {
  try {
    const raw = await fs.readFile(HISTORY_FILE, "utf8")
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

async function writeHistory(entries) {
  await fs.mkdir(path.dirname(HISTORY_FILE), { recursive: true })
  await fs.writeFile(HISTORY_FILE, JSON.stringify(entries.slice(0, MAX_ENTRIES), null, 2), "utf8")
}

export async function logTweakOperation(entry) {
  try {
    const history = await readHistory()
    history.unshift({
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: Date.now(),
      windowsBuild: process.env.OS || "Windows",
      ...entry,
    })
    await writeHistory(history)
  } catch (e) {
    log.warn("[tweak-log] Failed to write history:", e?.message)
  }
}

export async function getTweakHistory() {
  return readHistory()
}

export async function clearTweakHistory() {
  await writeHistory([])
}

export function setupTweakHistoryHandlers() {
  ipcMain.removeHandler("tweak-history:get")
  ipcMain.removeHandler("tweak-history:clear")

  ipcMain.handle("tweak-history:get", async () => {
    return getTweakHistory()
  })

  ipcMain.handle("tweak-history:clear", async () => {
    await clearTweakHistory()
    return { ok: true }
  })
}
