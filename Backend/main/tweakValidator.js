import fs from "fs/promises"
import path from "path"

const REQUIRED_META = ["name", "label", "description"]

async function exists(file) {
  return fs
    .access(file)
    .then(() => true)
    .catch(() => false)
}

export async function validateTweaks(tweaksDir) {
  const report = { ok: true, failed: [], warnings: [], duplicates: [], total: 0 }
  const seen = new Set()
  const entries = await fs.readdir(tweaksDir, { withFileTypes: true }).catch(() => [])

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const id = entry.name
    const folder = path.join(tweaksDir, id)
    report.total += 1

    if (seen.has(id)) report.duplicates.push(id)
    seen.add(id)

    const metaPath = path.join(folder, "meta.json")
    const applyPath = path.join(folder, "apply.ps1")
    const unapplyPath = path.join(folder, "unapply.ps1")

    const missing = []
    if (!(await exists(metaPath))) missing.push("meta.json")
    if (!(await exists(applyPath))) missing.push("apply.ps1")
    if (missing.length) {
      report.failed.push({ id, reason: "missing_files", files: missing })
      continue
    }

    let meta = null
    try {
      meta = JSON.parse(await fs.readFile(metaPath, "utf8"))
    } catch (e) {
      report.failed.push({ id, reason: "invalid_meta_json", error: e.message })
      continue
    }

    for (const key of REQUIRED_META) {
      if (meta[key] === undefined)
        report.warnings.push({ id, reason: "missing_meta_field", field: key })
    }

    const apply = await fs.readFile(applyPath, "utf8").catch(() => "")
    if (!apply.trim()) report.failed.push({ id, reason: "empty_apply" })
    if (!(await exists(unapplyPath)))
      report.warnings.push({ id, reason: "missing_rollback", file: "unapply.ps1" })
  }

  if (report.failed.length || report.duplicates.length) report.ok = false
  return report
}

export default { validateTweaks }
