import { useEffect, useState, useCallback, memo } from "react"
import { useNavigate } from "react-router-dom"
import RootDiv from "@/components/rootdiv"
import { invoke, sendIpc, onIpc } from "@/lib/electron"
import { toast } from "react-toastify"
import { MemoryStick, Trash2, RefreshCw, LogOut } from "lucide-react"

// ── Types ─────────────────────────────────────────────────────────────────
type RamStats = {
  totalMb: number
  activeMb: number
  standbyMb: number
  freeMb: number
  usagePercent: number
  timestamp: number
}

type CleanResult = {
  success: boolean
  freedMb?: number
  beforeFreeMb?: number
  afterFreeMb?: number
  processCount?: number
  standbyPurged?: boolean
  error?: string
}

type GateState = {
  loading: boolean
  authenticated: boolean
  waiting: boolean
  error: string | null
}

// ── Stat Panel (memoized — only re-renders when its own value changes) ────
const StatPanel = memo(function StatPanel({
  label,
  valueMb,
  color,
  subtext,
}: {
  label: string
  valueMb: number
  color: string
  subtext?: string
}) {
  const displayGb = (valueMb / 1024).toFixed(2)
  const displayMb = valueMb.toLocaleString()

  return (
    <div
      className="flex-1 min-w-[140px] rounded-lg border px-4 py-3"
      style={{
        borderColor: `${color}33`,
        backgroundColor: `${color}0A`,
      }}
    >
      <div className="text-xs text-white/50 mb-1">{label}</div>
      <div className="text-2xl font-bold" style={{ color }}>
        {displayGb}
        <span className="text-sm font-normal text-white/40 ml-1">GB</span>
      </div>
      <div className="text-[11px] text-white/35 mt-0.5">
        {displayMb} MB {subtext ? `· ${subtext}` : ""}
      </div>
    </div>
  )
})

// ── Usage Bar (flat, no animation) ────────────────────────────────────────
const UsageBar = memo(function UsageBar({
  percent,
  activePercent,
  standbyPercent,
}: {
  percent: number
  activePercent: number
  standbyPercent: number
}) {
  const barColor =
    percent > 90 ? "#ef4444" : percent > 70 ? "#f59e0b" : "#10b981"

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-white/50">RAM Usage</span>
        <span className="text-sm font-semibold" style={{ color: barColor }}>
          {percent}%
        </span>
      </div>
      <div className="w-full h-3 rounded-full bg-white/5 overflow-hidden flex">
        {/* Active segment */}
        <div
          className="h-full"
          style={{
            width: `${activePercent}%`,
            backgroundColor: "#3b82f6",
          }}
        />
        {/* Standby/Cache segment */}
        <div
          className="h-full"
          style={{
            width: `${standbyPercent}%`,
            backgroundColor: "#8b5cf6",
          }}
        />
      </div>
      <div className="flex items-center gap-4 mt-1.5">
        <span className="text-[10px] text-white/40 flex items-center gap-1">
          <span
            className="inline-block w-2 h-2 rounded-sm"
            style={{ backgroundColor: "#3b82f6" }}
          />
          Active
        </span>
        <span className="text-[10px] text-white/40 flex items-center gap-1">
          <span
            className="inline-block w-2 h-2 rounded-sm"
            style={{ backgroundColor: "#8b5cf6" }}
          />
          Cache
        </span>
        <span className="text-[10px] text-white/40 flex items-center gap-1">
          <span
            className="inline-block w-2 h-2 rounded-sm"
            style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
          />
          Free
        </span>
      </div>
    </div>
  )
})

