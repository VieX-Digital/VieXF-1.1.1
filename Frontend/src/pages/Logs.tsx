import PageShell from "@/components/ui/page-shell"
import Button from "@/components/ui/button"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { clearOperationLogs, getOperationLogs, invoke } from "@/lib/electron"

export default function Logs() {
  const { t } = useTranslation()
  const [logs, setLogs] = useState([])

  useEffect(() => {
    const refresh = () => setLogs(getOperationLogs())
    refresh()
    window.addEventListener("vie:operation-log-updated", refresh)
    return () => window.removeEventListener("vie:operation-log-updated", refresh)
  }, [])

  return (
    <PageShell
      title={t("logs.title")}
      subtitle={t("logs.subtitle")}
      actions={
        <>
          <Button variant="secondary" onClick={() => invoke({ channel: "open-log-folder", payload: null })}>
            {t("logs.open_folder")}
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              clearOperationLogs()
              setLogs([])
            }}
          >
            {t("logs.clear")}
          </Button>
        </>
      }
    >
      <div className="rounded-lg border border-white/10 bg-[#0B0B0D] p-4 font-mono text-xs leading-6 text-white/80 h-full overflow-auto">
        {logs.length === 0 && <div className="text-white/50">{t("logs.empty")}</div>}
        {logs.map((line) => (
          <div key={line.id} className="border-b border-white/5 py-1 last:border-b-0">
            [{new Date(line.time).toLocaleTimeString()}] [{line.status}] {line.channel} - {line.detail}
          </div>
        ))}
      </div>
    </PageShell>
  )
}
