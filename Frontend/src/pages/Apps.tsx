import { useState, useEffect, useMemo, useCallback, useRef, memo } from "react"
import PageShell from "@/components/ui/page-shell"
import Button from "@/components/ui/button"
import {
    PackageX, CheckCircle2, RefreshCw, Search, Download, LayoutGrid,
    Trash2, Star, Globe, Code2, Gamepad2, MessageCircle, Film,
    Wrench, Shield, Briefcase, Mouse, ChevronRight, X, Package,
    Zap, Layers, ExternalLink, AlertTriangle, Check, Loader2, StarOff
} from "lucide-react"
import { invoke, onIpc } from "@/lib/electron"
import { toast } from "react-toastify"
import { useTranslation } from "react-i18next"
import useAppsStore from "@/store/appsStore"
import type { AppItem, QueueItem } from "@/store/appsStore"
import appsData from "@/assets/apps.json"

// ─── Category Config ─────────────────────────────────────────────
const CATEGORIES: { key: string; label: string; labelEn: string; icon: any; color: string }[] = [
    { key: "all", label: "Tất cả", labelEn: "All", icon: LayoutGrid, color: "cyan" },
    { key: "browsers", label: "Trình duyệt", labelEn: "Browsers", icon: Globe, color: "blue" },
    { key: "development", label: "Phát triển", labelEn: "Development", icon: Code2, color: "green" },
    { key: "games", label: "Trò chơi", labelEn: "Games", icon: Gamepad2, color: "purple" },
    { key: "communication", label: "Liên lạc", labelEn: "Communication", icon: MessageCircle, color: "pink" },
    { key: "multimedia", label: "Đa phương tiện", labelEn: "Multimedia", icon: Film, color: "orange" },
    { key: "utilities", label: "Tiện ích", labelEn: "Utilities", icon: Wrench, color: "yellow" },
    { key: "Privacy & Security", label: "Bảo mật", labelEn: "Security", icon: Shield, color: "red" },
    { key: "productivity", label: "Năng suất", labelEn: "Productivity", icon: Briefcase, color: "teal" },
    { key: "peripherals", label: "Ngoại vi", labelEn: "Peripherals", icon: Mouse, color: "indigo" },
]

// ─── Preset Packs ────────────────────────────────────────────────
const PRESETS: { id: string; label: string; labelEn: string; icon: any; color: string; ids: string[] }[] = [
    {
        id: "gamer", label: "🎮 Gamer Pack", labelEn: "🎮 Gamer Pack", icon: Gamepad2, color: "purple",
        ids: ["Valve.Steam", "EpicGames.EpicGamesLauncher", "Discord.Discord", "Guru3D.Afterburner",
              "NVIDIA.GeForceNOW", "OBSProject.OBSStudio", "pizzaboxer.Bloxstrap", "Playnite.Playnite"]
    },
    {
        id: "developer", label: "💻 Developer Pack", labelEn: "💻 Developer Pack", icon: Code2, color: "green",
        ids: ["Microsoft.VisualStudioCode", "Git.Git", "OpenJS.NodeJS", "Docker.DockerDesktop",
              "Postman.Postman", "GitHub.GitHubDesktop", "Python.Python.3.12", "Neovim.Neovim"]
    },
    {
        id: "essential", label: "⚡ Essential Pack", labelEn: "⚡ Essential Pack", icon: Zap, color: "cyan",
        ids: ["Mozilla.Firefox", "7Zip.7Zip", "VideoLAN.VLC", "Discord.Discord",
              "Bitwarden.Bitwarden", "voidtools.Everything", "Microsoft.PowerToys", "ShareX.ShareX"]
    },
]

// ─── Bloatware list ──────────────────────────────────────────────
const bloatwareApps = [
    { id: "cortana", label: "Cortana" },
    { id: "edge", label: "Microsoft Edge" },
    { id: "onedrive", label: "OneDrive" },
    { id: "xbox", label: "Xbox Game Bar" },
    { id: "maps", label: "Maps" },
    { id: "weather", label: "Weather" },
    { id: "news", label: "News" },
    { id: "telemetry", label: "Telemetry" },
]

