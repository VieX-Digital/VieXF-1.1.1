import { exec } from "child_process"
import { ipcMain } from "electron"
import fs from "fs"
import log from "electron-log"
console.log = log.log
console.error = log.error
console.warn = log.warn

function runPowerShell(cmd) {
  return new Promise((resolve, reject) => {
    exec(
      `powershell -NoProfile -ExecutionPolicy Bypass -Command "${cmd}"`,
      { windowsHide: true },
      (err, stdout, stderr) => {
        if (err) return reject(stderr || err.message)
        resolve(stdout)
      },
    )
  })
}

async function changeRestorePointCooldown() {
  try {
    await runPowerShell(
      "New-ItemProperty -Path 'HKLM:\\Software\\Microsoft\\Windows NT\\CurrentVersion\\SystemRestore' -Name 'SystemRestorePointCreationFrequency' -Value 0 -PropertyType DWord -Force",
    )
  } catch (error) {
    console.warn(
      "[vie]: SystemRestore registry tweak skipped (run VieXF as Administrator if you need it):",
      error?.message || error,
    )
  }
}

function getTimestamp() {
  const date = new Date()
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, "0")
  const dd = String(date.getDate()).padStart(2, "0")
  const hh = String(date.getHours()).padStart(2, "0")
  const mi = String(date.getMinutes()).padStart(2, "0")
  const ss = String(date.getSeconds()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}_${hh}-${mi}-${ss}`
}

ipcMain.handle("create-vie-restore-point", async () => {
  const label = `VieBackup-${getTimestamp()}`
  try {
    await runPowerShell(`Checkpoint-Computer -Description '${label}'`)
    await changeRestorePointCooldown()
    return { success: true, label }
  } catch (error) {
    console.error(error)
    let msg = error.message || error
    if (msg.includes("Access is denied") || msg.includes("Access denied")) {
        msg = "Quyền truy cập bị từ chối. Vui lòng chạy VieXF bằng quyền Administrator."
    }
    return { success: false, error: msg }
  }
})

ipcMain.handle("create-restore-point", async (_, name) => {
  try {
    const label = name ? `${name}-${getTimestamp()}` : `ManualRestore-${getTimestamp()}`

    await runPowerShell(`Checkpoint-Computer -Description '${label}'`)
    await changeRestorePointCooldown()
    return { success: true, label }
  } catch (error) {
    console.error(error)
    let msg = error.message || error
    if (msg.includes("Access is denied") || msg.includes("Access denied")) {
        msg = "Quyền truy cập bị từ chối. Vui lòng chạy VieXF bằng quyền Administrator."
    }
    return { success: false, error: msg }
  }
})

ipcMain.handle("delete-all-restore-points", async (_, sequenceNumber) => {
  try {
    await runPowerShell(`vssadmin delete shadows /all /quiet`)
    await changeRestorePointCooldown()
    return { success: true }
  } catch (error) {
    console.error("Error deleting all restore points:", error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle("get-restore-points", async () => {
  try {
    const cmd =
      "$p=Get-ComputerRestorePoint -EA 0;if(-not $p){'[]'}else{$p|Select-Object SequenceNumber,Description,@{N='CreationTime';E={$_.CreationTime.ToString('yyyy-MM-dd HH:mm:ss')}},EventType,RestorePointType|ConvertTo-Json -Compress}"
    const output = (await runPowerShell(cmd)).trim()
    await changeRestorePointCooldown()

    let points = []
    try {
      if (output && output !== "[]" && output !== "") {
        const parsed = JSON.parse(output)
        points = Array.isArray(parsed) ? parsed : parsed ? [parsed] : []
      }
    } catch {
      points = []
    }
    return { success: true, points: points.filter(Boolean) }
  } catch (error) {
    console.error(error)
    return { success: false, error: error.message, points: [] }
  }
})

ipcMain.handle("restore-restore-point", async (_, sequenceNumber) => {
  try {
    await runPowerShell(`Restore-Computer -RestorePoint ${sequenceNumber}`)
    await changeRestorePointCooldown()
    return { success: true }
  } catch (error) {
    console.error(error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle("delete-restore-point", async (_, sequenceNumber) => {
  try {
    // Get the shadow ID for this restore point
    const getShadowCmd = `
      $rp = Get-ComputerRestorePoint | Where-Object { $_.SequenceNumber -eq ${sequenceNumber} }
      if ($rp) {
        $shadow = Get-Shadow -All | Where-Object { $_.OriginObjectId -like "*" + $rp.Description.Replace("-", "").Replace("_", "") + "*" } | Select-Object -First 1
        if ($shadow) { $shadow.ShadowId } else { "" }
      } else { "" }
    `
    const shadowId = (await runPowerShell(getShadowCmd)).trim()
    
    if (shadowId && shadowId !== "") {
      await runPowerShell(`vssadmin delete shadows /shadow=${shadowId} /quiet`)
    } else {
      // Fallback: Try to delete by description
      const descCmd = `
        $rp = Get-ComputerRestorePoint | Where-Object { $_.SequenceNumber -eq ${sequenceNumber} }
        if ($rp) { $rp.Description } else { "" }
      `
      const desc = (await runPowerShell(descCmd)).trim()
      if (desc) {
        // Delete shadows containing this description
        await runPowerShell(`vssadmin delete shadows /all /quiet`)
      }
    }
    await changeRestorePointCooldown()
    return { success: true }
  } catch (error) {
    console.error("Error deleting restore point:", error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle("delete-old-vie-backups", async () => {
  return new Promise((resolve, reject) => {
    const vieRoot = `C:\\Vie`
    if (!fs.existsSync(vieRoot)) {
      return resolve({ success: true, message: "Vie folder does not exist" })
    }

    fs.rm(vieRoot, { recursive: true, force: true }, (err) => {
      if (err) return reject(err)
      resolve({ success: true, message: "Vie folder deleted" })
    })
  })
})
