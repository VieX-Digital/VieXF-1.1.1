import { app, shell, BrowserWindow, ipcMain, screen } from "electron"
import path, { join } from "path"
import * as Sentry from "@sentry/electron/main"
import { IPCMode } from "@sentry/electron/main"
import log from "electron-log"
import "./system"
import "./powershell"
import "./rpc"
import "./tweakHandler"
import "./dnsHandler"
import "./backup"
import { executePowerShell } from "./powershell"
import { createTray } from "./tray"
import { setupTweaksHandlers } from "./tweakHandler"
import { setupDNSHandlers } from "./dnsHandler"
import { setupCleanHandlers } from "./cleanHandler"
import { setupUtilitiesHandlers } from "./utilitiesHandler"
import { setupAppsHandlers } from "./appsHandler"
import { setupGameModeHandlers } from "./gamemode.js"
import { setupRamClearHandlers } from "./ramclearHandler.js"
import Store from "electron-store"
import { startDiscordRPC, stopDiscordRPC } from "./rpc"
import { initAutoUpdater, triggerAutoUpdateCheck } from "./updates.js"
import { getLicenseTier, getLicenseState, setLicenseTier, tryActivateLicenseKey } from "./licenseTier.js"
import { setupAuthHandlers, handleProtocolUrl } from "./auth.js"

// DIAGNOSTIC LOGGING: Check if @electron-toolkit/utils can be resolved
try {
  const utilsPath = require.resolve("@electron-toolkit/utils")
  log.info("[DIAGNOSTIC] @electron-toolkit/utils resolved at:", utilsPath)
  log.info("[DIAGNOSTIC] app.isPackaged:", app.isPackaged)
  log.info("[DIAGNOSTIC] __dirname:", __dirname)
  log.info("[DIAGNOSTIC] process.resourcesPath:", process.resourcesPath)
  log.info("[DIAGNOSTIC] app.getAppPath():", app.getAppPath())
} catch (error) {
  log.error("[DIAGNOSTIC] Failed to resolve @electron-toolkit/utils:", error.message)
  log.error("[DIAGNOSTIC] Error stack:", error.stack)
}

// Now import after diagnostic check
import { electronApp, optimizer, is } from "@electron-toolkit/utils"
Sentry.init({
  dsn: "https://d1e8991c715dd717e6b7b44dbc5c43dd@o4509167771648000.ingest.us.sentry.io/4509167772958720",
  ipcMode: IPCMode.Both,
})
console.log = log.log
console.error = log.error
console.warn = log.warn

export const logo = "[viexf]:"
log.initialize()
export const getResourcePath = (...segments) => {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, ...segments)
  }
  return path.join(process.cwd(), "Backend", "resources", ...segments)
}
async function Defender() {
  const Apppath = path.dirname(process.execPath)
  if (app.isPackaged) {
    const result = await executePowerShell(null, {
      script: `Add-MpPreference -ExclusionPath ${Apppath}`,
      name: "Add-MpPreference",
    })
    if (result.success) {
      console.log(logo, "Added VieXF to Windows Defender Exclusions")
    } else {
      console.error(logo, "Failed to add Vie to Windows Defender Exclusions", result.error)
    }
  } else {
    console.log(logo, "Running in development mode, skipping Windows Defender exclusion")
  }
}

const store = new Store()

let trayInstance = null
if (store.get("showTray") === undefined) {
  store.set("showTray", true)
}

ipcMain.handle("tray:get", () => {
  return store.get("showTray")
})
ipcMain.handle("app:version", () => {
  return app.getVersion()
})

ipcMain.handle("license:get", () => getLicenseState())

ipcMain.handle("shell:open-external", (_, url) => {
  const s = typeof url === "string" ? url.trim() : ""
  if (s.startsWith("https://") || s.startsWith("http://")) {
    shell.openExternal(s)
    return { ok: true }
  }
  return { ok: false }
})

ipcMain.handle("license:set", (_, payload) => {
  const t = payload?.tier
  if (setLicenseTier(t)) {
    return { ok: true, tier: t }
  }
  return { ok: false }
})

ipcMain.handle("license:activate", (_, key) => tryActivateLicenseKey(key))

ipcMain.handle("license:clear", () => {
  setLicenseTier("free")
  return { ok: true, tier: "free" }
})
ipcMain.handle("set-tray-visibility", (event, value) => {
  store.set("showTray", value)
  if (mainWindow) {
    if (value) {
      if (!trayInstance) {
        trayInstance = createTray(mainWindow)
      }
    } else {
      if (trayInstance) {
        trayInstance.destroy()
        trayInstance = null
      }
    }
  }
  return store.get("showTray")
})

const initDiscordRPC = async () => {
  if (store.get("discord-rpc") === undefined) {
    store.set("discord-rpc", true)
    console.log("(main.js) ", logo, "Starting Discord RPC")
    await startDiscordRPC()
  } else if (store.get("discord-rpc") === true) {
    console.log("(main.js) ", logo, "Starting Discord RPC (from settings)")
    await startDiscordRPC()
  }
}

initDiscordRPC().catch((err) => {
  console.warn("(main.js) ", "Failed to initialize Discord RPC:", err.message)
})

