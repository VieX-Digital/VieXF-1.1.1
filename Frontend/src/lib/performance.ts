import { useMemo, useSyncExternalStore } from "react"

export type AnimationMode = "full" | "reduced" | "minimal"

export type PerformanceProfile = {
  prefersReducedMotion: boolean
  lowEndDevice: boolean
  batterySaver: boolean
  fpsLow: boolean
  mode: AnimationMode
  durationScale: number
  staggerScale: number
  disableNonEssentialEffects: boolean
}

const isBrowser = typeof window !== "undefined"
const listeners = new Set<() => void>()

let prefersReducedMotion = false
let fpsLow = false
let batterySaver = false
let lowEndDevice = false
let initialized = false
let rafId = 0
let mediaQuery: MediaQueryList | null = null

// Stable cached snapshot — only replaced when values change
let cachedSnapshot: PerformanceProfile = buildSnapshot()

function buildSnapshot(): PerformanceProfile {
  const mode: AnimationMode =
    prefersReducedMotion || batterySaver ? "minimal" : fpsLow || lowEndDevice ? "reduced" : "full"
  return {
    prefersReducedMotion,
    lowEndDevice,
    batterySaver,
    fpsLow,
    mode,
    durationScale: mode === "full" ? 1 : mode === "reduced" ? 0.72 : 0.45,
    staggerScale: mode === "full" ? 1 : mode === "reduced" ? 0.55 : 0,
    disableNonEssentialEffects: mode !== "full",
  }
}

// Only emit + rebuild when something actually changed
function emit() {
  const next = buildSnapshot()
  if (
    next.mode === cachedSnapshot.mode &&
    next.prefersReducedMotion === cachedSnapshot.prefersReducedMotion &&
    next.fpsLow === cachedSnapshot.fpsLow &&
    next.batterySaver === cachedSnapshot.batterySaver &&
    next.lowEndDevice === cachedSnapshot.lowEndDevice
  )
    return
  cachedSnapshot = next
  listeners.forEach((l) => l())
}

function getSnapshot(): PerformanceProfile {
  return cachedSnapshot
}

function detectLowEndDevice(): boolean {
  if (!isBrowser) return false
  const nav = navigator as Navigator & {
    deviceMemory?: number
    hardwareConcurrency?: number
    connection?: { saveData?: boolean; effectiveType?: string }
  }
  const memoryLow = typeof nav.deviceMemory === "number" && nav.deviceMemory <= 4
  const coresLow = typeof nav.hardwareConcurrency === "number" && nav.hardwareConcurrency <= 4
  const saveData = Boolean(nav.connection?.saveData)
  const slowConn =
    nav.connection?.effectiveType === "slow-2g" || nav.connection?.effectiveType === "2g"
  return memoryLow || coresLow || saveData || slowConn
}

function startFpsSampler() {
  if (!isBrowser) return
  let last = performance.now()
  let frames = 0
  let lowSamples = 0

  const loop = (now: number) => {
    frames += 1
    if (now - last >= 1000) {
      const fps = (frames * 1000) / (now - last)
      const nextLow = fps < 48
      lowSamples = nextLow ? lowSamples + 1 : Math.max(0, lowSamples - 1)
      const stableLow = lowSamples >= 2
      if (stableLow !== fpsLow) {
        fpsLow = stableLow
        emit()
      }
      frames = 0
      last = now
    }
    rafId = requestAnimationFrame(loop)
  }
  rafId = requestAnimationFrame(loop)
}

function initialize() {
  if (!isBrowser || initialized) return
  initialized = true

  lowEndDevice = detectLowEndDevice()

  mediaQuery = window.matchMedia?.("(prefers-reduced-motion: reduce)") ?? null
  prefersReducedMotion = Boolean(mediaQuery?.matches)
  cachedSnapshot = buildSnapshot()

  mediaQuery?.addEventListener?.("change", () => {
    prefersReducedMotion = Boolean(mediaQuery?.matches)
    emit()
  })

  const nav = navigator as Navigator & {
    getBattery?: () => Promise<{
      charging: boolean
      level: number
      addEventListener?: (type: string, cb: () => void) => void
    }>
  }
  nav
    .getBattery?.()
    .then((battery) => {
      const update = () => {
        const next = !battery.charging && battery.level <= 0.2
        if (next !== batterySaver) {
          batterySaver = next
          emit()
        }
      }
      update()
      battery.addEventListener?.("levelchange", update)
      battery.addEventListener?.("chargingchange", update)
    })
    .catch(() => undefined)

  startFpsSampler()
}

// Initialise once at module load time (browser only)
if (isBrowser) initialize()

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function usePerformanceProfile(): PerformanceProfile {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

export function useAdaptiveMotion(): PerformanceProfile {
  const profile = usePerformanceProfile()
  return useMemo(() => profile, [profile])
}

export function getCurrentPerformanceProfile(): PerformanceProfile {
  return cachedSnapshot
}
