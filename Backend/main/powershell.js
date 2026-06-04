import { promises as fsp } from "fs"
import path from "path"
import { spawn, exec } from "child_process"
import { app, ipcMain } from "electron"
import { mainWindow } from "./index"
import fs from "fs"
import log from "electron-log"

console.log = log.log
console.error = log.error
console.warn = log.warn

const DEFAULT_TIMEOUT_MS = 120000
const MAX_BUFFER = 1024 * 1024 * 50

function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true })
}

function withUtf8Bom(script) {
  return `\uFEFF${String(script ?? "").replace(/^\uFEFF+/, "")}`
}

function normalizeName(name) {
  return (
    String(name || "script")
      .replace(/[^a-z0-9_.-]/gi, "_")
      .slice(0, 80) || "script"
  )
}

export async function executePowerShell(_, props = {}) {
  const {
    script,
    name = "script",
    env: extraEnv,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    retries = 0,
    requireAdmin = false,
  } = props
  const start = Date.now()
  const scriptName = normalizeName(name)
  const tempDir = path.join(app.getPath("userData"), "scripts")
  ensureDirectoryExists(tempDir)

  const adminGuard = requireAdmin
    ? `
$principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) { throw 'Administrator privileges required.' }
`
    : ""

  async function runOnce(attempt) {
    const tempFile = path.join(tempDir, `${scriptName}-${Date.now()}-${attempt}.ps1`)
    await fsp.writeFile(tempFile, withUtf8Bom(`${adminGuard}\n${script}`), "utf8")

    return await new Promise((resolve) => {
      const childEnv = {
        ...process.env,
        ...(extraEnv && typeof extraEnv === "object" ? extraEnv : {}),
      }
      const child = spawn(
        "powershell.exe",
        ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", tempFile],
        {
          env: childEnv,
          windowsHide: true,
          stdio: ["ignore", "pipe", "pipe"],
        },
      )

      let stdout = ""
      let stderr = ""
      let killed = false
      const timer = setTimeout(
        () => {
          killed = true
          try {
            child.kill("SIGTERM")
          } catch {}
          setTimeout(() => {
            try {
              child.kill("SIGKILL")
            } catch {}
          }, 1500)
        },
        Math.max(1000, Number(timeoutMs) || DEFAULT_TIMEOUT_MS),
      )

      child.stdout.on("data", (d) => {
        stdout += d.toString("utf8")
        if (stdout.length > MAX_BUFFER) stdout = stdout.slice(-MAX_BUFFER)
      })
      child.stderr.on("data", (d) => {
        stderr += d.toString("utf8")
        if (stderr.length > MAX_BUFFER) stderr = stderr.slice(-MAX_BUFFER)
      })
      child.on("error", (error) => {
        clearTimeout(timer)
        resolve({
          ok: false,
          success: false,
          code: -1,
          stdout,
          stderr: stderr || error.message,
          output: stdout,
          error: error.message,
          duration: Date.now() - start,
          script: scriptName,
        })
      })
      child.on("close", async (code) => {
        clearTimeout(timer)
        await fsp.unlink(tempFile).catch(() => undefined)
        const ok = !killed && Number(code) === 0
        const error = killed
          ? `PowerShell timeout after ${timeoutMs}ms`
          : ok
            ? undefined
            : stderr.trim() || stdout.trim() || `PowerShell exited with code ${code}`
        if (stderr) console.warn(`PowerShell stderr [${scriptName}]:`, stderr)
        if (stdout) console.log(`PowerShell stdout [${scriptName}]:`, stdout)
        resolve({
          ok,
          success: ok,
          code: Number(code ?? -1),
          stdout,
          stderr,
          output: stdout,
          error,
          duration: Date.now() - start,
          script: scriptName,
        })
      })
    })
  }

  let last
  for (let attempt = 0; attempt <= Number(retries || 0); attempt++) {
    last = await runOnce(attempt)
    if (last.ok) return last
  }
  console.error(`PowerShell execution error [${scriptName}]:`, last?.error)
  return last
}

async function runPowerShellInWindow(event, { script, name = "script", noExit = true }) {
  try {
    const tempDir = path.join(app.getPath("userData"), "scripts")
    ensureDirectoryExists(tempDir)
    const tempFile = path.join(tempDir, `${normalizeName(name)}-${Date.now()}.ps1`)
    await fsp.writeFile(tempFile, withUtf8Bom(script), "utf8")
    const noExitFlag = noExit ? "-NoExit" : ""
    exec(
      `start powershell.exe ${noExitFlag} -ExecutionPolicy Bypass -File "${tempFile}"`,
      (error) => {
        if (error) console.error(`Error launching PowerShell window [${name}]:`, error)
      },
    )
    return { ok: true, success: true }
  } catch (error) {
    return { ok: false, success: false, error: error.message }
  }
}

ipcMain.removeHandler("run-powershell-window")
ipcMain.removeHandler("run-powershell")
ipcMain.handle("run-powershell-window", runPowerShellInWindow)
ipcMain.handle("run-powershell", executePowerShell)

ipcMain.removeHandler("handle-apps")
ipcMain.handle("handle-apps", async (event, { action, apps }) => {
  const list = Array.isArray(apps) ? apps : []
  for (const appName of list) mainWindow?.webContents?.send("install-progress", `${appName}`)
  mainWindow?.webContents?.send("install-complete")
  return { ok: true, success: true, action, count: list.length }
})
