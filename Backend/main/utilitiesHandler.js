import { ipcMain, shell } from "electron"
import { executePowerShell } from "./powershell"
import { exec } from "child_process"

export const setupUtilitiesHandlers = () => {
  ipcMain.handle("utility:run", async (event, id) => {
    try {
      switch (id) {
        case "activation":
           exec("start slmgr /xpr")
           break
        case "keyboard":
           await shell.openExternal("https://keyboard-test.space/")
           break
        case "display":
           exec("start ms-settings:display")
           break
        case "network":
           exec("start ms-settings:network-status")
           break
        case "disk":
           exec("cleanmgr")
           break
        case "cmd":
           exec("start cmd")
           break
        case "taskmgr":
           exec("start taskmgr")
           break
        case "control":
           exec("start control")
           break
        case "devmgmt":
           exec("start devmgmt.msc")
           break
        case "ncpa":
           exec("start ncpa.cpl")
           break
        case "regedit":
           exec("start regedit")
           break
        case "powercfg":
           exec("start active.cp @0,3") // This is Power Options
           break
        default:
           console.warn(`Unknown utility id: ${id}`)
           return { success: false, error: "Unknown utility" }
      }
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  })
}

export default { setupUtilitiesHandlers }
