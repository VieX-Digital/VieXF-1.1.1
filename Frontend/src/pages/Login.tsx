import { useEffect, useState } from "react"
import useAuthStore from "@/store/authStore"
import { invoke, onIpc } from "@/lib/electron"

export default function Login() {
  const { isLoading, error, setLoading, setError } = useAuthStore()
  const [waiting, setWaiting] = useState(false)

  useEffect(() => {
    const offSuccess = onIpc({
      channel: "auth:success",
      listener: (user) => {
        setWaiting(false)
        useAuthStore.getState().setAuthenticated(user)
      },
    })

    const offError = onIpc({
      channel: "auth:error",
      listener: (payload: { message: string }) => {
        setWaiting(false)
        setError(payload?.message || "Xác thực thất bại.")
      },
    })

    return () => {
      offSuccess()
      offError()
    }
  }, [setError])

  useEffect(() => {
    invoke({ channel: "auth:getSession", payload: null })
      .then((res: any) => {
        if (res?.authenticated && res?.user) {
          useAuthStore.getState().setAuthenticated(res.user)
        } else {
          setLoading(false)
        }
      })
      .catch(() => setLoading(false))
  }, [setLoading])

  const handleLogin = async () => {
    setError(null)
    setWaiting(true)
    try {
      await invoke({ channel: "auth:loginWithDiscord", payload: null })
    } catch {
      setWaiting(false)
      setError("Không thể mở trình duyệt để xác thực.")
    }
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#050505]">
        <div className="flex flex-col items-center gap-4">
          <DiscordLogo className="w-12 h-12 text-[#5865F2]" spinning />
          <p className="text-vie-text-muted text-sm">Đang kiểm tra phiên đăng nhập...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-[#050505]" />
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[radial-gradient(ellipse_at_center,_#5865F240,_transparent_70%)] blur-3xl" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-[radial-gradient(ellipse_at_center,_#8b5cf630,_transparent_70%)] blur-3xl" />
      <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:64px_64px]" />

      <div
        className="relative z-10 w-full max-w-md mx-4 rounded-2xl border border-vie-border overflow-hidden"
        style={{
          background: "rgba(10, 10, 14, 0.85)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          boxShadow: "0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)",
        }}
      >
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#5865F2] to-transparent opacity-60" />

        <div className="p-8 flex flex-col items-center gap-6">
          <div className="flex flex-col items-center gap-3">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #5865F2 0%, #7983f5 100%)",
                boxShadow: "0 8px 32px rgba(88,101,242,0.4)",
              }}
            >
              <DiscordLogo className="w-9 h-9 text-white" />
            </div>
            <div className="text-center">
              <h1 className="text-xl font-semibold text-vie-text font-display">VieXF</h1>
              <p className="text-vie-text-muted text-sm mt-0.5">Yêu cầu xác thực Discord</p>
            </div>
          </div>

          <div
            className="w-full rounded-xl p-4 border border-[rgba(88,101,242,0.25)] text-sm text-vie-text-muted leading-relaxed"
            style={{ background: "rgba(88,101,242,0.08)" }}
          >
            <p>
              Chỉ thành viên <span className="text-[#5865F2] font-medium">máy chủ VieX</span> có{" "}
              <span className="text-vie-primary font-medium">role Level 5 khi chat nhiều</span> mới được truy cập ứng dụng.
            </p>
          </div>

          {error && (
            <div
              className="w-full rounded-xl p-4 border border-[rgba(239,68,68,0.3)] text-sm text-red-400"
              style={{ background: "rgba(239,68,68,0.08)" }}
            >
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>{error}</span>
              </div>
            </div>
          )}

          <button
            id="btn-discord-login"
            onClick={handleLogin}
            disabled={waiting}
            className="w-full relative overflow-hidden rounded-xl py-3.5 px-6 text-white font-semibold text-sm flex items-center justify-center gap-3 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            style={{
              background: waiting
                ? "rgba(88,101,242,0.5)"
                : "linear-gradient(135deg, #5865F2 0%, #7983f5 100%)",
              boxShadow: waiting ? "none" : "0 4px 24px rgba(88,101,242,0.35)",
            }}
          >
            {waiting ? (
              <>
                <Spinner className="w-4 h-4" />
                Đang chờ xác thực...
              </>
            ) : (
              <>
                <DiscordLogo className="w-5 h-5" />
                Đăng nhập bằng Discord
              </>
            )}
          </button>

          {waiting && (
            <p className="text-xs text-vie-text-dim text-center leading-relaxed">
              Trình duyệt đã được mở. Vui lòng xác thực tài khoản Discord rồi quay lại đây.
            </p>
          )}

          <p className="text-xs text-vie-text-dim text-center">
            VieXF chỉ đọc thông tin cơ bản và vai trò trong server của bạn. Không thể thay đổi thông tin và đánh cắp token của bạn.
          </p>
        </div>
      </div>
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
