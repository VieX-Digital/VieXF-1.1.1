import PageShell from "@/components/ui/page-shell"
import { toast } from "react-toastify"
import { Terminal, Keyboard, Monitor, Wifi, HardDrive, KeyRound, Activity, Wrench, Shield, Zap } from "lucide-react"
import { invoke } from "@/lib/electron"
import { useTranslation } from "react-i18next"

// Mock utilities list
const utilities = [
    { id: "activation", icon: KeyRound },
    { id: "keyboard", icon: Keyboard },
    { id: "display", icon: Monitor },
    { id: "network", icon: Wifi },
    { id: "disk", icon: HardDrive },
    { id: "cmd", icon: Terminal },
    { id: "taskmgr", icon: Activity },
    { id: "devmgmt", icon: Wrench },
    { id: "ncpa", icon: Wifi },
    { id: "regedit", icon: Shield },
    { id: "powercfg", icon: Zap },
]

export default function Utilities() {
    const { t } = useTranslation()

    const runUtility = async (id: string) => {
        try {
            await invoke({ channel: "utility:run", payload: id })
        } catch (err) {
            toast.error(t("utilities.failed") + " " + id)
        }
    }

    return (
        <PageShell title={t("utilities.title")} subtitle={t("utilities.subtitle")}>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
                    {utilities.map(tool => {
                        const Icon = tool.icon
                        return (
                            <div
                                key={tool.id}
                                className="p-6 rounded-2xl border border-white/5 bg-[#09090b]/80 backdrop-blur-xl flex flex-col items-center text-center gap-5 cursor-pointer hover:bg-white/5 hover:border-cyan-500/20 hover:-translate-y-1 shadow-[0_8px_30px_rgba(0,0,0,0.5)] group transition-all duration-300"
                                onClick={() => runUtility(tool.id)}
                            >
                                <div className="p-4 rounded-full bg-white/5 border border-white/10 group-hover:border-cyan-400/50 group-hover:bg-cyan-500/10 group-hover:text-cyan-400 group-hover:shadow-[0_0_15px_rgba(34,211,238,0.3)] transition-all duration-300 text-white/60">
                                    <Icon size={28} />
                                </div>
                                <div className="space-y-1.5">
                                    <h3 className="font-bold tracking-wider uppercase text-sm text-white/90 group-hover:text-white transition-colors">
                                        {t(`utilities.items.${tool.id}.title`)}
                                    </h3>
                                    <p className="text-xs text-white/40 block">{t("utilities.open_hint")}</p>
                                </div>
                            </div>
                        )
                    })}
            </div>
        </PageShell>
    )
}
