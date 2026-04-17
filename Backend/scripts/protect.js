/**
 * Obfuscate built JavaScript files and pack them into an app.asar.
 *
 * Usage: npm run protect
 * - Runs the normal build
 * - Obfuscates all .js/.mjs/.cjs files under ./out
 * - Generates ./dist/app.asar from the obfuscated output
 */

import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { execSync } from "child_process"
import obfuscator from "javascript-obfuscator"
import asar from "asar"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const root = path.resolve(__dirname, "..", "..")
const outDir = path.join(root, "out")
const distDir = path.join(root, "dist")
const targetAsar = path.join(distDir, "app.asar")

const exts = new Set([".js", ".mjs", ".cjs"])

const obfuscationOptions = {
  compact: true,
  controlFlowFlattening: true,
  deadCodeInjection: true,
  stringArray: true,
  stringArrayEncoding: ["base64"],
  stringArrayThreshold: 0.75,
  transformObjectKeys: true,
  disableConsoleOutput: true,
  identifierNamesGenerator: "hexadecimal",
}

const walkFiles = (dir) => {
  const results = []
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      // skip common junk
      if (["node_modules", ".git"].includes(entry.name)) continue
      results.push(...walkFiles(full))
    } else {
      results.push(full)
    }
  }
  return results
}

const obfuscateFile = (file) => {
  const code = fs.readFileSync(file, "utf8")
  const result = obfuscator.obfuscate(code, obfuscationOptions)
  fs.writeFileSync(file, result.getObfuscatedCode(), "utf8")
}

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

try {
  console.log("Running build...")
  execSync("npm run build", { stdio: "inherit" })

  if (!fs.existsSync(outDir)) {
    throw new Error("Build output not found at ./out")
  }

  console.log("Obfuscating JavaScript in ./out ...")
  const files = walkFiles(outDir).filter((f) => exts.has(path.extname(f).toLowerCase()))
  files.forEach(obfuscateFile)
  console.log(`Obfuscated ${files.length} files.`)

  ensureDir(distDir)
  console.log(`Creating ASAR => ${targetAsar}`)
  asar.createPackage(outDir, targetAsar)

  console.log("Protection complete.")
} catch (err) {
  console.error("Protect step failed:", err.message)
  process.exit(1)
}
