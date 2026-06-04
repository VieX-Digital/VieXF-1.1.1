import fs from "fs/promises"
import path from "path"
import { spawn } from "child_process"
import os from "os"

const TWEAKS_DIR = path.resolve("Backend/tweaks")
const REPORT_FILE = path.resolve(
  "C:/Users/Acer/.gemini/antigravity/brain/be9f1739-83a2-4c5e-af7b-417d1f20004e/tweak_validation_report.md",
)

// Exec PowerShell command helper
function runPowerShell(command) {
  return new Promise((resolve) => {
    const child = spawn(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", command],
      { windowsHide: true },
    )

    let stdout = ""
    let stderr = ""

    child.stdout.on("data", (data) => (stdout += data.toString("utf8")))
    child.stderr.on("data", (data) => (stderr += data.toString("utf8")))

    child.on("close", (code) => {
      resolve({
        code,
        success: code === 0,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
      })
    })
  })
}

// Check if a service exists on Windows
async function checkServiceExists(serviceName) {
  const result = await runPowerShell(
    `Get-Service -Name "${serviceName}" -ErrorAction SilentlyContinue`,
  )
  return result.success
}

// Validate Registry Paths syntax
function analyzeRegistryPaths(scriptContent) {
  const errors = []
  const matches = []

  // Find HKLM/HKCU paths
  // Matches HKLM:\... or HKLM\... or HKCU:\... or HKCU\...
  const regex = /\b(HKLM|HKCU)(:\\|\\)([a-zA-Z0-9_\-\\ ]+)/gi
  let match
  while ((match = regex.exec(scriptContent)) !== null) {
    const rawPath = match[0]
    const root = match[1]
    const separator = match[2]
    const subpath = match[3]

    matches.push({ root, rawPath, subpath })

    if (separator === "\\") {
      errors.push({
        type: "invalid_separator",
        message: `Registry path "${rawPath}" uses '\\' separator instead of ':\\'. PowerShell requires 'HKLM:\\' or 'HKCU:\\'.`,
      })
    }
  }

  return { errors, matches }
}

