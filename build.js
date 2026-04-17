import fs from "fs/promises"
import path from "path"
import { execSync } from "child_process"

const root = process.cwd()
const tweaksDir = path.join(root, "Backend", "tweaks")
const registryPath = path.join(tweaksDir, "registry.json")
const registryScriptsPath = path.join(tweaksDir, "registry-scripts.json")

async function buildRegistry() {
  const folders = await fs.readdir(tweaksDir)
  const registryNormal = []
  const registryScripts = []

  for (const folder of folders) {
    const tweakPath = path.join(tweaksDir, folder)
    const stat = await fs.stat(tweakPath).catch(() => null)
    if (!stat?.isDirectory()) continue

    const metaPath = path.join(tweakPath, "meta.json")
    const applyPath = path.join(tweakPath, "apply.ps1")
    const unapplyPath = path.join(tweakPath, "unapply.ps1")

    try {
      const metaRaw = await fs.readFile(metaPath, "utf8")
      const meta = JSON.parse(metaRaw)

      const baseTweak = {
        id: meta.name || folder,
        title: meta.title || folder,
        description: meta.description || "",
        category: meta.category || [],
        recommended: !!meta.recommended,
        top: !!meta.top,
        tier: meta.tier || "free",
        reversible: meta.reversible !== false,
        addedversion: meta.addedversion,
        updatedversion: meta.updatedversion,
        docsurl: `https://docs.getvie.net/tweaks/${folder}`,
        source: `https://github.com/vie/Vie/blob/v2/tweaks/${folder}/meta.json`,
      }

      registryNormal.push(baseTweak)

      let applyScript = null
      let unapplyScript = null

      try {
        applyScript = await fs.readFile(applyPath, "utf8")
      } catch (e) {
        console.warn(`⚠️ No apply.ps1 found for ${folder}`)
      }

      if (baseTweak.reversible) {
        try {
          unapplyScript = await fs.readFile(unapplyPath, "utf8")
        } catch (e) {
          console.warn(`⚠️ No unapply.ps1 found for ${folder}`)
        }
      }

      registryScripts.push({
        ...baseTweak,
        scripts: {
          apply: applyScript,
          unapply: unapplyScript,
        },
      })
    } catch (e) {
      console.error(`⚠️ Failed to read tweak in ${folder}: ${e.message}`)
    }
  }

  const timestamp = new Date().toISOString()

  const normalOutput = { version: timestamp, tweaks: registryNormal }
  await fs.writeFile(registryPath, JSON.stringify(normalOutput, null, 2))
  console.log(`✅ registry.json created at ${registryPath}`)

  const scriptsOutput = { version: timestamp, tweaks: registryScripts }
  await fs.writeFile(registryScriptsPath, JSON.stringify(scriptsOutput, null, 2))
  console.log(`✅ registry-scripts.json created at ${registryScriptsPath}`)
}

function buildElectron() {
  console.log("🚀 Building Electron app...")
  execSync("npm run build:vite && electron-builder", { stdio: "inherit" })
}

const args = process.argv.slice(2)
const shouldBuildRegistry = args.includes("--registry") || args.length === 0
const shouldBuildApp = args.includes("--build") || args.length === 0

;(async () => {
  if (shouldBuildRegistry) await buildRegistry()
  if (shouldBuildApp) {
    const distPath = path.join(root, "dist")
    try {
      await fs.rm(distPath, { recursive: true, force: true })
      console.log("🗑️  Deleted dist folder")
      await fs.mkdir(distPath, { recursive: true })
      console.log("✨ Created new dist folder")
    } catch (error) {
      console.error(`⚠️  Failed to clean dist folder: ${error.message}`)
    }
    try {
      buildElectron()
    } catch (e) {
      console.error("Build failed:", e)
      process.exit(1)
    }
  }
})()
