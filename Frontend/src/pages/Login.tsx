import { useEffect, useState, useRef } from "react"
import useAuthStore from "@/store/authStore"
import { invoke, onIpc, sendIpc } from "@/lib/electron"
import { AnimatePresence, motion } from "framer-motion"
import { hoverPresets, variants } from "@/lib/animations"
import { useAdaptiveMotion } from "@/lib/performance"
import logoImage from "../../Wallpaper/Frame 107.png"
import heroImage from "../../Wallpaper/ChatGPT Image 16_30_55 11 thg 5, 2026.png"

export default function Login({ onLoginSuccess }: { onLoginSuccess?: () => void }) {
  const { isLoading, error, setLoading, setError } = useAuthStore()
  const [waiting, setWaiting] = useState(false)
  const { disableNonEssentialEffects } = useAdaptiveMotion()
  const containerRef = useRef<HTMLDivElement>(null)

  // Stable references for callbacks to avoid constantly unregistering/re-registering IPC
  const onLoginSuccessRef = useRef(onLoginSuccess)
  const setErrorRef = useRef(setError)

  useEffect(() => {
    onLoginSuccessRef.current = onLoginSuccess
  }, [onLoginSuccess])

  useEffect(() => {
    setErrorRef.current = setError
  }, [setError])

  const logDebug = (msg: string) => {
    try {
      sendIpc({ channel: "auth:debug", payload: `[renderer] ${msg}` })
    } catch (e) {
      console.error("[auth:debug]", msg, e)
    }
  }

  useEffect(() => {
    logDebug("Login component mounted, registering IPC listeners")
    
    const offSuccess = onIpc({
      channel: "auth:success",
      listener: (user) => {
        logDebug(`Received auth:success event: ${JSON.stringify(user)}`)
        setWaiting(false)
        useAuthStore.getState().setAuthenticated(user)
        logDebug("Calling onLoginSuccess callback")
        onLoginSuccessRef.current?.()
      },
    })
    const offError = onIpc({
      channel: "auth:error",
      listener: (payload: { message: string }) => {
        logDebug(`Received auth:error event: ${JSON.stringify(payload)}`)
        setWaiting(false)
        setErrorRef.current?.(payload?.message || "Xác thực thất bại.")
      },
    })
    return () => {
      logDebug("Login component unmounting/cleaning up IPC listeners")
      offSuccess()
      offError()
    }
  }, [])

  useEffect(() => {
    logDebug("getSession: checking active session on mount")
    invoke({ channel: "auth:getSession", payload: null })
      .then((res: any) => {
        logDebug(`getSession response: ${JSON.stringify(res)}`)
        if (res?.authenticated && res?.user) {
          useAuthStore.getState().setAuthenticated(res.user)
          onLoginSuccessRef.current?.()
        } else {
          setLoading(false)
        }
      })
      .catch((err: any) => {
        logDebug(`getSession failed: ${err?.message || err}`)
        setLoading(false)
      })
  }, [setLoading])

  useEffect(() => {
    const container = containerRef.current
    if (!container || disableNonEssentialEffects) return

    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e
      const { innerWidth, innerHeight } = window

      const x = clientX / innerWidth - 0.5
      const y = clientY / innerHeight - 0.5

      container.style.setProperty("--mx", x.toFixed(4))
      container.style.setProperty("--my", y.toFixed(4))
    }

    window.addEventListener("mousemove", handleMouseMove, { passive: true })
    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
    }
  }, [disableNonEssentialEffects])

  const handleLogin = async () => {
    logDebug("handleLogin: starting Discord login flow")
    setError(null)
    setWaiting(true)
    try {
      await invoke({ channel: "auth:loginWithDiscord", payload: null })
      logDebug("handleLogin: auth:loginWithDiscord invoked successfully")
    } catch (err: any) {
      logDebug(`handleLogin: failed to invoke login - ${err?.message || err}`)
      setWaiting(false)
      setError("Không thể mở trình duyệt để xác thực.")
    }
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-zinc-950 text-white select-none">
        <div className="flex flex-col items-center gap-5">
          <motion.img
            src={logoImage}
            alt="VieXF"
            className="max-w-[160px] w-full select-none pointer-events-none"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: [0.3, 1, 0.3], scale: [0.98, 1.01, 0.98] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
          <p className="text-[10px] tracking-[0.25em] uppercase text-zinc-500 font-semibold">
            Đang kiểm tra phiên đăng nhập
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[9999] flex overflow-hidden bg-zinc-950 text-white select-none"
    >
      <style>{`
        /* Metallic shimmer text */
        @keyframes metallicSweep {
          0% {
            background-position: -200% center;
          }
          100% {
            background-position: 200% center;
          }
        }
        .shimmer-text {
          background: linear-gradient(
            90deg,
            #94a3b8 0%,
            #cbd5e1 25%,
            #ffffff 50%,
            #cbd5e1 75%,
            #94a3b8 100%
          );
          background-size: 200% auto;
          color: transparent;
          -webkit-background-clip: text;
          background-clip: text;
          animation: metallicSweep 6s ease-in-out infinite;
          display: inline-block;
        }

        /* Logo pulse breathing */
        @keyframes logoPulse {
          0%, 100% {
            transform: scale(1) translate3d(0, 0, 0);
          }
          50% {
            transform: scale(1.015) translate3d(0, 0, 0);
          }
        }
        .logo-pulse {
          animation: logoPulse 6s ease-in-out infinite;
        }

        /* Ambient glows breathing */
        @keyframes glowBreathe1 {
          0%, 100% {
            transform: scale(1) translate3d(0, 0, 0);
            opacity: 0.18;
          }
          50% {
            transform: scale(1.04) translate3d(8px, -4px, 0);
            opacity: 0.28;
          }
        }
        .glow-breathe-1 {
          animation: glowBreathe1 10s ease-in-out infinite;
        }

        @keyframes glowBreathe2 {
          0%, 100% {
            transform: scale(1) translate3d(0, 0, 0);
            opacity: 0.12;
          }
          50% {
            transform: scale(1.06) translate3d(-6px, 6px, 0);
            opacity: 0.22;
          }
        }
        .glow-breathe-2 {
          animation: glowBreathe2 12s ease-in-out infinite;
        }

        /* Parallax layer performance rules */
        .parallax-layer {
          transition: transform 0.45s cubic-bezier(0.16, 1, 0.3, 1);
          will-change: transform;
        }
      `}</style>

      {/* Ambient background glows for the overall page */}
      <div className="pointer-events-none absolute inset-0 contain-paint z-0">
        {!disableNonEssentialEffects && (
          <>
            <div className="absolute left-[200px] top-[-24%] h-[52%] w-[42%] rounded-full bg-[radial-gradient(ellipse_at_center,_#5865F21f,_transparent_70%)] glow-breathe-1" />
            <div className="absolute bottom-[-14%] right-[-8%] h-[46%] w-[42%] rounded-full bg-[radial-gradient(ellipse_at_center,_#10b98114,_transparent_70%)] glow-breathe-2" />
          </>
        )}
        <div className="absolute inset-0 opacity-[0.025] bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:64px_64px]" />
      </div>

      <motion.aside
        variants={variants.listStagger}
        initial="hidden"
        animate="show"
        className="relative z-10 flex h-full w-full max-w-[440px] flex-col justify-between border-r border-white/5 bg-[#09090b]/85 backdrop-blur-xl px-10 py-14 shadow-2xl shadow-black/50 will-change-[transform,opacity] transform-gpu"
      >
        {/* Subtle top accent gradient */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#5865F2]/40 to-transparent" />

        {/* Top/Middle container to push footer down */}
        <div className="flex-1 flex flex-col justify-center my-auto">
          {/* Logo Section */}
          <motion.div variants={variants.fadeUp} className="mb-8 flex justify-center">
            <img
              src={logoImage}
              alt="VieXF Logo"
              className="logo-pulse max-w-[170px] w-full transform-gpu select-none pointer-events-none"
            />
          </motion.div>

          {/* Welcome Text Section */}
          <motion.div variants={variants.fadeUp} className="mb-7 text-center">
            <span className="mb-2.5 inline-block text-[10px] font-semibold uppercase tracking-[0.3em] text-emerald-500 bg-emerald-500/5 border border-emerald-500/10 px-3 py-1 rounded-full select-none">
              VieXF Access
            </span>
            <h1 className="mb-2 text-4xl font-extrabold tracking-tight text-white select-none">
              <span className="shimmer-text">Welcome</span>
            </h1>
            <p className="text-sm leading-relaxed text-zinc-400 max-w-sm mx-auto select-none">
              Đăng nhập để kích hoạt cấu hình tối ưu và bắt đầu trải nghiệm mượt mà cùng VieXF.
            </p>
          </motion.div>

          {/* Access Card Section */}
          <motion.div
            variants={variants.fadeUp}
            className="mb-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-md p-5 text-sm leading-relaxed text-zinc-400 shadow-inner hover:border-white/[0.12] transition-colors duration-300"
          >
            <div className="flex gap-3.5 items-start">
              <svg
                className="h-5 w-5 text-emerald-500/80 shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
              <p className="text-xs leading-relaxed text-zinc-400 select-none">
                Chỉ thành viên chính thức của máy chủ{" "}
                <span className="font-semibold text-[#5865F2]">VieX</span> (đạt{" "}
                <span className="font-semibold text-emerald-500">Level 5 trở lên</span>) mới có
                quyền truy cập ứng dụng.
              </p>
            </div>
          </motion.div>

          {/* Error Message */}
          {error && (
            <motion.div
              variants={variants.fadeUp}
              className="mb-4 rounded-xl border border-red-500/20 bg-red-500/5 p-3.5 text-xs text-red-300 transition-all duration-300"
            >
              <div className="flex items-center gap-2.5">
                <svg
                  className="h-4 w-4 shrink-0 text-red-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l-1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="select-none">{error}</span>
              </div>
            </motion.div>
          )}

          {/* Button Section */}
          <motion.div variants={variants.fadeUp} className="space-y-3">
            <motion.button
              id="btn-discord-login"
              onClick={handleLogin}
              disabled={waiting}
              whileHover={
                waiting
                  ? undefined
                  : { y: -2, scale: 1.01, boxShadow: "0 8px 24px rgba(88, 101, 242, 0.3)" }
              }
              whileTap={waiting ? undefined : { scale: 0.98 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className="flex w-full items-center justify-center gap-3 rounded-xl bg-[#5865F2] py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#4752C4] disabled:cursor-not-allowed disabled:opacity-60 shadow-[0_4px_12px_rgba(88,101,242,0.15)] transform-gpu will-change-[transform,opacity]"
            >
              {waiting ? (
                <>
                  <Spinner className="h-4 w-4" />
                  Đang xử lý đăng nhập...
                </>
              ) : (
                <>
                  <DiscordLogo className="h-5 w-5" />
                  Đăng nhập bằng Discord
                </>
              )}
            </motion.button>
          </motion.div>

          {/* Waiting message below button */}
          <AnimatePresence>
            {waiting && (
              <motion.p
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
                className="mt-4 text-center text-xs leading-relaxed text-zinc-500 select-none"
              >
                Vui lòng hoàn tất xác thực trên trình duyệt để tiếp tục.
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom footer section */}
        <motion.div
          variants={variants.fadeUp}
          className="mt-8 border-t border-white/[0.04] pt-6 space-y-4"
        >
          <div className="flex items-start gap-2.5 text-xs text-zinc-500">
            <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border border-white/10 bg-zinc-800/30 mt-0.5 select-none">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            <p className="leading-relaxed select-none">
              Bằng việc tiếp tục, bạn đồng ý với{" "}
              <span className="cursor-pointer text-emerald-500 hover:text-emerald-400 transition-colors">
                Terms of Service
              </span>{" "}
              và{" "}
              <span className="cursor-pointer text-emerald-500 hover:text-emerald-400 transition-colors">
                Privacy Policy
              </span>
              .
            </p>
          </div>
          <p className="text-center text-[10px] leading-relaxed text-zinc-600 select-none">
            VieXF chỉ đọc thông tin cơ bản và vai trò trong server của bạn. Không đổi info, không
            đụng token, yên tâm nha.
          </p>
        </motion.div>
      </motion.aside>

      {/* Right side: 3D Parallax & Depth Ambient effects */}
      <main className="relative hidden flex-1 md:block overflow-hidden bg-[#030303]">
        {/* Layer 1: Grid Layer */}
        <div
          className="absolute inset-0 opacity-[0.025] bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:64px_64px] parallax-layer pointer-events-none"
          style={{
            transform: "translate3d(calc(var(--mx, 0) * -6px), calc(var(--my, 0) * -6px), 0)",
          }}
        />

        {/* Layer 2: Glow breathing circles */}
        {!disableNonEssentialEffects && (
          <>
            <div
              className="absolute left-[15%] top-[-10%] h-[70%] w-[60%] rounded-full bg-[radial-gradient(ellipse_at_center,_#5865F21a,_transparent_70%)] glow-breathe-1 parallax-layer pointer-events-none"
              style={{
                transform: "translate3d(calc(var(--mx, 0) * 10px), calc(var(--my, 0) * 10px), 0)",
              }}
            />
            <div
              className="absolute bottom-[-10%] right-[10%] h-[60%] w-[60%] rounded-full bg-[radial-gradient(ellipse_at_center,_#10b98110,_transparent_70%)] glow-breathe-2 parallax-layer pointer-events-none"
              style={{
                transform: "translate3d(calc(var(--mx, 0) * 14px), calc(var(--my, 0) * 14px), 0)",
              }}
            />
          </>
        )}

        {/* Layer 3: Ambient Fog / Vignette Overlays */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#09090b] via-transparent to-[#09090b]/30 pointer-events-none z-10" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#09090b]/10 via-transparent to-[#09090b]/60 pointer-events-none z-10" />

        {/* Layer 4: Hero Image */}
        <motion.img
          src={heroImage}
          alt="VieXF Hero"
          className="h-full w-full object-cover opacity-50 scale-[1.03] parallax-layer pointer-events-none select-none"
          style={{
            transform: "translate3d(calc(var(--mx, 0) * -10px), calc(var(--my, 0) * -10px), 0)",
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        />
      </main>
    </div>
  )
}

function DiscordLogo({ className, spinning }: { className?: string; spinning?: boolean }) {
  return (
    <svg
      className={className}
      style={spinning ? { animation: "spin 2s linear infinite" } : undefined}
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.031.054a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.074.074 0 0 0-.041-.104 13.201 13.201 0 0 1-1.872-.892.075.075 0 0 1-.008-.125c.126-.094.252-.192.372-.291a.075.075 0 0 1 .078-.01c3.927 1.793 8.18 1.793 12.062 0a.075.075 0 0 1 .079.009c.12.099.245.198.372.292a.075.075 0 0 1-.006.125 12.29 12.29 0 0 1-1.873.892.077.077 0 0 0-.041.105c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  )
}

function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      style={{ animation: "spin 1s linear infinite" }}
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  )
}
