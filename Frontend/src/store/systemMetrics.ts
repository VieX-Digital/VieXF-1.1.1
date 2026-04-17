import { create } from "zustand"
import { useEffect } from "react"
import { invoke, onIpc, sendIpc } from "@/lib/electron"

type MetricsCurrent = {
  cpu: number
  ram: number
  gpu: number
}

type MetricsPoint = {
  time: string
  cpu: number
  ram: number
  gpu: number
}

type MetricsSnapshot = {
  seq?: number
  timestamp?: number
  cpu_usage?: number
  memory_usage?: number
  gpu_usage?: number
}

type MetricsState = {
  current: MetricsCurrent
  history: MetricsPoint[]
}

const MAX_HISTORY_POINTS = 60
const CURRENT_COMMIT_MS = 500
const HISTORY_COMMIT_MS = 1200

const initialCurrent: MetricsCurrent = {
  cpu: 0,
  ram: 0,
  gpu: 0,
}

const useSystemMetricsStore = create<MetricsState>(() => ({
  current: initialCurrent,
  history: [],
}))

let rendererSubscribers = 0
let ipcCleanup: (() => void) | null = null
let currentCommitTimer: ReturnType<typeof setTimeout> | null = null
let historyCommitTimer: ReturnType<typeof setInterval> | null = null
let lastCurrentCommitAt = 0
let lastSeenSequence = 0
let isTabHidden = false
let visibilityListenerAttached = false

let latestSnapshot: MetricsSnapshot | null = null
let historyBuffer: MetricsPoint[] = []

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value || 0)))
}

function toCurrent(snapshot: MetricsSnapshot): MetricsCurrent {
  const cpu = clampPercent(snapshot.cpu_usage || 0)
  const ram = clampPercent(snapshot.memory_usage || 0)
  const gpu = clampPercent(snapshot.gpu_usage ?? cpu * 0.8)

  return { cpu, ram, gpu }
}

function toPoint(snapshot: MetricsSnapshot): MetricsPoint {
  const current = toCurrent(snapshot)

  return {
    ...current,
    time: new Date(snapshot.timestamp || Date.now()).toLocaleTimeString(),
  }
}

function commitCurrent() {
  if (!latestSnapshot) return

  const nextCurrent = toCurrent(latestSnapshot)
  lastCurrentCommitAt = Date.now()

  useSystemMetricsStore.setState((prev) => {
    if (
      prev.current.cpu === nextCurrent.cpu &&
      prev.current.ram === nextCurrent.ram &&
      prev.current.gpu === nextCurrent.gpu
    ) {
      return prev
    }

    return { ...prev, current: nextCurrent }
  })
}

function scheduleCurrentCommit() {
  if (currentCommitTimer) return

  const elapsed = Date.now() - lastCurrentCommitAt
  const delay = Math.max(0, CURRENT_COMMIT_MS - elapsed)

  currentCommitTimer = setTimeout(() => {
    currentCommitTimer = null
    commitCurrent()
  }, delay)
}

function commitHistory() {
  useSystemMetricsStore.setState((prev) => {
    if (prev.history.length === historyBuffer.length) {
      const prevLast = prev.history[prev.history.length - 1]
      const nextLast = historyBuffer[historyBuffer.length - 1]
      if (
        prevLast &&
        nextLast &&
        prevLast.time === nextLast.time &&
        prevLast.cpu === nextLast.cpu &&
        prevLast.ram === nextLast.ram &&
        prevLast.gpu === nextLast.gpu
      ) {
        return prev
      }
    }

    return {
      ...prev,
      history: [...historyBuffer],
    }
  })
}

function startHistoryCommitTimer() {
  if (historyCommitTimer || isTabHidden) return

  historyCommitTimer = setInterval(() => {
    commitHistory()
  }, HISTORY_COMMIT_MS)
}

function stopHistoryCommitTimer() {
  if (!historyCommitTimer) return
  clearInterval(historyCommitTimer)
  historyCommitTimer = null
}

function pushHistorySample(snapshot: MetricsSnapshot) {
  historyBuffer.push(toPoint(snapshot))
  if (historyBuffer.length > MAX_HISTORY_POINTS) {
    historyBuffer = historyBuffer.slice(historyBuffer.length - MAX_HISTORY_POINTS)
  }
}

function notifyVisibility(hidden: boolean) {
  sendIpc({
    channel: "system-metrics:visibility",
    payload: { hidden },
  })
}

function applyVisibility(hidden: boolean) {
  isTabHidden = hidden
  notifyVisibility(hidden)

  if (hidden) {
    stopHistoryCommitTimer()
    return
  }

  startHistoryCommitTimer()

  if (latestSnapshot) {
    pushHistorySample(latestSnapshot)
    commitHistory()
  }
}

function handleMetricsSnapshot(snapshot: MetricsSnapshot) {
  if (!snapshot || typeof snapshot !== "object") return

  const sequence = snapshot.seq || 0
  if (sequence && sequence <= lastSeenSequence) {
    return
  }

  if (sequence) {
    lastSeenSequence = sequence
  }

  latestSnapshot = snapshot
  scheduleCurrentCommit()

  if (!isTabHidden) {
    pushHistorySample(snapshot)
  }
}

function handleVisibilityChange() {
  if (typeof document === "undefined") return
  applyVisibility(document.hidden)
}

function attachVisibilityListener() {
  if (visibilityListenerAttached || typeof document === "undefined") return

  document.addEventListener("visibilitychange", handleVisibilityChange)
  visibilityListenerAttached = true
}

function detachVisibilityListener() {
  if (!visibilityListenerAttached || typeof document === "undefined") return

  document.removeEventListener("visibilitychange", handleVisibilityChange)
  visibilityListenerAttached = false
}

async function startMetricsSubscription() {
  if (ipcCleanup) return

  ipcCleanup = onIpc({
    channel: "system-metrics:update",
    listener: handleMetricsSnapshot,
  })

  attachVisibilityListener()

  sendIpc({ channel: "system-metrics:subscribe", payload: null })
  applyVisibility(typeof document !== "undefined" ? document.hidden : false)
  startHistoryCommitTimer()

  try {
    const snapshot = await invoke({ channel: "system-metrics:snapshot", payload: null })
    handleMetricsSnapshot(snapshot)
    commitCurrent()
    commitHistory()
  } catch {
    // Ignore transient IPC errors during app bootstrap.
  }
}

function stopMetricsSubscription() {
  if (ipcCleanup) {
    ipcCleanup()
    ipcCleanup = null
  }

  sendIpc({ channel: "system-metrics:unsubscribe", payload: null })
  detachVisibilityListener()

  stopHistoryCommitTimer()

  if (currentCommitTimer) {
    clearTimeout(currentCommitTimer)
    currentCommitTimer = null
  }
}

export function useSystemMetricsSubscription() {
  useEffect(() => {
    rendererSubscribers += 1

    if (rendererSubscribers === 1) {
      void startMetricsSubscription()
    }

    return () => {
      rendererSubscribers = Math.max(0, rendererSubscribers - 1)
      if (rendererSubscribers === 0) {
        stopMetricsSubscription()
      }
    }
  }, [])
}

export default useSystemMetricsStore

