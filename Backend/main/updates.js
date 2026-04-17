import { app, ipcMain } from "electron"
import log from "electron-log"
import { autoUpdater } from "electron-updater"

function normalizeUpdaterError(error) {
  const statusCode = error?.statusCode ?? error?.response?.statusCode
  const statusMessage = error?.statusMessage ?? error?.response?.statusMessage
  const message = error?.message || String(error) || "Unknown updater error"

  if (statusCode === 404) {
    return {
      userMessage: null,
      logMessage: `Update feed not found (404${statusMessage ? ` - ${statusMessage}` : ""})`,
    }
  }

  const friendly =
    statusCode != null
      ? `Unable to reach the update server (${statusCode}${
          statusMessage ? ` - ${statusMessage}` : ""
        }). Please try again later.`
      : "Unable to check for updates. Please try again later."

  return { userMessage: friendly, logMessage: message }
}

export function initAutoUpdater(getMainWindow) {
  autoUpdater.autoDownload = false
  autoUpdater.disableWebInstaller = false
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on("update-available", (info) => {
    const win = getMainWindow()
    win?.webContents.send("updater:available", {
      version: info.version,
      releaseNotes: info.releaseNotes ?? undefined,
    })
  })

  autoUpdater.on("update-not-available", () => {
    const win = getMainWindow()
    win?.webContents.send("updater:not-available", { currentVersion: app.getVersion() })
  })

  autoUpdater.on("error", (err) => {
    const win = getMainWindow()
    const { userMessage, logMessage } = normalizeUpdaterError(err)

    log.error("[updater] error while checking for updates", logMessage)
    if (userMessage) {
      win?.webContents.send("updater:error", { message: userMessage })
    }
  })

  autoUpdater.on("download-progress", (progress) => {
    const win = getMainWindow()
    win?.webContents.send("updater:download-progress", {
      percent: progress.percent,
      transferred: progress.transferred,
      total: progress.total,
      bytesPerSecond: progress.bytesPerSecond,
    })
  })

  autoUpdater.on("update-downloaded", (info) => {
    const win = getMainWindow()
    win?.webContents.send("updater:downloaded", { version: info.version })
  })

  ipcMain.handle("updater:get-version", () => app.getVersion())

  ipcMain.handle("updater:check", async () => {
    try {
      const result = await autoUpdater.checkForUpdates()
      return { ok: true, updateInfo: result?.updateInfo ?? null }
    } catch (error) {
      return { ok: false, error: String(error) }
    }
  })

  ipcMain.handle("updater:download", async () => {
    try {
      await autoUpdater.downloadUpdate()
      return { ok: true }
    } catch (error) {
      return { ok: false, error: String(error) }
    }
  })

  ipcMain.handle("updater:install", () => {
    try {
      autoUpdater.quitAndInstall(false, true)
      return { ok: true }
    } catch (error) {
      return { ok: false, error: String(error) }
    }
  })
}

export async function triggerAutoUpdateCheck() {
  try {
    await autoUpdater.checkForUpdates()
  } catch {}
}
