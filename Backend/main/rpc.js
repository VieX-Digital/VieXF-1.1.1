import { ipcMain } from "electron"
import discordRPC from "discord-rpc"
import { logo } from "."
import jsonData from "../../package.json"
import log from "electron-log"
console.log = log.log
console.error = log.error
console.warn = log.warn
const clientId = "1352856066358120578"
let rpcClient

async function startDiscordRPC() {
  setTimeout(async () => {
    try {
      rpcClient = new discordRPC.Client({ transport: "ipc" })

      rpcClient.on("ready", () => {
        console.log("(rpc.js) ", logo, "Discord RPC connected")

        rpcClient.setActivity({
          details: "VieXF - Tối ưu hóa trải nghiệm PC/Laptop",
          state: "Đang tối ưu hóa PC/Laptop",
          buttons: [
            // keep this as parcoil incase of the domain going down
            { label: "✨ Tải xuống VieXF", url: "https://discord.gg/wsphWPp7Zr" },
            { label: "✨ Tham Gia Discord", url: "https://discord.gg/VRAk33YzkE" },
          ],
          largeImageKey: "vie",
          largeImageText: "VieXF",
          instance: false,
        }).catch(err => {
          console.warn("(rpc.js) ", "Failed to set Discord RPC activity:", err.message)
        })
      })

      rpcClient.on('error', (error) => {
        console.warn("(rpc.js) ", "Discord RPC error:", error.message)
        stopDiscordRPC()
      })

      await rpcClient.login({ clientId }).catch(error => {
        console.warn("(rpc.js) ", "Discord RPC login failed:", error.message)
        stopDiscordRPC()
      })
    } catch (error) {
      console.warn("(rpc.js) ", "Failed to initialize Discord RPC:", error.message)
      stopDiscordRPC()
    }
  }, 1000)

  return true
}

function stopDiscordRPC() {
  if (rpcClient) {
    rpcClient.destroy()
    rpcClient = null
    console.log("(rpc.js) ", "Discord RPC disconnected")
    return true
  }
  return false
}

ipcMain.handle("start-discord-rpc", () => {
  return startDiscordRPC()
})

ipcMain.handle("stop-discord-rpc", () => {
  return stopDiscordRPC()
})

export { startDiscordRPC, stopDiscordRPC }
