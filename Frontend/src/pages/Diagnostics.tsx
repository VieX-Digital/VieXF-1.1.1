import PageShell from "@/components/ui/page-shell"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { invoke } from "@/lib/electron"
import Button from "@/components/ui/button"

type CheckRow = { nameKey: string; status: string; tone: "good" | "warn" }

export default function Diagnostics() {
  const { t } = useTranslation()
  const [checks, setChecks] = useState<CheckRow[]>([])
  const [loading, setLoading] = useState(false)

  const runDiagnostics = async () => {
    setLoading(true)
    try {
      const [version, specs, tweaks, restorePoints, updater] = await Promise.all([
        invoke({ channel: "app:version", payload: null }).catch(() => null),
        invoke({ channel: "get-system-specs", payload: null }).catch(() => null),
        invoke({ channel: "tweaks:fetch", payload: null }).catch(() => []),
        invoke({ channel: "get-restore-points", payload: null }).catch(() => ({ points: [] })),
        invoke({ channel: "updater:check", payload: null }).catch(() => ({ ok: false })),
      ])

      const tweakLen = Array.isArray(tweaks) ? tweaks.length : 0
      const restoreLen = Array.isArray(restorePoints?.points) ? restorePoints.points.length : 0
      const hasSpecs = Boolean(specs?.cpu_model)

      const rows: CheckRow[] = [
        {
          nameKey: "row_app_version",
          status: version ? String(version) : "unknown",
          tone: version ? "good" : "warn",
        },
        { nameKey: "row_ipc", status: t("diagnostics.ipc_ok"), tone: "good" },
        {
          nameKey: "row_specs",
          status: hasSpecs ? t("diagnostics.status_ok") : t("diagnostics.status_unavailable"),
          tone: hasSpecs ? "good" : "warn",
        },
        {
          nameKey: "row_tweaks",
          status: t("diagnostics.tweaks_count", { count: tweakLen }),
          tone: tweakLen > 0 ? "good" : "warn",
        },
        {
          nameKey: "row_restore",
          status: t("diagnostics.restore_count", { count: restoreLen }),
          tone: "good",
        },
        {
          nameKey: "row_updater",
          status: updater?.ok ? t("diagnostics.updater_ok") : t("diagnostics.updater_na"),
          tone: updater?.ok ? "good" : "warn",
        },
      ]
      setChecks(rows)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void runDiagnostics()
  }, [])

  return (
    <PageShell
      title={t("diagnostics.title")}
      subtitle={t("diagnostics.subtitle")}
      actions={
        <Button variant="secondary" onClick={runDiagnostics} disabled={loading}>
          {loading ? t("diagnostics.checking") : t("diagnostics.recheck")}
        </Button>
      }
    >
      <div className="rounded-lg border border-white/10 bg-[#0F0F10] p-4 space-y-3">
        {checks.map((item) => (
          <div
            key={item.nameKey}
            className="flex items-center justify-between border-b border-white/10 pb-2 last:border-b-0"
          >
            <span className="text-white/85">{t(`diagnostics.${item.nameKey}`)}</span>
            <span className={item.tone === "good" ? "text-emerald-300" : "text-amber-300"}>
              {item.status}
            </span>
          </div>
        ))}
      </div>
    </PageShell>
  )
}
