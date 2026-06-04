import PageShell from "@/components/ui/page-shell"
import Button from "@/components/ui/button"
import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { invoke } from "@/lib/electron"
import { toast } from "@/lib/toast"

type HistoryEntry = {
  id: string
  timestamp: number
  tweakId: string
  action: "apply" | "unapply"
  status: "applied" | "reverted" | "failed"
  category?: string
  riskLevel?: "low" | "medium" | "high"
  duration?: number
  error?: string
}

export default function Recovery() {
  const { t } = useTranslation()
  const [restorePoints, setRestorePoints] = useState<any[]>([])
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [busy, setBusy] = useState(false)
  const [safeMode, setSafeMode] = useState(localStorage.getItem("vie:safe-mode") === "true")

  const applied = useMemo(() => {
    const seen = new Map<string, HistoryEntry>()
    for (const item of history) {
      if (!item.tweakId || seen.has(item.tweakId)) continue
      seen.set(item.tweakId, item)
    }
    return [...seen.values()].filter((x) => x.status === "applied")
  }, [history])

  const loadAll = async () => {
    const [points, logs] = await Promise.all([
      invoke({ channel: "get-restore-points", payload: null }).catch(() => ({ points: [] })),
      invoke({ channel: "tweak:history", payload: null }).catch(() => []),
    ])
    setRestorePoints(Array.isArray(points?.points) ? points.points : [])
    setHistory(Array.isArray(logs) ? logs : [])
  }

  useEffect(() => {
    void loadAll()
  }, [])

  const createSnapshot = async () => {
    setBusy(true)
    try {
      const res = await invoke({ channel: "create-restore-point", payload: "RecoveryCenter" })
      if (res?.success || res?.ok) {
        toast.success(t("recovery.toast_snapshot_ok"))
        await loadAll()
      } else toast.error(res?.error || t("recovery.toast_snapshot_fail"))
    } finally {
      setBusy(false)
    }
  }

  const restoreLatest = async () => {
    if (restorePoints.length === 0) return
    setBusy(true)
    try {
      const latest = restorePoints[0]
      const res = await invoke({ channel: "restore-restore-point", payload: latest.SequenceNumber })
      if (res?.success || res?.ok) toast.info(t("recovery.toast_restore_sent"))
      else toast.error(res?.error || t("recovery.toast_restore_fail"))
    } finally {
      setBusy(false)
    }
  }

  const restoreTweaks = async () => {
    if (applied.length === 0) return
    setBusy(true)
    const id = toast.loading(`Đang khôi phục ${applied.length} tweak...`)
    try {
      const res = await invoke({ channel: "tweak:restore-applied", payload: null })
      const ok = res?.success || res?.ok
      toast.update(id, {
        render: ok ? "Đã khôi phục tweak đã áp dụng." : "Một số tweak khôi phục thất bại.",
        type: ok ? "success" : "error",
        isLoading: false,
      })
      await loadAll()
    } catch (e: any) {
      toast.update(id, {
        render: e?.message || "Khôi phục tweak thất bại.",
        type: "error",
        isLoading: false,
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <PageShell title={t("recovery.title")} subtitle={t("recovery.subtitle")}>
      <div className="grid grid-cols-1 xl:grid-cols-[0.9fr_1.1fr] gap-4">
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-[#0F0F10] p-5 shadow-[0_12px_36px_rgba(0,0,0,0.28)]">
            <h3 className="text-white font-medium">{t("recovery.snapshot_title")}</h3>
            <p className="text-sm text-white/60 mt-1">
              {t("recovery.snapshot_desc", { count: restorePoints.length })}
            </p>
            <div className="mt-4 flex gap-2 flex-wrap">
              <Button
                variant="secondary"
                onClick={restoreLatest}
                disabled={busy || restorePoints.length === 0}
              >
                {t("recovery.restore_latest")}
              </Button>
              <Button variant="primary" onClick={createSnapshot} disabled={busy}>
                {t("recovery.create_snapshot")}
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0F0F10] p-5">
            <h3 className="text-white font-medium">Tự động khôi phục tweak đã dùng</h3>
            <p className="text-sm text-white/60 mt-1">
              Phát hiện {applied.length} tweak đang ở trạng thái applied từ history.
            </p>
            <Button
              className="mt-4"
              variant="danger"
              onClick={restoreTweaks}
              disabled={busy || applied.length === 0}
            >
              Khôi phục tất cả tweak đã apply
            </Button>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0F0F10] p-5">
            <h3 className="text-white font-medium">{t("recovery.safe_title")}</h3>
            <p className="text-sm text-white/60 mt-1">{t("recovery.safe_desc")}</p>
            <Button
              className="mt-4"
              variant={safeMode ? "secondary" : "danger"}
              onClick={() => {
                const next = !safeMode
                setSafeMode(next)
                localStorage.setItem("vie:safe-mode", String(next))
                toast.info(next ? t("recovery.toast_safe_on") : t("recovery.toast_safe_off"))
              }}
            >
              {safeMode ? t("recovery.safe_disable") : t("recovery.safe_enable")}
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0F0F10] p-5 min-h-[420px]">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-white font-medium">Tweak history</h3>
              <p className="text-xs text-white/45">
                applied / reverted / failed, timestamp, category, risk
              </p>
            </div>
            <Button variant="secondary" onClick={loadAll} disabled={busy}>
              Refresh
            </Button>
          </div>
          <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
            {history.length === 0 ? (
              <div className="text-sm text-white/45 py-8 text-center">Chưa có tweak history.</div>
            ) : (
              history.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-white/5 bg-white/[0.025] p-3 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="text-sm text-white/90 truncate">{item.tweakId}</div>
                    <div className="text-xs text-white/40 truncate">
                      {new Date(item.timestamp).toLocaleString()} • {item.category || "unknown"} •{" "}
                      {item.duration ?? 0}ms
                    </div>
                    {item.error ? (
                      <div className="text-xs text-red-300/80 truncate mt-1">{item.error}</div>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`px-2 py-1 rounded-lg text-[10px] uppercase border ${item.riskLevel === "high" ? "text-red-300 border-red-500/20 bg-red-500/10" : item.riskLevel === "medium" ? "text-amber-300 border-amber-500/20 bg-amber-500/10" : "text-emerald-300 border-emerald-500/20 bg-emerald-500/10"}`}
                    >
                      {item.riskLevel || "low"}
                    </span>
                    <span
                      className={`px-2 py-1 rounded-lg text-[10px] uppercase border ${item.status === "failed" ? "text-red-300 border-red-500/20" : item.status === "applied" ? "text-cyan-300 border-cyan-500/20" : "text-white/60 border-white/10"}`}
                    >
                      {item.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </PageShell>
  )
}
