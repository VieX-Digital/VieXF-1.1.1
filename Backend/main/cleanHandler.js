import { ipcMain, app } from "electron"
import { executePowerShell } from "./powershell"
import path from "path"

const isDev = !app.isPackaged

const getScriptPath = () => {
    if (isDev) {
        return path.join(process.cwd(), "Backend", "resources", "scripts", "clean.ps1")
    }
    return path.join(process.resourcesPath, "scripts", "clean.ps1")
}

export const setupCleanHandlers = () => {
  ipcMain.handle("clean:run", async (event, ids) => {
    const scriptPath = getScriptPath()
    
    // Construct switches
    let args = ""
    if (ids.includes("temp")) args += " -Temp"
    if (ids.includes("prefetch")) args += " -Prefetch"
    if (ids.includes("update")) args += " -Update"
    if (ids.includes("recycle")) args += " -Recycle"
    if (ids.includes("logs")) args += " -Logs"
    if (ids.includes("shader")) args += " -Shader"
    if (ids.includes("updatebackup")) args += " -UpdateBackup"
    if (ids.includes("browser")) args += " -Browser"

    if (!args) return { success: true }

    // Execute file with parameters
    const script = `
        & "${scriptPath}" ${args}
    `

    try {
       await executePowerShell(null, { script, name: "Clean-System" })
       return { success: true }
    } catch (err) {
       return { success: false, error: err.message }
    }
  })
}

export default { setupCleanHandlers }