// ─── Helpers ─────────────────────────────────────────────────────
const colorMap: Record<string, { bg: string; border: string; text: string; glow: string }> = {
    cyan:   { bg: "bg-cyan-500/10",   border: "border-cyan-500/30",   text: "text-cyan-400",   glow: "shadow-[0_0_15px_rgba(34,211,238,0.2)]" },
    blue:   { bg: "bg-blue-500/10",   border: "border-blue-500/30",   text: "text-blue-400",   glow: "shadow-[0_0_15px_rgba(59,130,246,0.2)]" },
    green:  { bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-400", glow: "shadow-[0_0_15px_rgba(52,211,153,0.2)]" },
    purple: { bg: "bg-purple-500/10", border: "border-purple-500/30", text: "text-purple-400", glow: "shadow-[0_0_15px_rgba(168,85,247,0.2)]" },
    pink:   { bg: "bg-pink-500/10",   border: "border-pink-500/30",   text: "text-pink-400",   glow: "shadow-[0_0_15px_rgba(236,72,153,0.2)]" },
    orange: { bg: "bg-orange-500/10", border: "border-orange-500/30", text: "text-orange-400", glow: "shadow-[0_0_15px_rgba(249,115,22,0.2)]" },
    yellow: { bg: "bg-amber-500/10",  border: "border-amber-500/30",  text: "text-amber-400",  glow: "shadow-[0_0_15px_rgba(245,158,11,0.2)]" },
    red:    { bg: "bg-rose-500/10",   border: "border-rose-500/30",   text: "text-rose-400",   glow: "shadow-[0_0_15px_rgba(244,63,94,0.2)]" },
    teal:   { bg: "bg-teal-500/10",   border: "border-teal-500/30",   text: "text-teal-400",   glow: "shadow-[0_0_15px_rgba(20,184,166,0.2)]" },
    indigo: { bg: "bg-indigo-500/10", border: "border-indigo-500/30", text: "text-indigo-400", glow: "shadow-[0_0_15px_rgba(99,102,241,0.2)]" },
}

function getCatColor(key: string) {
    const cat = CATEGORIES.find((c) => c.key === key)
    return colorMap[cat?.color || "cyan"] || colorMap.cyan
}

// ─── Main Component ──────────────────────────────────────────────
export default function Apps() {
    const { t, i18n } = useTranslation()
    const isVi = i18n.language === "vi"

    const {
        activeTab, setActiveTab,
        selectedApps, toggleApp, selectMultiple, clearSelection,
        searchQuery, setSearchQuery,
        activeCategory, setActiveCategory,
        installQueue, isInstalling, showQueue, setShowQueue,
        addToQueue, updateQueueItem, clearQueue, setIsInstalling,
        favorites, toggleFavorite,
    } = useAppsStore()

    // ─── IPC Listener for install progress ───────────────────────
    const errorCountRef = useRef(0)
    useEffect(() => {
        errorCountRef.current = 0
        const unsub = onIpc({
            channel: "apps:install-progress",
            listener: (data: { id: string; status: string; message?: string }) => {
                updateQueueItem(data.id, {
                    status: data.status as any,
                    message: data.message,
                })
                // Only count errors — no per-app toasts
                if (data.status === "error") {
                    errorCountRef.current++
                }
            },
        })
        const unsub2 = onIpc({
            channel: "apps:install-complete",
            listener: () => {
                setIsInstalling(false)
                const errors = errorCountRef.current
                if (errors > 0) {
                    toast.warning(`${t("apps.install_complete")} (${errors} ${errors === 1 ? "error" : "errors"})`, { autoClose: 4000 })
                } else {
                    toast.success(t("apps.install_complete"), { autoClose: 3000 })
                }
                errorCountRef.current = 0
            },
        })
        return () => { unsub(); unsub2() }
    }, [])

    // ─── All apps from JSON ──────────────────────────────────────
    const allApps: AppItem[] = useMemo(() => appsData.apps || [], [])

    // ─── Filtered apps ───────────────────────────────────────────
    const filteredApps = useMemo(() => {
        let result = allApps

        // Category filter
        if (activeCategory !== "all") {
            result = result.filter((app) => app.category === activeCategory)
        }

        // Search filter
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase()
            result = result.filter(
                (app) =>
                    app.name.toLowerCase().includes(q) ||
                    app.info.toLowerCase().includes(q) ||
                    app.id.toLowerCase().includes(q)
            )
        }

        return result
    }, [allApps, activeCategory, searchQuery])

    // ─── Category counts ─────────────────────────────────────────
    const categoryCounts = useMemo(() => {
        const counts: Record<string, number> = { all: allApps.length }
        allApps.forEach((app) => {
            counts[app.category] = (counts[app.category] || 0) + 1
        })
        return counts
    }, [allApps])

    // ─── Handle batch install ────────────────────────────────────
    const handleBatchInstall = useCallback(async () => {
        const appsToInstall = allApps.filter((a) => selectedApps.includes(a.id))
        if (appsToInstall.length === 0) return

        const queueItems: QueueItem[] = appsToInstall.map((a) => ({
            id: a.id,
            name: a.name,
            status: "pending" as const,
        }))

        addToQueue(queueItems)
        setIsInstalling(true)

        try {
            await invoke({
                channel: "apps:install",
                payload: { apps: appsToInstall.map((a) => ({ id: a.id, name: a.name, link: a.link })) },
            })
        } catch (err) {
            toast.error(t("apps.install_error"))
            setIsInstalling(false)
        }

        clearSelection()
    }, [selectedApps, allApps])

    // ─── Handle preset selection ─────────────────────────────────
    const handlePreset = (presetIds: string[]) => {
        selectMultiple(presetIds.filter((id) => allApps.some((a) => a.id === id)))
    }

    // ─── Bloatware removal (kept from original) ──────────────────
    const [bloatSelected, setBloatSelected] = useState<string[]>([])
    const [isRemoving, setIsRemoving] = useState(false)

    const toggleBloat = (id: string) => {
        setBloatSelected((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        )
    }

    const handleBloatRemove = async () => {
        setIsRemoving(true)
        try {
            await invoke({ channel: "apps:remove", payload: bloatSelected })
            toast.success(t("apps.success"))
            setBloatSelected([])
        } catch {
            toast.error(t("apps.failed"))
        } finally {
            setIsRemoving(false)
        }
    }

    // ─── Select all visible in current category ──────────────────
    const selectAllVisible = () => {
        const ids = filteredApps.map((a) => a.id)
        selectMultiple(ids)
    }

    // ─── Render ──────────────────────────────────────────────────
    return (
        <PageShell
            title={isVi ? "Trung Tâm Ứng Dụng" : "App Center"}
            subtitle={isVi ? "Kho ứng dụng & dọn dẹp bloatware all-in-one" : "App Store & Bloatware Cleanup all-in-one"}
        >
            <div className="flex flex-col h-full gap-4">
                {/* ─── Tab Switcher ─────────────────────────────── */}
                <div className="flex items-center gap-2">
                    <TabButton
                        active={activeTab === "store"}
                        onClick={() => setActiveTab("store")}
                        icon={<Package size={16} />}
                        label={isVi ? "Kho Ứng Dụng" : "App Store"}
                        count={allApps.length}
                        color="cyan"
                    />
                    <TabButton
                        active={activeTab === "bloatware"}
                        onClick={() => setActiveTab("bloatware")}
                        icon={<PackageX size={16} />}
                        label={isVi ? "Trảm Bloatware" : "Remove Bloatware"}
                        count={8}
                        color="rose"
                    />

                    {/* ─── Queue badge ──────────────────────────── */}
                    {installQueue.length > 0 && (
                        <button
                            onClick={() => setShowQueue(!showQueue)}
                            className="ml-auto flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold tracking-wider uppercase border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                        >
                            <Layers size={14} />
                            {isVi ? "Hàng đợi" : "Queue"} ({installQueue.length})
                            {isInstalling && <Loader2 size={14} className="animate-spin" />}
                        </button>
                    )}
                </div>

                {/* ─── Tab Content ──────────────────────────────── */}
                {activeTab === "store" ? (
                    <StoreTab
                        filteredApps={filteredApps}
                        allApps={allApps}
                        selectedApps={selectedApps}
                        toggleApp={toggleApp}
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                        activeCategory={activeCategory}
                        setActiveCategory={setActiveCategory}
                        categoryCounts={categoryCounts}
                        favorites={favorites}
                        toggleFavorite={toggleFavorite}
                        handleBatchInstall={handleBatchInstall}
                        handlePreset={handlePreset}
                        clearSelection={clearSelection}
                        selectAllVisible={selectAllVisible}
                        isInstalling={isInstalling}
                        isVi={isVi}
                        t={t}
                    />
                ) : (
                    <BloatwareTab
                        bloatSelected={bloatSelected}
                        toggleBloat={toggleBloat}
                        handleBloatRemove={handleBloatRemove}
                        isRemoving={isRemoving}
                        setBloatSelected={setBloatSelected}
                        isVi={isVi}
                        t={t}
                    />
                )}

                {/* ─── Install Queue Side Panel ────────────────── */}
                {showQueue && (
                    <QueuePanel
                        queue={installQueue}
                        isInstalling={isInstalling}
                        onClose={() => setShowQueue(false)}
                        onClear={clearQueue}
                        isVi={isVi}
                    />
                )}
            </div>
        </PageShell>
    )
}

// ─── Tab Button Component ────────────────────────────────────────
function TabButton({ active, onClick, icon, label, count, color }: {
    active: boolean; onClick: () => void; icon: React.ReactNode
    label: string; count: number; color: string
}) {
    const activeClass = color === "rose"
        ? "border-rose-500/40 bg-rose-950/20 text-rose-300"
        : "border-cyan-500/40 bg-cyan-950/20 text-cyan-300"

    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold tracking-wider uppercase border transition-all ${
                active
                    ? activeClass
                    : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
            }`}
        >
            {icon}
            {label}
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${active ? "bg-white/10" : "bg-white/5"}`}>
                {count}
            </span>
        </button>
    )
}

