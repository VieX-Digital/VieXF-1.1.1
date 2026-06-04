import { useEffect, useState, useCallback, memo, useRef } from "react"
import { useNavigate } from "react-router-dom"
import RootDiv from "@/components/rootdiv"
import { invoke, sendIpc, onIpc } from "@/lib/electron"
import { toast } from "react-toastify"
import { MemoryStick, Trash2, RefreshCw, LogOut, Lock, Sparkles } from "lucide-react"
import useAuthStore from "@/store/authStore"


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
  const barColor = percent > 90 ? "#ef4444" : percent > 70 ? "#f59e0b" : "#10b981"

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
          error: payload?.message || "Xác thực RamClear bị lỗi rồi anh em ơi, check lại xem sao nhé!",
        }))
      },
    })

    const offGlobalSuccess = onIpc({
      channel: "auth:success",
      listener: (user) => {
        setVerifying(false)
        useAuthStore.getState().setAuthenticated(user)
        toast.success(
          "🔥 Xác thực tài khoản thành công! Đã mở khóa tính năng VieXF RFM, mượt mà tối ưu tận nóc nha anh em!",
        )
      },
    })

    const offGlobalError = onIpc({
      channel: "auth:error",
      listener: (payload: { message?: string }) => {
        setVerifying(false)
        toast.error(`❌ Xác thực thất bại rồi anh em: ${payload?.message || "Lỗi không xác định, chê nha!"}`)
      },
    })

    return () => {
      offSuccess()
      offError()
      offGlobalSuccess()
      offGlobalError()
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
    return () => {
      alive = false
    }
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
      .catch(() => {})

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
    await invoke({ channel: "ramclear:auth:logout", payload: null }).catch(() => {})
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
          `🔥 Bay màu ${result.freedMb ?? 0} MB RAM rác (${result.processCount ?? 0} tiến trình) rồi nhé, mượt mà chuẩn bài luôn!`,
        )
        // Refresh stats after clean
        const fresh = (await invoke({
          channel: "ramclear:stats",
          payload: null,
        })) as RamStats
        if (fresh && typeof fresh.totalMb === "number") setStats(fresh)
      } else {
        toast.error(result?.error || "Dọn RAM xịt rồi anh em ơi, cay thế nhờ!")
      }
    } catch (err: any) {
      toast.error(err?.message || "Dọn RAM xịt rồi anh em ơi, cay thế nhờ!")
    } finally {
      setCleaning(false)
    }
  }, [cleaning])

  // ── VieXF RFM Setup ────────────────────────────────────────────────────────
  const { user, isAuthenticated } = useAuthStore()
  const hasRfmRole = (isAuthenticated && user?.roles?.includes("1493244398459424909")) || false

  const [rfmEnabled, setRfmEnabled] = useState(() => {
    return localStorage.getItem("viexf:rfm:enabled") === "true"
  })
  const [rfmThreshold, setRfmThreshold] = useState(() => {
    return Number(localStorage.getItem("viexf:rfm:threshold") || "80")
  })
  const [verifying, setVerifying] = useState(false)
  const lastTriggerTime = useRef<number>(0)

  useEffect(() => {
    localStorage.setItem("viexf:rfm:enabled", rfmEnabled ? "true" : "false")
  }, [rfmEnabled])

  useEffect(() => {
    localStorage.setItem("viexf:rfm:threshold", String(rfmThreshold))
  }, [rfmThreshold])

  // Trigger function
  const triggerRfmOptimization = useCallback(async () => {
    try {
      toast.info(
        "🚨 RAM chạm ngưỡng rồi, VieXF RFM đang kích hoạt chế độ siêu tốc, anh em bình tĩnh...",
      )
      const res = (await invoke({ channel: "ramclear:rfm-optimize", payload: null })) as any
      if (res?.success) {
        toast.success(
          "🔥 VieXF RFM đã quét Standby List & cố định Timer Resolution 0.5ms cực mượt, out trình lag luôn nha anh em!",
        )
      } else {
        toast.error(
          "❌ RFM tối ưu hóa thất bại rồi anh em ơi: " + (res?.error || "Lỗi không xác định"),
        )
      }
    } catch (err: any) {
      toast.error("❌ Lỗi kích hoạt RFM: " + (err?.message || err))
    }
  }, [])

  // Poll RAM and auto trigger using local stats.usagePercent (prevents system-metrics sub on this page!)
  useEffect(() => {
    if (!rfmEnabled || !hasRfmRole) return

    const now = Date.now()
    if (stats.usagePercent >= rfmThreshold && now - lastTriggerTime.current > 60000) {
      lastTriggerTime.current = now
      triggerRfmOptimization()
    }
  }, [stats.usagePercent, rfmEnabled, rfmThreshold, hasRfmRole, triggerRfmOptimization])

  const handleRfmToggle = async (enabled: boolean) => {
    setRfmEnabled(enabled)
    if (enabled && hasRfmRole) {
      await triggerRfmOptimization()
    }
  }

  const handleReLoginVerify = async () => {
    setVerifying(true)
    try {
      await invoke({ channel: "auth:loginWithDiscord", payload: null })
    } catch (err) {
      toast.error("❌ Không thể khởi động đăng nhập Discord rồi, kiểm tra lại xem sao nhé anh em!")
      setVerifying(false)
    }
  }

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
                <p className="text-xs text-white/45">Cần role Level 10 trên Discord mới mở khóa.</p>
              </div>
            </div>

            <p className="text-sm text-white/60 leading-relaxed">
              Đăng nhập Discord thêm một lần để xác nhận quyền. Đủ role Level 10 là vào thẳng, không
              vòng vo.
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

  const activePercent = totalMb > 0 ? Math.round((activeMb / totalMb) * 100) : 0
  const standbyPercent = totalMb > 0 ? Math.round((standbyMb / totalMb) * 100) : 0

  return (
    <RootDiv>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="h-16 px-6 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3">
            <MemoryStick
              size={20}
              className={usagePercent > 80 ? "text-red-300" : "text-cyan-300"}
            />
            <div>
              <h1 className="text-lg font-semibold text-white">VieXF — RamClear</h1>
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
            <StatPanel label="Tổng RAM" valueMb={totalMb} color="#94a3b8" subtext="Total" />
            <StatPanel label="Đang dùng" valueMb={activeMb} color="#3b82f6" subtext="Active" />
            <StatPanel label="Cache" valueMb={standbyMb} color="#8b5cf6" subtext="Standby" />
            <StatPanel
              label="Trống"
              valueMb={freeMb}
              color={freeMb < 500 ? "#ef4444" : "#10b981"}
              subtext="Free"
            />
          </div>

          {/* VieXF RFM Panel */}
          <div
            onClick={(e) => {
              if (!hasRfmRole) {
                const isReLogin = (e.target as HTMLElement).closest(".relogin-btn")
                if (!isReLogin) {
                  toast.error(
                    "🚨 Tài khoản của bạn chưa có role Level 20 trên Discord để dùng tính năng này!",
                  )
                }
              }
            }}
            className={`max-w-2xl mx-auto mb-6 rounded-xl border border-white/10 bg-[#070709] p-5 relative overflow-hidden ${
              !hasRfmRole ? "cursor-pointer" : ""
            }`}
          >
            {/* Glow background */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5">
              <div className="flex items-center gap-2">
                {!hasRfmRole ? (
                  <Lock size={18} className="text-red-400 animate-pulse" />
                ) : (
                  <Sparkles size={18} className="text-purple-400 animate-pulse" />
                )}
                <div>
                  <h3 className="text-sm font-bold text-white tracking-wide uppercase">
                    VieXF RFM (Pro Memory Optimizer)
                  </h3>
                  <p className="text-[10px] text-white/40">
                    Tự động dọn Standby List & Ghim trễ Timer Resolution 0.5ms cực hạn
                  </p>
                </div>
              </div>
              {hasRfmRole ? (
                <span className="text-[10px] font-semibold text-purple-300 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-full select-none">
                  RFM UNLOCKED
                </span>
              ) : (
                <span className="text-[10px] font-semibold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full inline-flex items-center gap-1 select-none">
                  <Lock size={10} />
                  LOCKED
                </span>
              )}
            </div>

            {!hasRfmRole ? (
              /* Locked State UI */
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-3">
                  <Lock size={20} className="text-red-400 animate-pulse" />
                </div>
                <h4 className="text-sm font-bold text-white/80 mb-1">Tính Năng Bị Khóa (LOCKED)</h4>
                <p className="text-xs text-white/45 max-w-md leading-relaxed mb-4">
                  Anh em cần role Level 20{" "}
                  <span className="text-purple-400 font-semibold">LEVEL 20</span> trên
                  server Discord VieX để mở khóa tối ưu Timer Resolution 0.5ms và Standby List. Xác
                  thực lại nhận quyền Level 20 để tối ưu tận nóc nhé!
                </p>
                <button
                  type="button"
                  onClick={handleReLoginVerify}
                  disabled={verifying}
                  className="relogin-btn h-10 px-5 rounded-lg border border-purple-500/40 bg-purple-500/15 text-xs font-semibold text-purple-200 hover:bg-purple-500/25 transition-all duration-300 active:scale-95 disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {verifying ? (
                    <>
                      <RefreshCw size={14} className="animate-spin text-purple-400" />
                      Đang xác thực...
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} />
                      Re-Login to Verify
                    </>
                  )}
                </button>
              </div>
            ) : (
              /* Unlocked State Controls */
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-white/80">Kích hoạt VieXF RFM</span>
                    <span className="text-[10px] text-white/40">
                      Tự động tối ưu khi RAM đạt ngưỡng chỉ định
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rfmEnabled}
                      onChange={(e) => handleRfmToggle(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-white/10 rounded-full peer peer-focus:ring-0 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white/40 after:border-white/10 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600 peer-checked:after:bg-white transition-colors"></div>
                  </label>
                </div>

                <div
                  className={`space-y-2 transition-all duration-300 ${!rfmEnabled ? "opacity-40 pointer-events-none" : ""}`}
                >
                  <div className="flex justify-between text-xs text-white/60">
                    <span>Ngưỡng RAM tự kích hoạt:</span>
                    <span className="font-bold text-purple-300">{rfmThreshold}%</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="95"
                    value={rfmThreshold}
                    disabled={!rfmEnabled}
                    onChange={(e) => setRfmThreshold(Number(e.target.value))}
                    className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-500"
                  />
                  <div className="text-[10px] text-white/35 leading-relaxed">
                    Hệ thống sẽ liên tục dọn Cache Standby & ghim Timer Resolution ở 0.5ms khi RAM
                    vượt quá {rfmThreshold}%. Thời gian giãn cách giữa các lần dọn là 60 giây để
                    tránh spam hệ thống.
                  </div>
                </div>
              </div>
            )}
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
                Đã giải phóng <span className="font-bold">{lastClean.freedMb ?? 0} MB</span> ·{" "}
                {lastClean.processCount ?? 0} tiến trình
                {lastClean.standbyPurged ? " · Standby List đã xóa" : ""}
              </div>
            )}

            {/* Info text */}
            <p className="text-xs text-white/35 text-center max-w-md leading-relaxed">
              VieXF - RamClear được phát triển bởi{" "}
              <span className="text-cyan-500">VieX Digital</span> | Dành cho những người cần dọn dẹp
              ram một cách an toàn và cực mạnh
            </p>
          </div>
        </div>
      </div>
    </RootDiv>
  )
}
