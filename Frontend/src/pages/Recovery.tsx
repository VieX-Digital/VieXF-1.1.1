import PageShell from "@/components/ui/page-shell"
import Button from "@/components/ui/button"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { invoke } from "@/lib/electron"
import { toast } from "react-toastify"

export default function Recovery() {
  const { t } = useTranslation()
  const [restorePoints, setRestorePoints] = useState([])
  const [busy, setBusy] = useState(false)
  const [safeMode, setSafeMode] = useState(localStorage.getItem("vie:safe-mode") === "true")

  const loadPoints = async () => {
    const res = await invoke({ channel: "get-restore-points", payload: null }).catch(() => ({ points: [] }))
    setRestorePoints(Array.isArray(res?.points) ? res.points : [])
  }

  useEffect(() => {
    void loadPoints()
  }, [])

  const createSnapshot = async () => {
    setBusy(true)
    try {
      const res = await invoke({ channel: "create-restore-point", payload: "RecoveryCenter" })
      if (res?.success) {
        toast.success(t("recovery.toast_snapshot_ok"))
        await loadPoints()
      } else {
        toast.error(res?.error || t("recovery.toast_snapshot_fail"))
      }
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
      if (res?.success) toast.info(t("recovery.toast_restore_sent"))
      else toast.error(res?.error || t("recovery.toast_restore_fail"))
    } finally {
      setBusy(false)
    }
  }

  return (
    <PageShell title={t("recovery.title")} subtitle={t("recovery.subtitle")}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-lg border border-white/10 bg-[#0F0F10] p-4">
          <h3 className="text-white font-medium">{t("recovery.snapshot_title")}</h3>
          <p className="text-sm text-white/60 mt-1">
            {t("recovery.snapshot_desc", { count: restorePoints.length })}
          </p>
          <div className="mt-4 flex gap-2 flex-wrap">
            <Button variant="secondary" onClick={restoreLatest} disabled={busy || restorePoints.length === 0}>
              {t("recovery.restore_latest")}
            </Button>
            <Button variant="primary" onClick={createSnapshot} disabled={busy}>
              {t("recovery.create_snapshot")}
            </Button>
          </div>
        </div>
        <div className="rounded-lg border border-white/10 bg-[#0F0F10] p-4">
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
    </PageShell>
  )
}
