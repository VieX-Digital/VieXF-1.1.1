import PageShell from "@/components/ui/page-shell"
import Button from "@/components/ui/button"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { toast } from "react-toastify"
import {
  Activity,
  Cpu,
  Zap,
  Trash2,
  Globe,
  LayoutGrid,
  Sparkles,
  Wrench,
  HardDrive,
  FolderOpen,
} from "lucide-react"
import { invoke } from "@/lib/electron"
import useSystemMetricsStore, { useSystemMetricsSubscription } from "@/store/systemMetrics"
import { useState } from "react"

const QUICK_CLEAN_IDS = ["temp", "prefetch", "logs"] as const

export default function Optimize() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  useSystemMetricsSubscription()
  const { cpu, ram, gpu } = useSystemMetricsStore((s) => s.current)
  const [busyKey, setBusyKey] = useState<string | null>(null)

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusyKey(key)
    try {
      await fn()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      toast.error(`${t("optimize.fail_action")}: ${msg}`)
    } finally {
      setBusyKey(null)
    }
  }

  const quickClean = () =>
    run("clean", async () => {
      await invoke({ channel: "clean:run", payload: [...QUICK_CLEAN_IDS] })
      toast.success(t("optimize.done_clean"))
    })

  const flushDns = () =>
    run("dns", async () => {
      await invoke({ channel: "dns:flush-cache", payload: null })
      toast.success(t("optimize.done_dns"))
    })

  const openUtility = (id: string) =>
    run(id, async () => {
      await invoke({ channel: "utility:run", payload: id })
    })

  const clearVieCache = () =>
    run("viecache", async () => {
      await invoke({ channel: "clear-vie-cache", payload: null })
      toast.success(t("optimize.done_vie_cache"))
    })

  const metricCard = (
    label: string,
    value: number,
    Icon: typeof Cpu,
    color: string
  ) => (
    <div
      className={`rounded-xl border border-white/10 bg-[#0F0F10] p-4 flex items-center gap-3 ${color}`}
    >
      <div className="p-2 rounded-lg bg-white/5 border border-white/10">
        <Icon size={22} strokeWidth={1.5} />
      </div>
      <div>
        <p className="text-2xl font-display tabular-nums text-white leading-none">{value}%</p>
        <p className="text-xs uppercase tracking-wider text-white/45 mt-1">{label}</p>
      </div>
    </div>
  )

  const actionCard = (opts: {
    key: string
    title: string
    desc: string
    onClick: () => void
    icon: typeof Trash2
  }) => {
    const loading = busyKey === opts.key
    return (
      <button
        type="button"
        disabled={loading}
        onClick={opts.onClick}
        className="text-left rounded-xl border border-white/10 bg-[#0F0F10] p-4 hover:border-cyan-500/35 hover:bg-cyan-950/20 transition-all disabled:opacity-50 disabled:pointer-events-none group"
      >
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-white/5 border border-white/10 text-cyan-300/90 group-hover:text-cyan-300">
            <opts.icon size={20} strokeWidth={1.5} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-white">{opts.title}</h3>
            <p className="text-xs text-white/50 mt-1 leading-relaxed">{opts.desc}</p>
            {loading && (
              <p className="text-xs text-cyan-400/80 mt-2">{t("optimize.running")}</p>
            )}
          </div>
        </div>
      </button>
    )
  }

  return (
    <PageShell title={t("optimize.title")} subtitle={t("optimize.subtitle")}>
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {metricCard(t("optimize.cpu"), cpu, Cpu, "")}
          {metricCard(t("optimize.ram"), ram, Activity, "")}
          {metricCard(t("optimize.gpu"), gpu, Zap, "")}
        </div>

        <div>
          <p className="text-[11px] uppercase tracking-wider text-white/40 mb-2 px-0.5">
            {t("optimize.section_actions")}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {actionCard({
              key: "clean",
              title: t("optimize.quick_clean"),
              desc: t("optimize.quick_clean_desc"),
              onClick: quickClean,
              icon: Trash2,
            })}
            {actionCard({
              key: "dns",
              title: t("optimize.flush_dns"),
              desc: t("optimize.flush_dns_desc"),
              onClick: flushDns,
              icon: Globe,
            })}
            {actionCard({
              key: "taskmgr",
              title: t("optimize.taskmgr"),
              desc: t("optimize.taskmgr_desc"),
              onClick: () => openUtility("taskmgr"),
              icon: Activity,
            })}
            {actionCard({
              key: "powercfg",
              title: t("optimize.power"),
              desc: t("optimize.power_desc"),
              onClick: () => openUtility("powercfg"),
              icon: Zap,
            })}
            {actionCard({
              key: "viecache",
              title: t("optimize.vie_cache"),
              desc: t("optimize.vie_cache_desc"),
              onClick: clearVieCache,
              icon: FolderOpen,
            })}
          </div>
        </div>

        <div>
          <p className="text-[11px] uppercase tracking-wider text-white/40 mb-2 px-0.5">
            {t("optimize.section_more")}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" className="gap-2" onClick={() => navigate("/tweaks")}>
              <Wrench size={16} /> {t("optimize.go_tweaks")}
            </Button>
            <Button variant="secondary" className="gap-2" onClick={() => navigate("/clean")}>
              <Sparkles size={16} /> {t("optimize.go_clean")}
            </Button>
            <Button variant="secondary" className="gap-2" onClick={() => navigate("/dns")}>
              <Globe size={16} /> {t("optimize.go_dns")}
            </Button>
            <Button variant="secondary" className="gap-2" onClick={() => navigate("/apps")}>
              <LayoutGrid size={16} /> {t("optimize.go_apps")}
            </Button>
            <Button variant="secondary" className="gap-2" onClick={() => navigate("/utilities")}>
              <HardDrive size={16} /> {t("optimize.go_utilities")}
            </Button>
          </div>
        </div>
      </div>
    </PageShell>
  )
}
