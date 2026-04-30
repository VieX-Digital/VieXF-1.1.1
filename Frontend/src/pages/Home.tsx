import React, { useEffect, memo } from "react"
import { useTranslation } from "react-i18next"
import RootDiv from "@/components/rootdiv"
import Button from "@/components/ui/button"
import { invoke } from "@/lib/electron"
import { toast } from "react-toastify"
import {
  Cpu,
  Activity,
  Zap,
  Users,
  Crown,
  Ghost,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Search,
  Grid,
  RefreshCw,
} from "lucide-react"
import { useNavigate } from "react-router-dom"
import useSystemMetricsStore, { useSystemMetricsSubscription } from "@/store/systemMetrics"

// --- Constants & Config ---

const TABS = [
  { id: "cpu", label: "CPU", icon: Cpu, color: "#22d3ee" },
  { id: "ram", label: "RAM", icon: Activity, color: "#3b82f6" },
  { id: "gpu", label: "GPU", icon: Zap, color: "#10b981" },
] as const

const TAB_COLORS: Record<string, string> = {
  cpu: "cyan-400",
  ram: "blue-400",
  gpu: "emerald-400",
}

type ActiveTab = (typeof TABS)[number]["id"]

function compareVersions(a: string, b: string) {
  const left = String(a || "")
    .replace(/[^0-9.]/g, "")
    .split(".")
    .map((part) => Number(part) || 0)
  const right = String(b || "")
    .replace(/[^0-9.]/g, "")
    .split(".")
    .map((part) => Number(part) || 0)
  const max = Math.max(left.length, right.length)

  for (let i = 0; i < max; i++) {
    const diff = (left[i] || 0) - (right[i] || 0)
    if (diff !== 0) return diff > 0 ? 1 : -1
  }

  return 0
}

// --- Components ---

const AnimatedCounter = memo(({ value, label, subLabel }: { value: number; label: string; subLabel?: string }) => {
  return (
    <div className="flex flex-col">
      <div className="flex items-baseline gap-2">
        <div className="text-5xl lg:text-7xl font-display text-white tabular-nums leading-none tracking-tighter">
          {value}<span className="text-3xl lg:text-5xl text-white/40">%</span>
        </div>
        {subLabel && (
          <span className="text-sm font-medium text-cyan-400 flex items-center gap-0.5 bg-cyan-950/40 px-2 py-1 rounded-md border border-cyan-500/20">
            <ArrowUpRight size={14} /> {subLabel}
          </span>
        )}
      </div>
      <p className="text-sm text-white/50 font-bold uppercase tracking-widest mt-4">{label}</p>
    </div>
  )
})