// ─── Store Tab ───────────────────────────────────────────────────
function StoreTab({
    filteredApps, allApps, selectedApps, toggleApp, searchQuery, setSearchQuery,
    activeCategory, setActiveCategory, categoryCounts, favorites, toggleFavorite,
    handleBatchInstall, handlePreset, clearSelection, selectAllVisible,
    isInstalling, isVi, t,
}: any) {
    return (
        <div className="flex gap-4 flex-1 min-h-0 overflow-hidden">
            {/* ─── Sidebar: Categories ────────────────────────── */}
            <div className="w-[200px] flex-shrink-0 flex flex-col gap-1.5 overflow-y-auto no-scrollbar pr-1">
                <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold px-2 pb-1">
                    {isVi ? "Danh mục" : "Categories"}
                </p>
                {CATEGORIES.map((cat) => {
                    const isActive = activeCategory === cat.key
                    const Icon = cat.icon
                    const c = colorMap[cat.color]
                    const count = categoryCounts[cat.key] || 0
                    if (cat.key !== "all" && count === 0) return null

                    return (
                        <button
                            key={cat.key}
                            onClick={() => setActiveCategory(cat.key)}
                            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium w-full text-left transition-all ${
                                isActive
                                    ? `${c.bg} ${c.border} ${c.text} border`
                                    : "text-white/60 hover:text-white hover:bg-white/5 border border-transparent"
                            }`}
                        >
                            <Icon size={14} />
                            <span className="flex-1 truncate">{isVi ? cat.label : cat.labelEn}</span>
                            <span className="text-[10px] opacity-60">{count}</span>
                        </button>
                    )
                })}

                {/* ─── Presets Section ─────────────────────────── */}
                <div className="mt-4 pt-3 border-t border-white/10">
                    <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold px-2 pb-2">
                        {isVi ? "Bộ cài nhanh" : "Quick Packs"}
                    </p>
                    {PRESETS.map((preset) => {
                        const c = colorMap[preset.color]
                        return (
                            <button
                                key={preset.id}
                                onClick={() => handlePreset(preset.ids)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium w-full text-left mb-1.5 border border-white/5 ${c.text} opacity-70 hover:opacity-100`}
                            >
                                <Zap size={12} />
                                <span className="truncate">{isVi ? preset.label : preset.labelEn}</span>
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* ─── Main Content ────────────────────────────────── */}
            <div className="flex-1 flex flex-col min-h-0 gap-3">
                {/* ─── Search + Actions Bar ────────────────────── */}
                <div className="flex items-center gap-3">
                    {/* Search */}
                    <div className="relative flex-1">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={isVi ? "Tìm kiếm ứng dụng..." : "Search apps..."}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#09090b]/80 border border-white/10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-500/40"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white">
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    {/* Select all / deselect */}
                    <Button
                        variant="ghost"
                        onClick={selectAllVisible}
                        className="px-3 py-2 rounded-xl text-xs font-bold tracking-wider uppercase border border-white/10 hover:bg-white/5 text-white/50 hover:text-white"
                    >
                        {isVi ? "Chọn tất cả" : "Select All"}
                    </Button>

                    {selectedApps.length > 0 && (
                        <Button
                            variant="ghost"
                            onClick={clearSelection}
                            className="px-3 py-2 rounded-xl text-xs font-bold tracking-wider uppercase border border-white/10 hover:bg-white/5 text-white/50 hover:text-white"
                        >
                            {isVi ? "Bỏ chọn" : "Clear"} ({selectedApps.length})
                        </Button>
                    )}

                    {/* Install button */}
                    <Button
                        variant="ghost"
                        disabled={selectedApps.length === 0 || isInstalling}
                        onClick={handleBatchInstall}
                        className={`gap-2 px-5 py-2.5 rounded-xl text-xs font-bold tracking-wider uppercase transition-all ${
                            selectedApps.length === 0 || isInstalling
                                ? "bg-white/5 text-white/30 border border-white/10"
                                : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 hover:border-emerald-400/50 shadow-lg shadow-emerald-500/10"
                        }`}
                    >
                        {isInstalling ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                        {isInstalling
                            ? (isVi ? "Đang cài..." : "Installing...")
                            : (isVi ? "Cài đặt" : "Install")}{" "}
                        {selectedApps.length > 0 ? `(${selectedApps.length})` : ""}
                    </Button>
                </div>

                {/* ─── App Grid ─────────────────────────────────── */}
                <div className="flex-1 overflow-y-auto no-scrollbar">
                    {filteredApps.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 text-white/30">
                            <Search size={32} className="mb-2 opacity-50" />
                            <p className="text-sm">{isVi ? "Không tìm thấy ứng dụng nào" : "No apps found"}</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pb-4">
                            {filteredApps.map((app: AppItem) => (
                                <AppCard
                                    key={app.id}
                                    app={app}
                                    isSelected={selectedApps.includes(app.id)}
                                    isFavorite={favorites.includes(app.id)}
                                    onToggle={() => toggleApp(app.id)}
                                    onToggleFavorite={() => toggleFavorite(app.id)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

// ─── App Card (memoized for performance) ─────────────────────────
const AppCard = memo(function AppCard({ app, isSelected, isFavorite, onToggle, onToggleFavorite }: {
    app: AppItem; isSelected: boolean; isFavorite: boolean
    onToggle: () => void; onToggleFavorite: () => void
}) {
    const [imgError, setImgError] = useState(false)
    const catColor = getCatColor(app.category)

    return (
        <div
            className={`group relative p-4 rounded-2xl border cursor-pointer ${
                isSelected
                    ? "border-emerald-500/40 bg-emerald-950/20"
                    : "border-white/5 bg-[#09090b]/80 hover:bg-[#0a0a0c] hover:border-white/10"
            }`}
            onClick={onToggle}
        >
            <div className="flex items-start gap-3">
                {/* Icon */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden ${isSelected ? "bg-emerald-500/20" : "bg-white/5 border border-white/10"}`}>
                    {app.icon && !imgError ? (
                        <img
                            src={app.icon}
                            alt={app.name}
                            className="w-7 h-7 object-contain"
                            onError={() => setImgError(true)}
                            loading="lazy"
                        />
                    ) : (
                        <Package size={18} className="text-white/40" />
                    )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <h3 className={`font-bold text-sm tracking-wide truncate ${isSelected ? "text-white" : "text-white/80 group-hover:text-white"}`}>
                            {app.name}
                        </h3>
                        {app.warning && (
                            <AlertTriangle size={12} className="text-amber-400 flex-shrink-0" />
                        )}
                    </div>
                    <p className="text-[11px] text-white/40 truncate mt-0.5">{app.info}</p>
                    <div className="flex items-center gap-2 mt-2">
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-widest ${catColor.bg} ${catColor.text} ${catColor.border} border`}>
                            {app.category}
                        </span>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col items-center gap-1.5">
                    {/* Checkbox */}
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                        isSelected
                            ? "bg-emerald-500/20 border-emerald-400 text-emerald-400"
                            : "border-white/20 bg-transparent group-hover:border-white/40"
                    }`}>
                        {isSelected && <Check size={12} />}
                    </div>

                    {/* Favorite */}
                    <button
                        onClick={(e) => { e.stopPropagation(); onToggleFavorite() }}
                        className={`p-0.5 rounded transition-all ${
                            isFavorite ? "text-amber-400" : "text-white/20 hover:text-amber-400/60"
                        }`}
                    >
                        {isFavorite ? <Star size={12} fill="currentColor" /> : <StarOff size={12} />}
                    </button>

                    {/* External link */}
                    {app.link && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                invoke({ channel: "shell:open-external", payload: app.link })
                            }}
                            className="p-0.5 text-white/20 hover:text-cyan-400 rounded transition-all"
                        >
                            <ExternalLink size={12} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
})

// ─── Bloatware Tab ───────────────────────────────────────────────
function BloatwareTab({ bloatSelected, toggleBloat, handleBloatRemove, isRemoving, setBloatSelected, isVi, t }: any) {
    return (
        <div className="flex-1 overflow-y-auto no-scrollbar space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-white/50 text-sm uppercase tracking-widest font-bold">
                        {isVi ? "Kế hoạch gỡ bỏ" : "Removal Plan"}
                    </p>
                </div>
                <div className="flex gap-3">
                    <Button
                        variant="ghost"
                        onClick={() => setBloatSelected([])}
                        disabled={bloatSelected.length === 0}
                        className={`px-4 py-2 rounded-xl text-sm font-bold tracking-wider uppercase transition-all ${
                            bloatSelected.length > 0
                                ? "text-white/60 hover:bg-white/5 hover:text-white border border-white/10"
                                : "text-white/10"
                        }`}
                    >
                        {isVi ? "Huỷ Chọn" : "Clear"}
                    </Button>
                    <Button
                        variant="ghost"
                        disabled={bloatSelected.length === 0 || isRemoving}
                        onClick={handleBloatRemove}
                        className={`gap-2 px-6 py-2 rounded-xl text-sm font-bold tracking-wider uppercase transition-all shadow-lg ${
                            bloatSelected.length === 0 || isRemoving
                                ? "bg-white/5 text-white/30 border border-white/10"
                                : "bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20 hover:border-rose-400/50 shadow-rose-500/20"
                        }`}
                    >
                        {isRemoving ? <RefreshCw size={16} className="animate-spin" /> : <PackageX size={16} />}
                        {isRemoving ? (isVi ? "Đang Tiễn..." : "Removing...") : (isVi ? "Trảm Hệ Thống" : "Remove")} {bloatSelected.length > 0 ? `(${bloatSelected.length})` : ""}
                    </Button>
                </div>
            </div>

            {/* Bloatware Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {bloatwareApps.map((appItem) => {
                    const isActive = bloatSelected.includes(appItem.id)
                    return (
                        <div
                            key={appItem.id}
                            className={`p-5 rounded-2xl border backdrop-blur-xl transition-all cursor-pointer group shadow-[0_8px_30px_rgba(0,0,0,0.5)] ${
                                isActive
                                    ? "border-rose-500/40 bg-rose-950/20 shadow-[0_0_20px_rgba(244,63,94,0.15)]"
                                    : "border-white/5 bg-[#09090b]/80 hover:bg-[#0a0a0c]/90 hover:border-white/10 hover:-translate-y-1"
                            }`}
                            onClick={() => toggleBloat(appItem.id)}
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="space-y-1">
                                    <h3 className={`font-bold tracking-wider text-sm transition-colors ${isActive ? "text-white" : "text-white/80 group-hover:text-white"}`}>
                                        {appItem.label}
                                    </h3>
                                    <p className="text-xs text-white/40">{t(`apps.items.${appItem.id}`)}</p>
                                </div>
                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                                    isActive
                                        ? "bg-rose-500/20 border-rose-400 text-rose-400"
                                        : "border-white/20 bg-transparent group-hover:border-white/40"
                                }`}>
                                    {isActive && <CheckCircle2 size={16} />}
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

// ─── Queue Panel ─────────────────────────────────────────────────
function QueuePanel({ queue, isInstalling, onClose, onClear, isVi }: {
    queue: QueueItem[]; isInstalling: boolean
    onClose: () => void; onClear: () => void; isVi: boolean
}) {
    const doneCount = queue.filter((q) => q.status === "done").length
    const errorCount = queue.filter((q) => q.status === "error").length

    return (
        <div className="fixed right-0 top-[42px] bottom-0 w-[340px] bg-[#0A0A0C]/95 backdrop-blur-xl border-l border-white/10 z-50 flex flex-col shadow-[-8px_0_30px_rgba(0,0,0,0.5)]">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                <div>
                    <h3 className="text-sm font-bold text-white tracking-wider uppercase">
                        {isVi ? "Hàng Đợi Cài Đặt" : "Install Queue"}
                    </h3>
                    <p className="text-[10px] text-white/40 mt-0.5">
                        {doneCount}/{queue.length} {isVi ? "hoàn tất" : "done"}
                        {errorCount > 0 && ` • ${errorCount} ${isVi ? "lỗi" : "errors"}`}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {!isInstalling && queue.length > 0 && (
                        <button onClick={onClear} className="text-white/30 hover:text-white text-xs uppercase font-bold tracking-wider">
                            {isVi ? "Xóa" : "Clear"}
                        </button>
                    )}
                    <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10 text-white/40 hover:text-white">
                        <X size={16} />
                    </button>
                </div>
            </div>

            {/* Progress Bar */}
            {queue.length > 0 && (
                <div className="h-1 bg-white/5">
                    <div
                        className="h-full bg-emerald-400 transition-all"
                        style={{ width: `${(doneCount / queue.length) * 100}%` }}
                    />
                </div>
            )}

            {/* Queue Items */}
            <div className="flex-1 overflow-y-auto no-scrollbar px-3 py-2">
                {queue.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-white/20">
                        <Layers size={24} className="mb-2" />
                        <p className="text-xs">{isVi ? "Chưa có app nào" : "No apps in queue"}</p>
                    </div>
                ) : (
                    <div className="space-y-1.5">
                        {queue.map((item) => (
                            <div
                                key={item.id}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${
                                    item.status === "installing"
                                        ? "border-cyan-500/30 bg-cyan-500/5"
                                        : item.status === "done"
                                        ? "border-emerald-500/20 bg-emerald-500/5"
                                        : item.status === "error"
                                        ? "border-rose-500/20 bg-rose-500/5"
                                        : "border-white/5 bg-white/[0.02]"
                                }`}
                            >
                                {/* Status Icon */}
                                <div className="flex-shrink-0">
                                    {item.status === "pending" && <div className="w-4 h-4 rounded-full border-2 border-white/20" />}
                                    {item.status === "installing" && <Loader2 size={16} className="text-cyan-400 animate-spin" />}
                                    {item.status === "done" && <CheckCircle2 size={16} className="text-emerald-400" />}
                                    {item.status === "error" && <X size={16} className="text-rose-400" />}
                                </div>
                                {/* Name */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-white/80 truncate">{item.name}</p>
                                    {item.message && (
                                        <p className="text-[10px] text-white/40 truncate">{item.message}</p>
                                    )}
                                </div>
                                {/* Status label */}
                                <span className={`text-[9px] font-bold uppercase tracking-widest flex-shrink-0 ${
                                    item.status === "installing" ? "text-cyan-400"
                                    : item.status === "done" ? "text-emerald-400"
                                    : item.status === "error" ? "text-rose-400"
                                    : "text-white/30"
                                }`}>
                                    {item.status === "pending" ? "⏳" : item.status === "installing" ? "⬇️" : item.status === "done" ? "✅" : "❌"}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
