import { useState } from "react"
import PageShell from "@/components/ui/page-shell"
import Button from "@/components/ui/button"
import { toast } from "react-toastify"
import { Globe, CheckCircle2, Zap } from "lucide-react"
import { invoke } from "@/lib/electron"
import { useTranslation } from "react-i18next"

const dnsProviders = [
    { id: "google", label: "Google DNS", primary: "8.8.8.8", secondary: "8.8.4.4" },
    { id: "cloudflare", label: "Cloudflare", primary: "1.1.1.1", secondary: "1.0.0.1" },
    { id: "quad9", label: "Quad9", primary: "9.9.9.9", secondary: "149.112.112.112" },
    { id: "adguard", label: "AdGuard", primary: "94.140.14.14", secondary: "94.140.15.15" },
    { id: "nextdns", label: "NextDNS", primary: "45.90.28.167", secondary: "45.90.30.167" },
    { id: "opendns", label: "OpenDNS", primary: "208.67.222.222", secondary: "208.67.220.220" },
    { id: "level3", label: "Level3", primary: "4.2.2.1", secondary: "4.2.2.2" },
    { id: "comodo", label: "Comodo", primary: "8.26.56.26", secondary: "8.20.247.20" },
]

export default function DNS() {
    const { t } = useTranslation()
    const [currentDns, setCurrentDns] = useState("google") // Mock current
    const [applying, setApplying] = useState(false)

    const applyDns = async (id: string) => {
        setApplying(true)
        try {
            const provider = dnsProviders.find(d => d.id === id)
            if (!provider) return

            await invoke({
                channel: "dns:apply",
                payload: {
                    dnsType: "custom",
                    primaryDNS: provider.primary,
                    secondaryDNS: provider.secondary
                }
            })
            setCurrentDns(id)
            toast.success(t("dns.updated"))
        } catch (err) {
            toast.error(t("dns.failed"))
            console.error(err)
        } finally {
            setApplying(false)
        }
    }

    const resetDns = async () => {
        setApplying(true)
        try {
            await invoke({ channel: "dns:reset", payload: null })
            setCurrentDns("dhcp")
            toast.success(t("dns.reset_toast"))
        } catch (err) {
            toast.error(t("dns.failed"))
        } finally {
            setApplying(false)
        }
    }

    const flushDns = async () => {
        try {
            await invoke({ channel: "dns:flush-cache", payload: null })
            toast.success(t("dns.flushed"))
        } catch (err) {
            toast.error(t("dns.failed"))
        }
    }

    return (
        <PageShell title="Đổi DNS Siêu Tốc" subtitle="Vượt rào, giảm ping, max speed">
            <div className="space-y-8">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-white/50 text-sm uppercase tracking-widest font-bold">DNS Profile</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right hidden md:block border-r border-white/10 pr-4">
                            <p className="text-[10px] uppercase font-bold text-white/40 tracking-widest mb-0.5">DNS Hiện Tại</p>
                            <p className="text-xs font-black text-cyan-400 uppercase tracking-widest">{currentDns === "dhcp" ? "Mặc Định (DHCP)" : dnsProviders.find(d => d.id === currentDns)?.label || "Custom"}</p>
                        </div>
                        <Button variant="ghost" className="px-5 py-2 rounded-xl text-xs font-bold tracking-wider uppercase border border-white/10 hover:bg-white/10 hover:text-white text-white/60 transition-all" onClick={resetDns} disabled={applying}>Khôi Phục</Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {dnsProviders.map(dns => {
                        const isActive = currentDns === dns.id
                        return (
                            <div
                                key={dns.id}
                                className={`p-6 flex items-start justify-between cursor-pointer transition-all duration-300 rounded-2xl border backdrop-blur-xl group shadow-[0_8px_30px_rgba(0,0,0,0.5)] ${isActive ? "border-cyan-500/40 shadow-[0_0_20px_rgba(34,211,238,0.15)] bg-cyan-950/20" : "bg-[#09090b]/80 border-white/5 hover:border-white/10 hover:bg-[#0a0a0c]/90 hover:-translate-y-1"}`}
                                onClick={() => applyDns(dns.id)}
                            >
                                <div className="flex gap-5">
                                    <div className={`p-3.5 rounded-xl transition-all duration-300 ${isActive ? "bg-cyan-500/20 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.3)]" : "bg-white/5 border border-white/10 text-white/40 group-hover:border-cyan-500/30 group-hover:text-cyan-400 group-hover:bg-cyan-500/10"}`}>
                                        <Globe size={26} />
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className={`font-bold tracking-wider uppercase text-sm transition-colors duration-300 ${isActive ? "text-white" : "text-white/80 group-hover:text-white"}`}>{dns.label}</h3>
                                        <p className="text-xs text-white/40 uppercase tracking-wide">{t(`dns.providers.${dns.id}`)}</p>
                                        <div className="flex gap-2 mt-3">
                                            <code className="px-2 py-1 rounded-md bg-black/60 border border-white/10 text-xs text-cyan-400/80 font-mono tracking-widest">{dns.primary}</code>
                                            <code className="px-2 py-1 rounded-md bg-black/60 border border-white/10 text-xs text-cyan-400/80 font-mono tracking-widest">{dns.secondary}</code>
                                        </div>
                                    </div>
                                </div>
                                {isActive && <CheckCircle2 className="text-cyan-400" size={24} />}
                            </div>
                        )
                    })}
                </div>

                <div className="p-6 rounded-2xl border border-white/5 bg-[#09090b]/80 backdrop-blur-xl flex flex-col md:flex-row md:items-center gap-5 shadow-[0_8px_30px_rgba(0,0,0,0.5)] transition-all hover:border-white/10">
                    <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                        <Zap size={26} fill="currentColor" />
                    </div>
                    <div className="space-y-1">
                        <h3 className="font-bold tracking-wider uppercase text-sm text-white">Xoá Bộ Nhớ Đệm DNS (Flush DNS)</h3>
                        <p className="text-xs text-white/40">Thanh lọc cache mạng, sửa lỗi không truy cập được web do xung đột DNS cũ.</p>
                    </div>
                    <Button variant="ghost" className="md:ml-auto px-5 py-2.5 rounded-xl text-xs font-bold tracking-wider uppercase border border-purple-500/30 hover:bg-purple-500/20 hover:text-purple-300 text-purple-400 bg-purple-500/10 transition-all shadow-lg" onClick={flushDns}>Bơm Ngay</Button>
                </div>
            </div>
        </PageShell>
    )
}