ipcMain.handle("discord-rpc:toggle", async (event, value) => {
  try {
    if (value) {
      store.set("discord-rpc", true)
      console.log(logo, "Starting Discord RPC")
      await startDiscordRPC()
    } else {
      store.set("discord-rpc", false)
      console.log(logo, "Stopping Discord RPC")
      await stopDiscordRPC()
    }
    return { success: true, enabled: store.get("discord-rpc") }
  } catch (error) {
    console.error(logo, "Error toggling Discord RPC:", error)
    return {
      success: false,
      error: error.message,
      enabled: store.get("discord-rpc"),
    }
  }
})
ipcMain.handle("discord-rpc:get", () => {
  return store.get("discord-rpc")
})

export let mainWindow = null

/** Windows frameless/transparent windows often report isMaximized() incorrectly; compare to work area. */
function isEffectivelyMaximized(win) {
  if (!win || win.isDestroyed()) return false
  try {
    const bounds = win.getBounds()
    const { workArea } = screen.getDisplayMatching(bounds)
    const tol = 16
    return (
      Math.abs(bounds.x - workArea.x) <= tol &&
      Math.abs(bounds.y - workArea.y) <= tol &&
      Math.abs(bounds.width - workArea.width) <= tol &&
      Math.abs(bounds.height - workArea.height) <= tol
    )
  } catch {
    return false
  }
}

function sendWindowMaximizedState(win) {
  if (!win || win.isDestroyed() || win.webContents.isDestroyed()) return
  const max = win.isMaximized() || isEffectivelyMaximized(win)
  win.webContents.send(max ? "window-maximized" : "window-unmaximized")
}

process.on("uncaughtException", (error) => {
  log.error("[runtime] uncaughtException", error)
})

process.on("unhandledRejection", (reason) => {
  log.error("[runtime] unhandledRejection", reason)
})

function createWindow() {
  let windowIcon
  try {
    windowIcon = getResourcePath("vie.ico")
  } catch (error) {
    console.warn(`[vie]: Could not resolve window icon path, using default`)
    windowIcon = undefined  // Electron will use default icon
  }

  mainWindow = new BrowserWindow({
    width: 1380,
    backgroundColor: "#0c121f",
    height: 760,
    minWidth: 1380,
    minHeight: 760,
    center: true,
    frame: false,
    show: false,
    autoHideMenuBar: true,
    icon: windowIcon,
    titleBarStyle: 'hidden',
    transparent: true,
    vibrancy: 'acrylic',
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      devTools: app.isPackaged ? false : true,
      sandbox: false,
      backgroundThrottling: true,
    },
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: "deny" }
  })

  mainWindow.webContents.on("render-process-gone", (_, details) => {
    log.error("[renderer] render-process-gone", details)
  })

  mainWindow.on("unresponsive", () => {
    log.warn("[window] main window became unresponsive")
  })

  mainWindow.on("responsive", () => {
    log.info("[window] main window responsive again")
  })

  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"])
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"))
  }

  mainWindow.once("ready-to-show", () => {
    mainWindow.show()
    sendWindowMaximizedState(mainWindow)
  })

  mainWindow.on("maximize", () => sendWindowMaximizedState(mainWindow))
  mainWindow.on("unmaximize", () => sendWindowMaximizedState(mainWindow))
}

app.whenReady().then(() => {
  // Đăng ký protocol cho chế độ Dev trên Windows
  if (process.defaultApp) {
    if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient('viex', process.execPath, [path.resolve(process.argv[1])])
    }
  } else {
    app.setAsDefaultProtocolClient('viex')
  }

  createWindow()
  initAutoUpdater(() => mainWindow)
  if (store.get("showTray")) {
    trayInstance = createTray(mainWindow)
  }
  setTimeout(() => {
    void triggerAutoUpdateCheck()
  }, 1500)

  setTimeout(() => {
    void Defender()
    setupTweaksHandlers()
    setupDNSHandlers()
    setupCleanHandlers()
    setupUtilitiesHandlers()
    setupAppsHandlers()
    setupGameModeHandlers()
    setupRamClearHandlers()
    setupAuthHandlers()
  }, 0)

  electronApp.setAppUserModelId("com.parcoil.vie")

  app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  ipcMain.on("window-minimize", () => {
    if (mainWindow) mainWindow.minimize()
  })

  ipcMain.on("window-toggle-maximize", () => {
    if (!mainWindow || mainWindow.isDestroyed()) return

    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize()
      setImmediate(() => sendWindowMaximizedState(mainWindow))
      return
    }

    if (isEffectivelyMaximized(mainWindow)) {
      try {
        mainWindow.setBounds(mainWindow.getNormalBounds())
      } catch (e) {
        log.warn("[window] setBounds restore failed:", e?.message || e)
        mainWindow.unmaximize()
      }
      setImmediate(() => sendWindowMaximizedState(mainWindow))
      return
    }

    mainWindow.maximize()
    setImmediate(() => sendWindowMaximizedState(mainWindow))
  })

  ipcMain.on("window-close", () => {
    if (mainWindow) {
      if (store.get("showTray")) {
        mainWindow.hide()
      } else {
        app.quit()
      }
    }
  })

  const gotTheLock = app.requestSingleInstanceLock()

  if (!gotTheLock) {
    app.quit()
  } else {
    app.on("second-instance", (_event, argv) => {
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore()
        mainWindow.focus()
      }
      const url = argv.find((arg) => arg.startsWith("viex://"))
      if (url) handleProtocolUrl(url)
    })
  }
  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})
