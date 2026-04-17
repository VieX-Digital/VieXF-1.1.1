import { ipcMain, shell } from "electron"
import { executePowerShell } from "./powershell"
import { mainWindow } from "./index"
import log from "electron-log"

export const setupAppsHandlers = () => {
    // ─── Remove Bloatware (kept from original) ───────────────────
    ipcMain.handle("apps:remove", async (event, ids) => {
        if (!ids || ids.length === 0) return { success: true }
        
        // Map ids to package names partials
        const appMap = {
            "cortana": "Microsoft.549981C3F5F10",
            "edge": "Microsoft.MicrosoftEdge", // Careful, might not be removable easily
            "onedrive": "Microsoft.OneDrive",
            "xbox": "Xbox",
            "maps": "Microsoft.WindowsMaps",
            "weather": "Microsoft.BingWeather",
            "news": "Microsoft.Windows.ContentDeliveryManager", // News & Interests often linked here
            "telemetry": "DiagTrack" // Service, not app, but we handle it
        }

        let script = ""
        
        ids.forEach(id => {
            const target = appMap[id] || id
            
            if (id === "telemetry") {
                 script += `
                    Stop-Service DiagTrack -Force -ErrorAction SilentlyContinue
                    Set-Service DiagTrack -StartupType Disabled
                 `
            } else if (id === "onedrive") {
                 script += `
                    taskkill /f /im OneDrive.exe -ErrorAction SilentlyContinue
                    $onedrive = "$env:LOCALAPPDATA\\Microsoft\\OneDrive\\OneDriveSetup.exe"
                    if (Test-Path $onedrive) {
                        Start-Process $onedrive -ArgumentList "/uninstall" -Wait -NoNewWindow
                    }
                 `
            } else {
                 script += `Get-AppxPackage *${target}* | Remove-AppxPackage -ErrorAction SilentlyContinue\n`
            }
        })

       try {
          await executePowerShell(null, { script, name: "Remove-Apps" })
          return { success: true }
       } catch (err) {
          return { success: false, error: err.message }
       }
    })

    // ─── Install Apps via Winget (NEW) ───────────────────────────
    ipcMain.handle("apps:install", async (event, payload) => {
        const { apps } = payload
        if (!apps || apps.length === 0) return { success: true }

        log.info("[apps:install] Starting batch install for", apps.length, "apps")

        // Step 1: Check if winget is available
        let hasWinget = false
        try {
            const checkResult = await executePowerShell(null, {
                script: `winget --version`,
                name: "Check-Winget",
            })
            hasWinget = checkResult.success && checkResult.output && checkResult.output.trim().startsWith("v")
            log.info("[apps:install] Winget available:", hasWinget, checkResult.output?.trim())
        } catch {
            hasWinget = false
            log.warn("[apps:install] Winget not available")
        }

        // Step 2: Install each app
        for (const app of apps) {
            const { id, name, link } = app

            // Notify FE: installing
            sendProgress(id, name, "installing", hasWinget ? `Installing via winget...` : `Opening download link...`)

            if (hasWinget) {
                // ─── Winget Install ──────────────────────────────
                try {
                    const installScript = `winget install --id "${id}" --silent --accept-package-agreements --accept-source-agreements --disable-interactivity 2>&1`
                    const result = await executePowerShell(null, {
                        script: installScript,
                        name: `Install-${name.replace(/[^a-zA-Z0-9]/g, "")}`,
                    })

                    if (result.success) {
                        const output = result.output || ""
                        // Check if winget reports the package is already installed
                        if (output.includes("already installed") || output.includes("No applicable update found")) {
                            sendProgress(id, name, "done", "Already installed")
                        } else if (output.includes("Successfully installed") || output.includes("successfully")) {
                            sendProgress(id, name, "done", "Installed successfully")
                        } else {
                            // Winget ran but we're not sure — treat as success
                            sendProgress(id, name, "done", "Completed")
                        }
                    } else {
                        // Winget failed — try fallback link
                        log.warn(`[apps:install] Winget failed for ${id}:`, result.error)
                        if (link) {
                            shell.openExternal(link)
                            sendProgress(id, name, "done", "Opened download page (winget failed)")
                        } else {
                            sendProgress(id, name, "error", result.error || "Winget install failed")
                        }
                    }
                } catch (err) {
                    log.error(`[apps:install] Error installing ${id}:`, err)
                    // Fallback to link
                    if (link) {
                        shell.openExternal(link)
                        sendProgress(id, name, "done", "Opened download page")
                    } else {
                        sendProgress(id, name, "error", err.message)
                    }
                }
            } else {
                // ─── No Winget: Open download link directly ──────
                if (link) {
                    try {
                        await shell.openExternal(link)
                        sendProgress(id, name, "done", "Opened download page")
                    } catch (err) {
                        sendProgress(id, name, "error", "Failed to open download link")
                    }
                } else {
                    sendProgress(id, name, "error", "No winget and no download link")
                }
            }
        }

        // Step 3: Notify FE that all installs are complete
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send("apps:install-complete")
        }

        return { success: true }
    })
}

// ─── Helper: Send progress to renderer ───────────────────────────
function sendProgress(id, name, status, message) {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("apps:install-progress", {
            id,
            name,
            status,
            message,
        })
    }
}

export default { setupAppsHandlers }
