import { useState } from "react"
import { useTranslation } from "react-i18next"
import PageShell from "@/components/ui/page-shell"
import Button from "@/components/ui/button"
import { invoke } from "@/lib/electron"
import { toast } from "react-toastify"
import { Trash2, Sparkles, AlertTriangle, Play } from "lucide-react"

interface CleanupItem {
    id: string
    labelKey: string
    dangerous?: boolean
    script: string
}

const cleanupsData: CleanupItem[] = [
    {
        id: "temp", labelKey: "clean.temp",
        script: ""
    },
    {
        id: "prefetch", labelKey: "clean.prefetch",
        script: ""
    },
    {
        id: "update", labelKey: "clean.update",
        script: ""
    },
    {
        id: "recycle", labelKey: "clean.recycle",
        script: "",
        dangerous: true
    },
    {
        id: "logs", labelKey: "clean.logs",
        script: ""
    },
    {
        id: "shader", labelKey: "clean.shader",
        script: ""
    },
    {
        id: "browser", labelKey: "clean.browser",
        script: "",
        dangerous: true
    },
    {
        id: "updatebackup", labelKey: "clean.updatebackup",
        script: "",
        dangerous: true
    },
]

export default function Clean() {
    const { t } = useTranslation()
    const [selected, setSelected] = useState<string[]>([])
    const [cleaning, setCleaning] = useState(false)

    const toggleSelect = (id: string) => {
        setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
    }

    const runCleanup = async () => {
        if (selected.length === 0) return
        setCleaning(true)

        try {
            await invoke({ channel: "clean:run", payload: selected })
            toast.success("Đã dọn dẹp sạch sẽ!")
            setSelected([])
        } catch (err) {
            toast.error("Có lỗi xảy ra khi dọn rác!")
            console.error(err)
        } finally {
            setCleaning(false)
        }
    }

    return (
        <PageShell title="Dọn Rác Hệ Thống" subtitle="Làm sạch bộ nhớ, bức tốc mượt mà">
            <div className="space-y-8">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-white/50 text-sm uppercase tracking-widest font-bold">Cleanup Selector</p>
                    </div>
                    <Button
                        onClick={runCleanup}
                        disabled={selected.length === 0 || cleaning}
                        className={`gap-2 px-8 h-12 rounded-xl text-sm font-bold tracking-wider uppercase transition-all shadow-lg ${
                            cleaning || selected.length === 0
                            ? "bg-white/5 text-white/30 border border-white/10" 
                            : "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 hover:bg-cyan-500/30 hover:border-cyan-400/60 shadow-cyan-500/20"
                        }`}
                    >
                        {cleaning ? <Sparkles className="text-cyan-400" size={18} /> : <Play size={18} fill="currentColor" />}
                        {cleaning ? "Đang Quét..." : "Bắt Đầu Dọn"}
                    </Button>
                </div>

                <div className="grid gap-3">
                    {cleanupsData.map(item => (
                        <div
                            key={item.id}
                            className={`
                                p-5 flex items-center justify-between transition-all duration-300 rounded-2xl border backdrop-blur-md cursor-pointer group
                                ${item.dangerous 
                                    ? selected.includes(item.id) ? "bg-rose-500/10 border-rose-500/30 shadow-[0_0_20px_rgba(244,63,94,0.15)]" : "bg-[#09090b]/80 border-rose-500/10 hover:border-rose-500/30" 
                                    : selected.includes(item.id) ? "bg-cyan-500/10 border-cyan-500/30 shadow-[0_0_20px_rgba(34,211,238,0.1)]" : "bg-[#09090b]/80 border-white/5 hover:border-white/10"
                                }
                            `}
                            onClick={() => toggleSelect(item.id)}
                        >
                            <div className="flex items-center gap-5">
                                <div className={`p-3 rounded-xl transition-colors duration-300 ${
                                    item.dangerous 
                                    ? selected.includes(item.id) ? "bg-rose-500/20 text-rose-400" : "bg-white/5 text-rose-400/50 group-hover:text-rose-400/80" 
                                    : selected.includes(item.id) ? "bg-cyan-500/20 text-cyan-400" : "bg-white/5 text-white/40 group-hover:text-cyan-400/80"
                                }`}>
                                    {item.dangerous ? <AlertTriangle size={22} className={selected.includes(item.id) ? "animate-pulse" : ""} /> : <Trash2 size={22} />}
                                </div>
                                <div className="space-y-1">
                                    <h3 className={`font-bold tracking-wide uppercase text-sm transition-colors duration-300 ${selected.includes(item.id) ? "text-white" : "text-white/60"}`}>
                                        {t(item.labelKey)}
                                    </h3>
                                    {item.dangerous && (
                                        <p className="text-[10px] text-rose-400/80 uppercase font-bold tracking-widest flex items-center gap-1">
                                            <span>!</span> CHÚ Ý KHI DỌN
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                                selected.includes(item.id) 
                                ? "border-cyan-400 bg-cyan-400/20" 
                                : "border-white/20 group-hover:border-white/40 bg-transparent"
                            }`}>
                                {selected.includes(item.id) && <div className="w-3 h-3 rounded-full bg-cyan-400" />}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </PageShell>
    )
}