// ── Main Page ─────────────────────────────────────────────────────────────
export default function RamClear() {
  const navigate = useNavigate()
  const [gate, setGate] = useState<GateState>({
    loading: true,
    authenticated: false,
    waiting: false,
    error: null,
  })
  const [stats, setStats] = useState<RamStats>({
    totalMb: 0,
    activeMb: 0,
    standbyMb: 0,
    freeMb: 0,
    usagePercent: 0,
    timestamp: 0,
  })
  const [cleaning, setCleaning] = useState(false)
  const [lastClean, setLastClean] = useState<CleanResult | null>(null)

  // ── Auth gate listeners ─────────────────────────────────────────────
  useEffect(() => {
    const offSuccess = onIpc({
      channel: "ramclear:auth:success",
      listener: () => {
        setGate({ loading: false, authenticated: true, waiting: false, error: null })
      },
    })

    const offError = onIpc({
      channel: "ramclear:auth:error",
      listener: (payload: { message?: string }) => {
        setGate((prev) => ({
          ...prev,
          loading: false,
          authenticated: false,
          waiting: false,
          error: payload?.message || "Xác thực RamClear bị lỗi rồi.",
        }))
      },
    })

    return () => {
      offSuccess()
      offError()
    }
  }, [])

  // ── Check session on mount ──────────────────────────────────────────
  useEffect(() => {
    let alive = true

    async function load() {
      try {
        const auth = await invoke({ channel: "ramclear:auth:getSession", payload: null })
        if (!alive) return
        setGate({
          loading: false,
          authenticated: !!(auth as any)?.authenticated,
          waiting: false,
          error: null,
        })
      } catch {
        if (!alive) return
        setGate({ loading: false, authenticated: false, waiting: false, error: null })
      }
    }

    void load()
    return () => { alive = false }
  }, [])

  // ── Subscribe to RAM stats only when authenticated ──────────────────
  useEffect(() => {
    if (!gate.authenticated) return

    sendIpc({ channel: "ramclear:subscribe", payload: null })

    const off = onIpc({
      channel: "ramclear:stats:update",
      listener: (data: RamStats) => {
        if (data && typeof data.totalMb === "number") {
          setStats(data)
        }
      },
    })

    // Immediate snapshot
    invoke({ channel: "ramclear:stats", payload: null })
      .then((data: unknown) => {
        const d = data as RamStats
        if (d && typeof d.totalMb === "number") setStats(d)
      })
      .catch(() => { })

    return () => {
      off()
      sendIpc({ channel: "ramclear:unsubscribe", payload: null })
    }
  }, [gate.authenticated])

  // ── Auth actions ────────────────────────────────────────────────────
  const loginLevel10 = async () => {
    setGate((prev) => ({ ...prev, waiting: true, error: null }))
    try {
      await invoke({ channel: "ramclear:auth:loginWithDiscord", payload: null })
    } catch {
      setGate((prev) => ({
        ...prev,
        waiting: false,
        error: "Không mở được màn đăng nhập Discord.",
      }))
    }
  }

  const exitPage = async () => {
    await invoke({ channel: "ramclear:auth:logout", payload: null }).catch(() => { })
    setGate({ loading: false, authenticated: false, waiting: false, error: null })
    navigate("/")
  }

  // ── Clean action ────────────────────────────────────────────────────
  const handleClean = useCallback(async () => {
    if (cleaning) return
    setCleaning(true)
    try {
      const result = (await invoke({
        channel: "ramclear:clean",
        payload: null,
      })) as CleanResult

      if (result?.success) {
        setLastClean(result)
        toast.success(
          `Đã giải phóng ${result.freedMb ?? 0} MB RAM (${result.processCount ?? 0} tiến trình).`
        )
        // Refresh stats after clean
        const fresh = (await invoke({
          channel: "ramclear:stats",
          payload: null,
        })) as RamStats
        if (fresh && typeof fresh.totalMb === "number") setStats(fresh)
      } else {
        toast.error(result?.error || "Dọn RAM thất bại.")
      }
    } catch (err: any) {
      toast.error(err?.message || "Dọn RAM thất bại.")
    } finally {
      setCleaning(false)
    }
  }, [cleaning])

  // ── Render: Loading ─────────────────────────────────────────────────
  if (gate.loading) {
    return (
      <RootDiv>
        <div className="h-full flex items-center justify-center text-white/60 text-sm">
          Đang check quyền RamClear...
        </div>
      </RootDiv>
    )
  }

  // ── Render: Login gate ──────────────────────────────────────────────
  if (!gate.authenticated) {
    return (
      <RootDiv>
        <div className="h-full flex items-center justify-center px-6">
          <div className="w-full max-w-md rounded-xl border border-white/10 bg-[#0A0A0C] p-6 shadow-[0_18px_50px_rgba(0,0,0,0.45)]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center">
                <MemoryStick size={20} className="text-cyan-300" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-white">VieXF — RamClear</h1>
                <p className="text-xs text-white/45">
                  Cần role Level 10 trên Discord mới mở khóa.
                </p>
              </div>
            </div>

            <p className="text-sm text-white/60 leading-relaxed">
              Đăng nhập Discord thêm một lần để xác nhận quyền. Đủ role Level 10 là vào thẳng, không vòng vo.
            </p>

            {gate.error && (
              <div className="mt-4 rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                {gate.error}
              </div>
            )}

            <div className="mt-5 flex items-center gap-2">
              <button
                type="button"
                onClick={loginLevel10}
                disabled={gate.waiting}
                className="h-10 px-4 rounded-lg border border-cyan-400/45 bg-cyan-400/20 text-sm font-medium text-white hover:bg-cyan-400/30 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {gate.waiting ? "Đang chờ..." : "Đăng nhập Level 10"}
              </button>
              <button
                type="button"
                onClick={() => navigate("/")}
                className="h-10 px-4 rounded-lg border border-white/10 text-sm font-medium text-white/70 hover:text-white hover:bg-white/5"
              >
                Thoát
              </button>
            </div>
          </div>
        </div>
      </RootDiv>
    )
  }

  // ── Render: Authenticated content ───────────────────────────────────
  const { totalMb, activeMb, standbyMb, freeMb, usagePercent } = stats

  const activePercent =
    totalMb > 0 ? Math.round((activeMb / totalMb) * 100) : 0
  const standbyPercent =
    totalMb > 0 ? Math.round((standbyMb / totalMb) * 100) : 0

  return (
    <RootDiv>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="h-16 px-6 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3">
            <MemoryStick
              size={20}
              className={
                usagePercent > 80 ? "text-red-300" : "text-cyan-300"
              }
            />
            <div>
              <h1 className="text-lg font-semibold text-white">
                VieXF — RamClear
              </h1>
              <p className="text-xs text-white/45">
                Dọn dẹp RAM cache, giải phóng bộ nhớ không giật lag.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={exitPage}
            className="h-9 px-3 rounded-lg border border-white/10 text-sm text-white/70 hover:text-white hover:bg-white/5 inline-flex items-center gap-2"
          >
            <LogOut size={15} />
            Thoát
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Usage bar */}
          <div className="max-w-2xl mx-auto mb-6">
            <UsageBar
              percent={usagePercent}
              activePercent={activePercent}
              standbyPercent={standbyPercent}
            />
          </div>

          {/* Stat panels */}
          <div className="max-w-2xl mx-auto flex flex-wrap gap-3 mb-6">
            <StatPanel
              label="Tổng RAM"
              valueMb={totalMb}
              color="#94a3b8"
              subtext="Total"
            />
            <StatPanel
              label="Đang dùng"
              valueMb={activeMb}
              color="#3b82f6"
              subtext="Active"
            />
            <StatPanel
              label="Cache"
              valueMb={standbyMb}
              color="#8b5cf6"
              subtext="Standby"
            />
            <StatPanel
              label="Trống"
              valueMb={freeMb}
              color={freeMb < 500 ? "#ef4444" : "#10b981"}
              subtext="Free"
            />
          </div>

          {/* Clean button */}
          <div className="max-w-2xl mx-auto flex flex-col items-center gap-4">
            <button
              type="button"
              onClick={handleClean}
              disabled={cleaning}
              className={[
                "h-12 px-8 rounded-lg border text-sm font-semibold flex items-center gap-2",
                "disabled:opacity-60 disabled:cursor-not-allowed",
                cleaning
                  ? "bg-white/5 border-white/10 text-white/50"
                  : "bg-cyan-500/15 border-cyan-400/35 text-cyan-100 hover:bg-cyan-500/25",
              ].join(" ")}
            >
              {cleaning ? (
                <>
                  <RefreshCw size={16} className="text-white/40" />
                  Đang dọn...
                </>
              ) : (
                <>
                  <Trash2 size={16} />
                  Dọn dẹp RAM
                </>
              )}
            </button>

            {/* Last clean result */}
            {lastClean && lastClean.success && (
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-2.5 text-sm text-emerald-200 text-center">
                Đã giải phóng{" "}
                <span className="font-bold">
                  {lastClean.freedMb ?? 0} MB
                </span>{" "}
                · {lastClean.processCount ?? 0} tiến trình
                {lastClean.standbyPurged ? " · Standby List đã xóa" : ""}
              </div>
            )}

            {/* Info text */}
            <p className="text-xs text-white/35 text-center max-w-md leading-relaxed">
              VieXF - RamClear được phát triển bởi <span className="text-cyan-500">VieX Digital</span> | Dành cho những người cần dọn dẹp ram một cách an toàn và cực mạnh
            </p>
          </div>
        </div>
      </div>
    </RootDiv>
  )
}
