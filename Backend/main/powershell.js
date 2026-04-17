import { promises as fsp } from "fs"
import path from "path"
import { exec } from "child_process"
import { app, ipcMain } from "electron"
import { mainWindow } from "./index"
import fs from "fs"
import log from "electron-log"
import util from "util"

const execPromise = util.promisify(exec)

console.log = log.log
console.error = log.error
console.warn = log.warn

function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }
}

function withUtf8Bom(script) {
  // Prevent double-BOM parser errors when source script already contains BOM.
  const normalizedScript = String(script ?? "").replace(/^\uFEFF+/, "")
  return `\uFEFF${normalizedScript}`
}

export async function executePowerShell(_, props) {
  const { script, name = "script", env: extraEnv } = props

  try {
    const tempDir = path.join(app.getPath("userData"), "scripts")
    ensureDirectoryExists(tempDir)
    const tempFile = path.join(tempDir, `${name}-${Date.now()}.ps1`)

    await fsp.writeFile(tempFile, withUtf8Bom(script), "utf8")

    const childEnv = { ...process.env, ...(extraEnv && typeof extraEnv === "object" ? extraEnv : {}) }

    const { stdout, stderr } = await execPromise(
      `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${tempFile}"`,
      { env: childEnv },
    )

    await fsp.unlink(tempFile).catch(console.error)

    if (stderr) {
      console.warn(`PowerShell stderr [${name}]:`, stderr)
    }

    console.log(`PowerShell stdout [${name}]:`, stdout)

    return { success: true, output: stdout }
  } catch (error) {
    console.error(`PowerShell execution error [${name}]:`, error)
    return { success: false, error: error.message }
  }
}

async function runPowerShellInWindow(event, { script, name = "script", noExit = true }) {
  try {
    const tempDir = path.join(app.getPath("userData"), "scripts")
    ensureDirectoryExists(tempDir)

    const tempFile = path.join(tempDir, `${name}-${Date.now()}.ps1`)
    await fsp.writeFile(tempFile, withUtf8Bom(script), "utf8")
    const noExitFlag = noExit ? "-NoExit" : ""
    const command = `start powershell.exe ${noExitFlag} -ExecutionPolicy Bypass -File "${tempFile}"`

    exec(command, (error) => {
      if (error) {
        console.error(`Error launching PowerShell window [${name}]:`, error)
      }
    })

    return { success: true }
  } catch (error) {
    console.error(`Error in runPowerShellInWindow [${name}]:`, error)
    return { success: false, error: error.message }
  }
}

ipcMain.handle("run-powershell-window", runPowerShellInWindow)
ipcMain.handle("run-powershell", executePowerShell)

// ✅ Refactor handle-apps: không còn winget
ipcMain.handle("handle-apps", async (event, { action, apps }) => {
  switch (action) {
    case "install":
      for (const app of apps) {
        mainWindow.webContents.send("install-progress", `${app}`)
        console.log(`Pretend installing ${app} (winget removed)`)
        // TODO: thay bằng logic cài đặt riêng nếu có file installer
      }
      mainWindow.webContents.send("install-complete")
      break

    case "uninstall":
      for (const app of apps) {
        mainWindow.webContents.send("install-progress", `${app}`)
        console.log(`Pretend uninstalling ${app} (winget removed)`)
        // TODO: thay bằng logic gỡ cài đặt riêng nếu có uninstaller
      }
      mainWindow.webContents.send("install-complete")
      break

    case "check-installed":
      // Không còn winget list, bạn phải tự định nghĩa cách kiểm tra
      const installedAppIds = [] // giả lập chưa có app nào
      mainWindow.webContents.send("installed-apps-checked", {
        success: true,
        installed: installedAppIds,
      })
      break

    default:
      console.error(`Unknown action: ${action}`)
  }
})