const StatCard = memo(({
  title,
  value,
  subtext,
  icon: Icon,
  trend,
  trendValue,
  colorClass,
  actionButton
}: {
  title: string;
  value: string;
  subtext?: string;
  icon: any;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  colorClass: string;
  actionButton?: React.ReactNode;
}) => {
  const borderColor = colorClass.replace('bg-', 'border-')
  const textColor = colorClass.replace('bg-', 'text-')

  return (
    <div className="relative overflow-hidden rounded-2xl bg-[#09090b]/80 backdrop-blur-xl border border-white/5 p-5 group transition-all duration-300 hover:border-white/20 hover:-translate-y-1 shadow-[0_8px_30px_rgb(0,0,0,0.5)] flex flex-col justify-between gap-4">
      <div className="relative z-10 flex flex-col justify-between h-full gap-4">
        <div className="flex justify-between items-start">
          <div className={`p-3 rounded-xl bg-white/5 border border-white/10 ${textColor} shadow-inner transition-transform group-hover:scale-110 duration-300`}>
            <Icon size={24} strokeWidth={1.5} />
          </div>
          {trend && (
            <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-md ${trend === 'up' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
              trend === 'down' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' :
                'bg-rose-500/10 text-rose-400 border border-rose-500/20'
              }`}>
              {trend === 'up' || trend === 'down' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
              {trendValue}
            </div>
          )}
        </div>

        <div className="flex items-end justify-between">
          <div>
            <h3 className="text-3xl font-display text-white tracking-tight leading-none mb-1">{value}</h3>
            <p className="text-sm text-white/40 font-medium tracking-wide uppercase flex items-center gap-2">
              {title}
              {subtext && <span className="opacity-50 lowercase font-normal normal-case tracking-normal">({subtext})</span>}
            </p>
          </div>
          {actionButton && (
            <div className="transform translate-y-1 group-hover:translate-y-0 transition-transform">
              {actionButton}
            </div>
          )}
        </div>
      </div>
    </div>
  )
})

const TweakItem = memo(({
  label,
  value,
  percent,
  color
}: {
  label: string;
  value: string;
  percent: string;
  color: string
}) => {
  const textColor = color.replace('bg-', 'text-')
  return (
    <div className="flex items-center justify-between py-3 px-2 rounded-lg hover:bg-white/5 transition-colors group cursor-default">
      <div className="flex items-center gap-3">
        <div className={`w-1.5 h-1.5 rounded-full ${color} shadow-[0_0_8px_currentColor]`} />
        <span className="text-sm font-medium text-white/60 group-hover:text-white/90 transition-colors uppercase tracking-wide">{label}</span>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-sm font-bold text-white/90">{value}</span>
        <span className={`text-xs font-bold px-2 py-0.5 rounded bg-white/5 ${textColor} border border-white/10`}>
          {percent}
        </span>
      </div>
    </div>
  )
})

export default function Home() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = React.useState<ActiveTab>("cpu")
  const [sysInfo, setSysInfo] = React.useState<any>(null)
  const [checkingUpdate, setCheckingUpdate] = React.useState(false)
  const [userName, setUserName] = React.useState("Dân Chơi")

  useSystemMetricsSubscription()

  const current = useSystemMetricsStore((state) => state.current)
  // History is not used in the minimal UI to save RAM, we removed recharts
  const history = useSystemMetricsStore((state) => state.history)

  useEffect(() => {
    let mounted = true

    const initData = async () => {
      try {
        const [info, name] = await Promise.all([
          invoke({ channel: "get-system-specs", payload: null }).catch(() => null),
          invoke({ channel: "get-user-name", payload: null }).catch(() => "Dân Chơi"),
        ])

        if (!mounted) return
        setSysInfo(info)
        // Ensure default name sounds GenZ/Cool if fallback
        setUserName((name as string) || "Chủ Tịch")
      } catch {
        // keep silent, fallback UI already exists
      }
    }

    void initData()

    return () => {
      mounted = false
    }
  }, [])

  const checkForUpdates = async () => {
    if (checkingUpdate) return

    setCheckingUpdate(true)
    try {
      const [currentVersion, result] = await Promise.all([
        invoke({ channel: "updater:get-version", payload: null }).catch(() => null),
        invoke({ channel: "updater:check", payload: null }),
      ])

      if (!result?.ok) {
        toast.error(result?.error ? String(result.error) : "Không thể kiểm tra bản cập nhật.")
        return
      }

      const nextVersion = result?.updateInfo?.version ? String(result.updateInfo.version) : null
      const currentVersionText = currentVersion ? String(currentVersion) : null

      if (nextVersion && currentVersionText && compareVersions(nextVersion, currentVersionText) > 0) {
        toast.info(`Có bản cập nhật mới: ${nextVersion}.`)
        return
      }

      toast.success("Bạn đang dùng bản mới nhất.")
    } catch (error: any) {
      toast.error(error?.message || "Không thể kiểm tra bản cập nhật.")
    } finally {
      setCheckingUpdate(false)
    }
  }

  const activeValue = activeTab === "cpu" ? current.cpu : activeTab === "ram" ? current.ram : current.gpu
  const trendLabel = activeValue > 80 ? "Cháy Máy" : activeValue > 50 ? "Bình Thường" : "Cực Mượt"

  return (
    <RootDiv style={{}}>
      <div className="relative max-w-7xl mx-auto px-6 py-6 flex flex-col gap-8 h-full">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2 border-b border-white/5">
          <div>
            <h1 className="text-4xl font-display text-white tracking-tighter flex items-center gap-3">
              Trung Tâm Chỉ Huy
              <span className="px-2 py-0.5 rounded flex items-center bg-cyan-500/10 border border-cyan-500/20 text-[10px] font-bold text-cyan-400 uppercase tracking-widest shadow-[0_0_10px_rgba(34,211,238,0.2)]">
                Pro
              </span>
            </h1>
            <p className="text-white/40 text-sm mt-1 uppercase tracking-widest font-bold">Wassup, <span className="text-cyan-400">{userName}</span></p>
          </div>

          <div className="flex items-center gap-3">
            <button className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all border border-white/5 hover:border-white/10 active:scale-95">
              <Search size={18} />
            </button>
            <button
              type="button"
              onClick={checkForUpdates}
              disabled={checkingUpdate}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all border border-white/10 hover:border-cyan-500/40 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <RefreshCw size={16} className={checkingUpdate ? "animate-spin" : ""} />
              <span className="text-sm font-bold tracking-wider uppercase">
                {checkingUpdate ? "Đang kiểm tra" : "Kiểm tra bản cập nhật mới"}
              </span>
            </button>
            <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 hover:text-cyan-300 transition-all border border-cyan-500/30 shadow-[0_0_15px_-5px_rgba(34,211,238,0.4)] active:scale-95">
              <Sparkles size={16} fill="currentColor" />
              <span className="text-sm font-bold tracking-wider uppercase">Boost FPS</span>
            </button>
          </div>
        </div>

        {/* Top Cards Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <StatCard
            title="Độ Trễ Hệ Thống"
            value="< 1ms"
            icon={Zap}
            colorClass="bg-cyan-400"
            trend="down"
            trendValue="Tối Ưu Hoá"
          />
          <StatCard
            title="Sát Thủ Rác"
            value="14 GB"
            icon={Ghost}
            colorClass="bg-white/40"
            trend="up"
            trendValue="Đã Dọn"
          />
          <StatCard
            title="Cấp Bậc VIP"
            value="2,021"
            icon={Crown}
            colorClass="bg-amber-400"
            trend="up"
            trendValue="+36.2%"
            actionButton={
              <a
                href="https://discord.com/channels/1274585470633906176/1466020101554835466"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 hover:text-red-400 text-xs font-bold uppercase tracking-wider border border-red-500/30 transition-colors shadow-[0_0_15px_-5px_rgba(239,68,68,0.5)] inline-block"
              >
                Tăng FPS
              </a>
            }
          />
        </div>

        {/* Main Content Area - Metrics & Tweaks */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-[calc(100%-240px)] min-h-[400px]">

          {/* Core Metrics */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            {/* Minimal Tabs */}
            <div className="flex items-center gap-2 bg-[#09090b]/80 p-1.5 rounded-xl border border-white/5 w-fit shadow-lg">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative px-6 py-2 rounded-lg text-sm font-bold tracking-wider uppercase transition-all duration-300 outline-none ${activeTab === tab.id
                    ? `bg-white/10 text-white shadow-md border border-white/10`
                    : `text-white/40 hover:text-white/80 hover:bg-white/5 border border-transparent`
                    }`}
                >
                  {tab.label}
                  {activeTab === tab.id && (
                    <div className="absolute inset-x-0 -bottom-[1px] h-[1px] bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,1)]" />
                  )}
                </button>
              ))}
            </div>

            {/* Performance Visualizer (No heavy charts, minimal aesthetic) */}
            <div className="relative flex-1 rounded-2xl bg-[#09090b]/80 backdrop-filter backdrop-blur-xl border border-white/5 p-8 shadow-[0_15px_40px_-15px_rgba(0,0,0,0.8)] flex flex-col justify-center overflow-hidden group">
              {/* Dynamic decorative minimal glow */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-cyan-900/20 blur-[80px] rounded-full transition-opacity duration-1000 group-hover:opacity-100 opacity-50 pointer-events-none" />

              <div className="relative z-10 w-full flex items-center justify-between">
                <AnimatedCounter value={activeValue} label={`${activeTab} Load Status`} subLabel={trendLabel} />

                {/* CSS Visualizer Rings */}
                <div className="relative w-48 h-48 flex items-center justify-center">
                  <svg className="-rotate-90 w-full h-full drop-shadow-[0_0_15px_rgba(34,211,238,0.2)]">
                    <circle cx="96" cy="96" r="80" stroke="rgba(255,255,255,0.05)" strokeWidth="12" fill="none" />
                    <circle cx="96" cy="96" r="80" stroke="currentColor" strokeWidth="12" fill="none"
                      className={`text-${TAB_COLORS[activeTab]} transition-all duration-1000 ease-out`}
                      strokeDasharray="502"
                      strokeDashoffset={502 - (502 * activeValue) / 100}
                      strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center flex-col">
                    <span className="text-white/30 text-xs font-bold uppercase tracking-widest">{activeTab}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tweaks List */}
          <div className="lg:col-span-4 h-full">
            <div className="rounded-2xl bg-[#09090b]/80 border border-white/5 p-5 h-full flex flex-col shadow-[0_10px_30px_-10px_rgba(0,0,0,0.6)] relative">
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/5">
                <h3 className="text-sm font-bold text-white/50 tracking-widest uppercase">Tối Ưu Hoá VIP</h3>
                <button
                  onClick={() => navigate('/tweaks')}
                  className="text-[10px] font-bold text-white hover:text-cyan-400 transition-colors uppercase tracking-widest bg-white/5 border border-white/10 hover:border-cyan-500/50 py-1.5 px-3 rounded"
                >
                  Setup
                </button>
              </div>

              <div className="flex flex-col flex-1 overflow-auto no-scrollbar gap-1">
                <TweakItem label="Độ Trễ Phản Hồi" value="Max Tốc" percent="+24%" color="bg-cyan-400" />
                <TweakItem label="Ping Mạng" value="Cực Thấp" percent="-12ms" color="bg-emerald-400" />
                <TweakItem label="Khử Giật Lag" value="Đang Bật" percent="100%" color="bg-amber-400" />
                <TweakItem label="Dịch Vụ Nền" value="Đóng Băng" percent="-45%" color="bg-rose-400" />
                <TweakItem label="Bộ Nhớ Đệm" value="Tối Đa" percent="+1.2GB" color="bg-purple-400" />
              </div>

              <div className="mt-4 pt-4 border-t border-white/5">
                <h4 className="text-xs font-bold text-white/30 uppercase tracking-widest mb-3">Hành Động Khẩn</h4>
                <div className="grid grid-cols-2 gap-3">
                  <Button variant="ghost" className="h-10 text-xs font-bold tracking-wider uppercase border border-white/10 hover:bg-white/10 hover:text-white text-white/60 bg-transparent rounded-lg transition-all" onClick={() => navigate('/clean')}>
                    Dọn Rác
                  </Button>
                  <Button variant="ghost" className="h-10 text-xs font-bold tracking-wider uppercase border border-cyan-900/40 hover:bg-cyan-950/40 hover:text-cyan-400 hover:border-cyan-500/50 text-cyan-500/80 bg-cyan-950/20 rounded-lg transition-all" onClick={() => navigate('/utilities')}>
                    Check Hàng
                  </Button>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </RootDiv>
  )
}
