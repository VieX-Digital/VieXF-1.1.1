function getIpcRenderer() {
  return window?.electron?.ipcRenderer
}

const OP_LOG_KEY = "vie:operation-log"
const MAX_OP_LOGS = 200

function readOperationLogs() {
  try {
    const raw = localStorage.getItem(OP_LOG_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeOperationLogs(logs) {
  try {
    localStorage.setItem(OP_LOG_KEY, JSON.stringify(logs.slice(0, MAX_OP_LOGS)))
    window.dispatchEvent(new CustomEvent("vie:operation-log-updated"))
  } catch {
    // Ignore storage failures.
  }
}

function pushOperationLog(entry) {
  const logs = readOperationLogs()
  logs.unshift({
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    time: Date.now(),
    ...entry,
  })
  writeOperationLogs(logs)
}

function createCorrelationId(channel) {
  return `${channel}:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 8)}`
}

function withTimeout(promise, timeoutMs, channel) {
  if (!timeoutMs || timeoutMs <= 0) return promise

  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`IPC timeout on "${channel}" after ${timeoutMs}ms`))
      }, timeoutMs)
    }),
  ])
}

function getInvokePolicy(channel) {
  if (channel.startsWith("system-metrics:")) {
    return { retries: 0, timeoutMs: 3000 }
  }

  if (
    channel === "tweak:set" ||
    channel === "tweak:set-batch" ||
    channel === "tweak:toggle" ||
    channel === "tweak:apply" ||
    channel === "tweak:unapply"
  ) {
    return { retries: 0, timeoutMs: 20 * 60 * 1000 }
  }

  if (channel === "tweaks:fetch") {
    return { retries: 1, timeoutMs: 30000 }
  }

  if (channel.startsWith("game-mode:")) {
    return { retries: 0, timeoutMs: 60000 }
  }

  if (channel.startsWith("ramclear:")) {
    return { retries: 0, timeoutMs: 30000 }
  }

  if (channel === "updater:download") {
    return { retries: 0, timeoutMs: 30 * 60 * 1000 }
  }

  if (channel === "updater:check") {
    return { retries: 0, timeoutMs: 45000 }
  }

  return { retries: 1, timeoutMs: 10000 }
}

export function minimize() {
  getIpcRenderer()?.send("window-minimize")
}

export function toggleMaximize() {
  getIpcRenderer()?.send("window-toggle-maximize")
}

export function close() {
  getIpcRenderer()?.send("window-close")
}

export async function invoke({ channel, payload }) {
  const ipc = getIpcRenderer()
  const correlationId = createCorrelationId(channel)
  if (ipc?.invoke) {
    const { retries, timeoutMs } = getInvokePolicy(channel)
    let lastError

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const result = await withTimeout(ipc.invoke(channel, payload), timeoutMs, channel)
        pushOperationLog({
          channel,
          status: "success",
          detail: `Invoke success (${channel})`,
        })
        return result
      } catch (error) {
        lastError = error
        if (attempt === retries) break
      }
    }

    const normalized = new Error(
      `[${correlationId}] invoke failed for "${channel}": ${lastError?.message || "Unknown error"}`
    )
    normalized.cause = lastError
    pushOperationLog({
      channel,
      status: "error",
      detail: normalized.message,
    })
    throw normalized
  }

  console.log("[mock invoke]", channel, payload);
  // Basic mock returns for initial UI load
  if (channel === "license:get") {
    return {
      tier: "free",
      expiresAt: null,
      msRemaining: 0,
      daysRemaining: 0,
      proTrialExpired: false,
      discordUrl: "https://discord.com/channels/1274585470633906176/1466020101554835466",
    }
  }
  if (channel === "tweak:active") return [];
  if (channel === "tweaks:fetch") return [];
  if (channel === "get-system-specs") return { hasGPU: false };
  if (channel === "get-system-metrics") return { cpu_usage: 0, memory_usage: 0 };
  return {};
}

export function getOperationLogs() {
  return readOperationLogs()
}

export function clearOperationLogs() {
  writeOperationLogs([])
}

export function sendIpc({ channel, payload }) {
  const ipc = getIpcRenderer()
  if (!ipc?.send) return
  ipc.send(channel, payload)
}

export function onIpc({ channel, listener }) {
  const ipc = getIpcRenderer()
  if (!ipc?.on || typeof listener !== "function") return () => {}

  const wrapped = (_, payload) => listener(payload)
  ipc.on(channel, wrapped)

  return () => {
    if (typeof ipc.off === "function") {
      ipc.off(channel, wrapped)
      return
    }
    if (typeof ipc.removeListener === "function") {
      ipc.removeListener(channel, wrapped)
      return
    }
    if (typeof ipc.removeAllListeners === "function") {
      ipc.removeAllListeners(channel)
    }
  }
}