// Find services manipulated in script
function analyzeServices(scriptContent) {
  const services = new Set()
  // Matches Stop-Service, Start-Service, Set-Service, Restart-Service, Get-Service
  const regex =
    /(Stop|Start|Set|Restart|Get)-Service\s+(?:-Name\s+)?["']?([a-zA-Z0-9_][a-zA-Z0-9_\-]+)["']?/gi
  let match
  while ((match = regex.exec(scriptContent)) !== null) {
    if (match[2] && !match[2].startsWith("-")) {
      services.add(match[2])
    }
  }
  return Array.from(services)
}

// Find registry properties modified (Set-ItemProperty)
function analyzeRegistryProperties(scriptContent) {
  const properties = []
  // Capture Set-ItemProperty -Path "..." -Name "..."
  const regex = /Set-ItemProperty\s+-Path\s+["']([^"']+)["']\s+-Name\s+["']([^"']+)["']/gi
  let match
  while ((match = regex.exec(scriptContent)) !== null) {
    properties.push({ path: match[1], name: match[2] })
  }
  return properties
}

// Run PowerShell syntax check using AST
async function runSyntaxCheck(filePath) {
  const command = `
    $errors = $null
    $tokens = $null
    $ast = [System.Management.Automation.Language.Parser]::ParseFile('${filePath.replace(/'/g, "''")}', [ref]$tokens, [ref]$errors)
    if ($errors) {
      $errors | ForEach-Object { "$($_.Extent.StartLineNumber): $($_.Message)" }
    }
  `
  const result = await runPowerShell(command)
  if (result.stdout) {
    return result.stdout.split("\n").filter(Boolean)
  }
  return []
}

// Classify safety level
function determineSafetyLevel(meta, scriptContent) {
  const name = (meta.name || "").toLowerCase()
  const category = Array.isArray(meta.category) ? meta.category.join(" ").toLowerCase() : ""
  const combined = `${name} ${category} ${scriptContent.toLowerCase()}`

  if (
    combined.includes("bcdedit") ||
    combined.includes("core-isolation") ||
    combined.includes("defender") ||
    combined.includes("debloat-windows") ||
    combined.includes("ultra-debloat")
  ) {
    return "Experimental"
  }
  if (
    combined.includes("service") ||
    combined.includes("active-directory") ||
    combined.includes("powercfg")
  ) {
    return "Advanced"
  }
  if (
    combined.includes("network") ||
    combined.includes("nvidia") ||
    combined.includes("hags") ||
    combined.includes("priority-separation")
  ) {
    return "Moderate"
  }
  return "Safe"
}

async function main() {
  console.log("=== VIE-XF TWEAK VALIDATION LAB STARTING ===")

  if (os.platform() !== "win32") {
    console.error("This validation lab requires a Windows environment.")
    process.exit(1)
  }

  const entries = await fs.readdir(TWEAKS_DIR, { withFileTypes: true })
  const report = {
    totalTweaks: 0,
    passed: 0,
    failed: 0,
    results: [],
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue

    const tweakId = entry.name
    const folder = path.join(TWEAKS_DIR, tweakId)
    const metaPath = path.join(folder, "meta.json")
    const applyPath = path.join(folder, "apply.ps1")
    const unapplyPath = path.join(folder, "unapply.ps1")

    report.totalTweaks++

    const result = {
      id: tweakId,
      title: tweakId,
      metaValid: false,
      applyValid: false,
      unapplyValid: false,
      syntaxErrors: [],
      registryErrors: [],
      serviceWarnings: [],
      rollbackWarnings: [],
      safetyLevel: "Safe",
      issuesCount: 0,
    }

    // 1. Meta validation
    let meta = {}
    try {
      const metaContent = await fs.readFile(metaPath, "utf8")
      meta = JSON.parse(metaContent)
      result.title = meta.title?.vi || meta.title?.en || tweakId
      result.metaValid = !!(meta.name && meta.title && meta.description)
      if (!result.metaValid) {
        result.registryErrors.push(
          "meta.json is missing required fields (name, title, description)",
        )
        result.issuesCount++
      }
    } catch (e) {
      result.registryErrors.push(`Failed to read/parse meta.json: ${e.message}`)
      result.issuesCount++
    }

    // 2. Syntax & File Check for apply.ps1
    let applyContent = ""
    try {
      applyContent = await fs.readFile(applyPath, "utf8")
      result.applyValid = applyContent.trim().length > 0
      if (!result.applyValid) {
        result.registryErrors.push("apply.ps1 is empty or missing")
        result.issuesCount++
      } else {
        const syntaxErrors = await runSyntaxCheck(applyPath)
        if (syntaxErrors.length > 0) {
          result.syntaxErrors.push(...syntaxErrors.map((e) => `apply.ps1 L${e}`))
          result.issuesCount += syntaxErrors.length
        }
      }
    } catch (e) {
      result.registryErrors.push(`apply.ps1 is missing: ${e.message}`)
      result.issuesCount++
    }

    // 3. Syntax & File Check for unapply.ps1
    let unapplyContent = ""
    let hasUnapply = false
    try {
      unapplyContent = await fs.readFile(unapplyPath, "utf8")
      hasUnapply = unapplyContent.trim().length > 0
      result.unapplyValid = hasUnapply
      if (hasUnapply) {
        const syntaxErrors = await runSyntaxCheck(unapplyPath)
        if (syntaxErrors.length > 0) {
          result.syntaxErrors.push(...syntaxErrors.map((e) => `unapply.ps1 L${e}`))
          result.issuesCount += syntaxErrors.length
        }
      } else {
        result.rollbackWarnings.push("unapply.ps1 is empty. This is a one-way tweak.")
      }
    } catch (e) {
      result.rollbackWarnings.push("unapply.ps1 is missing. This is a one-way tweak.")
    }

    // 4. Registry Path Analysis
    if (applyContent) {
      const applyReg = analyzeRegistryPaths(applyContent)
      if (applyReg.errors.length > 0) {
        result.registryErrors.push(...applyReg.errors.map((e) => `[apply.ps1] ${e.message}`))
        result.issuesCount += applyReg.errors.length
      }

      // Check rollback symmetry for registry properties
      if (hasUnapply) {
        const unapplyReg = analyzeRegistryPaths(unapplyContent)
        if (unapplyReg.errors.length > 0) {
          result.registryErrors.push(...unapplyReg.errors.map((e) => `[unapply.ps1] ${e.message}`))
          result.issuesCount += unapplyReg.errors.length
        }

        const applyProps = analyzeRegistryProperties(applyContent)
        const unapplyProps = analyzeRegistryProperties(unapplyContent)

        for (const aProp of applyProps) {
          const hasSymmetry = unapplyProps.some(
            (uProp) => uProp.name.toLowerCase() === aProp.name.toLowerCase(),
          )
          if (!hasSymmetry) {
            result.rollbackWarnings.push(
              `Property "${aProp.name}" modified in apply.ps1 is not restored in unapply.ps1.`,
            )
          }
        }
      }
    }

    // 5. Service Analysis
    if (applyContent) {
      const services = analyzeServices(applyContent)
      for (const service of services) {
        const exists = await checkServiceExists(service)
        if (!exists) {
          result.serviceWarnings.push(
            `Service "${service}" does not exist on this Windows device. Tweak will be skipped or may fail silently.`,
          )
        }
      }
    }

    // Determine safety level
    result.safetyLevel = determineSafetyLevel(meta, applyContent + "\n" + unapplyContent)

    if (result.issuesCount === 0) {
      report.passed++
    } else {
      report.failed++
    }

    report.results.push(result)
  }

  // Generate Markdown Report
  let mdReport = `# VieXF Tweak Validation Lab Report

**Thời gian kiểm định:** ${new Date().toLocaleString("vi-VN")}
**Môi trường:** Windows OS (Detected: ${os.release()})

## Tổng quan kiểm định
- **Tổng số tweaks:** ${report.totalTweaks}
- **Vượt qua (Passed):** ${report.passed}
- **Cảnh báo/Lỗi (Failed/Issues):** ${report.failed}

---

## Chi tiết kết quả kiểm định

| Tweak ID | Tên hiển thị | Safety Level | Trạng thái | Lỗi/Cảnh báo |
| --- | --- | --- | --- | --- |
`

  for (const r of report.results) {
    const statusIcon = r.issuesCount === 0 ? "✅ PASSED" : "❌ ISSUES"
    const problems = []
    if (r.syntaxErrors.length > 0) problems.push(`**Cú pháp:** ${r.syntaxErrors.join(", ")}`)
    if (r.registryErrors.length > 0) problems.push(`**Registry:** ${r.registryErrors.join(", ")}`)
    if (r.serviceWarnings.length > 0) problems.push(`**Dịch vụ:** ${r.serviceWarnings.join(", ")}`)
    if (r.rollbackWarnings.length > 0)
      problems.push(`**Rollback:** ${r.rollbackWarnings.join(", ")}`)

    const problemText = problems.length > 0 ? problems.join("<br>") : "Không có"

    mdReport += `| \`${r.id}\` | ${r.title} | **${r.safetyLevel}** | ${statusIcon} | ${problemText} |\n`
  }

  mdReport += `
---
## Hướng dẫn xử lý
1. **Lỗi Separator Registry (\`HKLM\\...\`):** Sửa thành \`HKLM:\\...\` trong apply.ps1/unapply.ps1.
2. **Thiếu Rollback (Symmetry Warning):** Thêm khôi phục Registry Property hoặc Service tương ứng trong unapply.ps1.
3. **Service không tồn tại:** Có thể service đó thuộc phiên bản Windows khác (như Enterprise/Pro). Đảm bảo script dùng \`-ErrorAction SilentlyContinue\` để tránh làm treo tiến trình PowerShell.
`

  await fs.writeFile(REPORT_FILE, mdReport, "utf8")
  console.log(`=== VALIDATION LAB COMPLETE. REPORT WRITTEN TO ${REPORT_FILE} ===`)
}

main().catch(console.error)
