import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import RootDiv from "@/components/rootdiv"
import { invoke, onIpc } from "@/lib/electron"
import { toast } from "react-toastify"
import { Gamepad2, LogOut, Power } from "lucide-react"

type GameModeStatus = {
  success?: boolean
  active?: boolean
  processId?: number | null
  processName?: string | null
  cpuPercent?: number
  workingSetMb?: number
  error?: string
  reason?: string
}

type GateState = {
  loading: boolean
  authenticated: boolean
  waiting: boolean
  error: string | null
}

export default function Gamemode() {
  const navigate = useNavigate()
  const [gate, setGate] = useState<GateState>({
    loading: true,
    authenticated: false,
    waiting: false,
    error: null,
  })
  const [status, setStatus] = useState<GameModeStatus>({ active: false })
  const [busy, setBusy] = useState(false)
  const [showPreGameNotice, setShowPreGameNotice] = useState(false)
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)

  useEffect(() => {
    const offSuccess = onIpc({
      channel: "gamemode:auth:success",
      listener: () => {
        setGate({ loading: false, authenticated: true, waiting: false, error: null })
      },
    })

    const offError = onIpc({
      channel: "gamemode:auth:error",
      listener: (payload: { message?: string }) => {
        setGate((prev) => ({
          ...prev,
          loading: false,
          authenticated: false,
          waiting: false,
          error: payload?.message || "Xác thực Chế độ game bị lỗi rồi.",
        }))
      },
    })

    return () => {
      offSuccess()
      offError()
    }
  }, [])

  useEffect(() => {
    let alive = true

    async function load() {
      try {
        const [auth, nextStatus, adminCheck] = await Promise.all([
          invoke({ channel: "gamemode:auth:getSession", payload: null }),
          invoke({ channel: "game-mode:status", payload: null }).catch(() => ({ active: false })),
          invoke({ channel: "app:is-admin", payload: null }).catch(() => false),
        ])

        if (!alive) return
        setGate({
          loading: false,
          authenticated: !!auth?.authenticated,
          waiting: false,
          error: null,
        })
        setStatus(nextStatus || { active: false })
        setIsAdmin(!!adminCheck)
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

  const loginLevel15 = async () => {
    setGate((prev) => ({ ...prev, waiting: true, error: null }))
    try {
      await invoke({ channel: "gamemode:auth:loginWithDiscord", payload: null })
    } catch {
      setGate((prev) => ({
        ...prev,
        waiting: false,
        error: "Không mở được màn đăng nhập Discord.",
      }))
    }
  }

  const exitPage = async () => {
    setBusy(true)
    try {
      if (status.active) {
        await invoke({ channel: "game-mode:disable", payload: null })
      }
      await invoke({ channel: "gamemode:auth:logout", payload: null })
      setStatus({ active: false })
      setGate({ loading: false, authenticated: false, waiting: false, error: null })
      navigate("/")
    } catch {
      toast.error("Thoát Chế độ game chưa được, thử lại giúp mình.")
    } finally {
      setBusy(false)
    }
  }

  const runGameModeToggle = async () => {
    if (busy) return
    setBusy(true)
    try {
      const next = await invoke({
        channel: status.active ? "game-mode:disable" : "game-mode:enable",
        payload: null,
      })

      if (!next?.success) {
        const message =
          next?.reason === "no_game"
            ? "Chưa thấy game nào đang chạy. Vào game trước rồi bật lại nha."
            : next?.error || "Chế độ game đang dỗi, bật chưa được."
        toast.error(message)
        return
      }

      setStatus(next)
      toast.success(next.active ? "Đã bật Chế độ game, tập trung leo rank thôi." : "Đã tắt Chế độ game.")
    } catch (error: any) {
      toast.error(error?.message || "Chế độ game đang dỗi, thử lại sau nha.")
    } finally {
      setBusy(false)
    }
  }

  const toggleGameMode = async () => {
    if (busy) return
    if (!status.active) {
      setShowPreGameNotice(true)
      toast.info("Vào game trước rồi hãy bật Chế độ game nha.")
      return
    }

    await runGameModeToggle()
  }

  const confirmGameIsOpen = async () => {
    setShowPreGameNotice(false)
    await runGameModeToggle()
  }

  if (gate.loading) {
    return (
      <RootDiv>
        <div className="h-full flex items-center justify-center text-white/60 text-sm">Đang check quyền Chế độ game...</div>
      </RootDiv>
    )
  }

  if (!gate.authenticated) {
    return (
      <RootDiv>
        <div className="h-full flex items-center justify-center px-6">
          <div className="w-full max-w-md rounded-xl border border-white/10 bg-[#0A0A0C] p-6 shadow-[0_18px_50px_rgba(0,0,0,0.45)]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-[#5865F2]/15 border border-[#5865F2]/30 flex items-center justify-center">
                <Gamepad2 size={20} className="text-[#8ea0ff]" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-white">Chế độ game</h1>
                <p className="text-xs text-white/45">Cần role Level 15 trên Discord mới mở khóa.</p>
              </div>
            </div>

            <p className="text-sm text-white/60 leading-relaxed">
              Đăng nhập Discord thêm một lần để xác nhận quyền. Đủ role là vào thẳng, không vòng vo.
            </p>

            {gate.error && (
              <div className="mt-4 rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                {gate.error}
              </div>
            )}

            <div className="mt-5 flex items-center gap-2">
              <button
                type="button"
                onClick={loginLevel15}
                disabled={gate.waiting}
                className="h-10 px-4 rounded-lg border border-[#5865F2]/45 bg-[#5865F2]/20 text-sm font-medium text-white hover:bg-[#5865F2]/30 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {gate.waiting ? "Đang chờ..." : "Đăng nhập Level 15"}
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

  const active = !!status.active

  return (
    <RootDiv>
      <div className="relative h-full flex flex-col">
        <div className="h-16 px-6 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3">
            <Gamepad2 size={20} className={active ? "text-emerald-300" : "text-red-300"} />
            <div>
              <h1 className="text-lg font-semibold text-white">Chế độ game</h1>
              <p className="text-xs text-white/45">Vào game trước, rồi mới bật. Đừng bật chay.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={exitPage}
            disabled={busy}
            className="h-9 px-3 rounded-lg border border-white/10 text-sm text-white/70 hover:text-white hover:bg-white/5 disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2"
          >
            <LogOut size={15} />
            Thoát
          </button>
        </div>

        {!active && (
          <div className="px-6 pt-5 space-y-2">
            <div className="mx-auto max-w-xl rounded-xl border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
              Mở game lên trước rồi quay lại bấm nút. App sẽ tự bắt tiến trình đang gánh máy nhất để ưu tiên.
            </div>
            {isAdmin === false && (
              <div className="mx-auto max-w-xl rounded-xl border border-red-400/25 bg-red-400/10 px-4 py-3 text-sm text-red-200">
                App đang chạy không có quyền Admin. Một số game có thể không bị phát hiện. Hãy tắt app và mở lại bằng &quot;Run as Administrator&quot;.
              </div>
            )}
          </div>
        )}

        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <button
            type="button"
            onClick={toggleGameMode}
            disabled={busy}
            aria-pressed={active}
            className={[
              "w-48 h-48 rounded-full border flex flex-col items-center justify-center gap-3",
              "disabled:opacity-60 disabled:cursor-not-allowed",
              active
                ? "bg-emerald-500/10 border-emerald-300/70 text-emerald-100 shadow-[0_0_56px_rgba(16,185,129,0.45),inset_0_0_38px_rgba(16,185,129,0.12)]"
                : "bg-red-500/10 border-red-300/60 text-red-100 shadow-[0_0_48px_rgba(239,68,68,0.34),inset_0_0_32px_rgba(239,68,68,0.1)]",
            ].join(" ")}
          >
            <Power size={44} />
            <span className="text-2xl font-bold tracking-[0.18em]">{busy ? "CHỜ" : active ? "BẬT" : "TẮT"}</span>
          </button>

          <div className="mt-8 h-16 text-center">
            {active ? (
              <>
                <p className="text-sm text-emerald-200">
                  Đang ưu tiên {status.processName || "game"} {status.processId ? `#${status.processId}` : ""}
                </p>
                <p className="text-xs text-white/40 mt-1">Ưu tiên: Cao | Nguồn: max hiệu năng</p>
              </>
            ) : (
              <>
                <p className="text-sm text-white/60">Chế độ game đang tắt.</p>
                <p className="text-xs text-white/40 mt-1">Không thấy game thì nút sẽ không bật.</p>
              </>
            )}
          </div>
        </div>

        {showPreGameNotice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
            <div className="w-full max-w-sm rounded-xl border border-white/10 bg-[#0A0A0C] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.55)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg border border-cyan-400/30 bg-cyan-400/10 flex items-center justify-center">
                  <Gamepad2 size={20} className="text-cyan-200" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-white">Vào game trước đã</h2>
                  <p className="text-xs text-white/45">Bật khi game đang chạy mới chuẩn bài.</p>
                </div>
              </div>

              <p className="mt-4 text-sm text-white/65 leading-relaxed">
                Nếu chưa mở game, Chế độ game sẽ không biết ưu tiên tiến trình nào. Mở game, vào sảnh hoặc trận rồi quay lại bấm bật nha.
              </p>

              <div className="mt-5 flex items-center gap-2">
                <button
                  type="button"
                  onClick={confirmGameIsOpen}
                  disabled={busy}
                  className="h-10 flex-1 rounded-lg border border-cyan-400/35 bg-cyan-400/15 text-sm font-medium text-cyan-50 hover:bg-cyan-400/20 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  Vào game rồi, bật luôn
                </button>
                <button
                  type="button"
                  onClick={() => setShowPreGameNotice(false)}
                  disabled={busy}
                  className="h-10 px-3 rounded-lg border border-white/10 text-sm text-white/65 hover:text-white hover:bg-white/5 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  Để mình vào
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </RootDiv>
  )
}
