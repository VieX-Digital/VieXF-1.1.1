import { ipcMain, app } from "electron"
import { executePowerShell } from "./powershell"
import path from "path"
import fs from "fs/promises"
import log from "electron-log"
console.log = log.log
console.error = log.error
console.warn = log.warn

const ensureScriptsAvailable = async () => {
  const userDataScriptsDir = path.join(app.getPath("userData"), "scripts", "dns-changer")

  try {
    await fs.access(userDataScriptsDir)
    return
  } catch (error) {
    console.log("Copying DNS scripts to user data directory...")

    const sourcePaths = [
      path.join(process.cwd(), "Backend", "scripts", "dns-changer"),
      path.join(process.cwd(), "Backend", "tweaks", "dns-changer"),
      path.join(process.resourcesPath, "scripts", "dns-changer"),
      path.join(process.resourcesPath, "tweaks", "dns-changer"),
    ]

    for (const sourcePath of sourcePaths) {
      try {
        await fs.access(sourcePath)

        await fs.mkdir(userDataScriptsDir, { recursive: true })

        const files = ["apply.ps1", "unapply.ps1"]
        for (const file of files) {
          const sourceFile = path.join(sourcePath, file)
          const destFile = path.join(userDataScriptsDir, file)

          try {
            await fs.copyFile(sourceFile, destFile)
            console.log(`Copied ${file} to user data`)
          } catch (copyError) {
            console.warn(`Failed to copy ${file}:`, copyError.message)
          }
        }
        break
      } catch (error) {}
    }
  }
}

const getScriptPath = async (scriptName) => {
  await ensureScriptsAvailable()

  const possiblePaths = [
    path.join(process.cwd(), "Backend", "scripts", "dns-changer", scriptName),
    path.join(process.cwd(), "Backend", "tweaks", "dns-changer", scriptName),
    path.join(process.resourcesPath, "scripts", "dns-changer", scriptName),
    path.join(process.resourcesPath, "tweaks", "dns-changer", scriptName),
    path.join(app.getPath("userData"), "scripts", "dns-changer", scriptName),
  ]

  for (const scriptPath of possiblePaths) {
    try {
      await fs.access(scriptPath)
      console.log(`Found DNS script at: ${scriptPath}`)
      return scriptPath
    } catch (error) {}
  }

  throw new Error(
    `DNS script not found: ${scriptName}. Searched paths: ${possiblePaths.join(", ")}`,
  )
}

export const setupDNSHandlers = () => {
  ipcMain.handle("dns:get-current", async () => {
    try {
      const script = `
      Write-Host "Current DNS Settings:"
      
      Get-DnsClientServerAddress |
      Where-Object { $_.ServerAddresses.Count -gt 0 } |
      ForEach-Object {
          $adapter = Get-NetAdapter -InterfaceIndex $_.InterfaceIndex -ErrorAction SilentlyContinue
          if ($adapter) {
              $dnsList = $_.ServerAddresses | Where-Object { $_ -notmatch '^fec0' }
              if ($dnsList) {
                  Write-Host ("{0} | {1}" -f $adapter.Name, ($dnsList -join ', '))
              }
          }
      }
      `;
      
      const result = await executePowerShell(null, { script, name: "Get-DNS" })

      if (result.success) {
        const lines = result.output
          .trim()
          .split("\n")
          .filter((line) => line.includes("|"))
        const dnsInfo = lines.map((line) => {
          const [adapter, servers] = line.split("|")
          return { adapter: adapter.trim(), servers: servers.trim() }
        })
        return { success: true, data: dnsInfo }
      } else {
        return { success: false, error: result.error }
      }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle("dns:apply", async (event, { dnsType, primaryDNS = "", secondaryDNS = "" }) => {
    try {
      const dnsScriptPath = await getScriptPath("apply.ps1")

      let script
      if (dnsType === "custom") {
        script = `
          . "${dnsScriptPath}" -DNSType "custom" -PrimaryDNS "${primaryDNS}" -SecondaryDNS "${secondaryDNS}"
        `
      } else {
        script = `
          . "${dnsScriptPath}" -DNSType "${dnsType}"
        `
      }

      const result = await executePowerShell(null, { script, name: "Apply-DNS" })
      return result
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle("dns:reset", async () => {
    try {
      const dnsScriptPath = await getScriptPath("unapply.ps1")
      const script = `
        . "${dnsScriptPath}"
      `
      const result = await executePowerShell(null, { script, name: "Reset-DNS" })
      return result
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle("dns:test", async (event, { hostname = "google.com" }) => {
    try {
      const script = `
        try {
          $result = nslookup ${hostname} 2>&1
          Write-Host "DNS Test Results for ${hostname}:"
          Write-Host $result
        } catch {
          Write-Host "Error testing DNS: $($_.Exception.Message)"
        }
      `
      const result = await executePowerShell(null, { script, name: "Test-DNS" })
      return result
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle("dns:get-adapters", async () => {
    try {
      const script = `
        Get-NetAdapter | Where-Object { $_.Status -eq "Up" } | ForEach-Object {
          Write-Host "$($_.Name)|$($_.InterfaceDescription)|$($_.Status)"
        }
      `
      const result = await executePowerShell(null, { script, name: "Get-Adapters" })

      if (result.success) {
        const lines = result.output
          .trim()
          .split("\n")
          .filter((line) => line.includes("|"))
        const adapters = lines.map((line) => {
          const [name, description, status] = line.split("|")
          return { name: name.trim(), description: description.trim(), status: status.trim() }
        })
        return { success: true, data: adapters }
      } else {
        return { success: false, error: result.error }
      }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle("dns:flush-cache", async () => {
    try {
      const script = `
        Write-Host "Flushing DNS cache..."
        ipconfig /flushdns
        Write-Host "DNS cache flushed successfully!"
      `
      const result = await executePowerShell(null, { script, name: "Flush-DNS" })
      return result
    } catch (error) {
      return { success: false, error: error.message }
    }
  })
}

export const cleanupDNSHandlers = () => {
  ipcMain.removeHandler("dns:get-current")
  ipcMain.removeHandler("dns:apply")
  ipcMain.removeHandler("dns:reset")
  ipcMain.removeHandler("dns:test")
  ipcMain.removeHandler("dns:get-adapters")
  ipcMain.removeHandler("dns:flush-cache")
}

export default {
  setupDNSHandlers,
  cleanupDNSHandlers,
}
