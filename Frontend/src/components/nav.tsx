import { useEffect, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { clsx } from "clsx"
import {
    Gauge,
    Activity,
    Wrench,
    Sparkles,
    ArchiveRestore,
    Box,
    EthernetPort,
    LayoutGrid,
    Settings,
    Rocket,
    FileText,
} from "lucide-react"

function Nav() {
    const { t } = useTranslation()
    const location = useLocation()
    const navigate = useNavigate()
    const [activeTab, setActiveTab] = useState("home")

    // Helper to get translated label (still used for a11y/tooltip)
    const getTabs = () => [
        { id: "home", label: t("nav.home"), path: "/", icon: Gauge },
        { id: "tweaks", label: t("nav.tweaks"), path: "/tweaks", icon: Wrench },
        { id: "clean", label: t("nav.clean"), path: "/clean", icon: Sparkles },
        { id: "backup", label: t("nav.backup"), path: "/backup", icon: ArchiveRestore },
        { id: "utilities", label: t("nav.utilities"), path: "/utilities", icon: Box },
        { id: "dns", label: t("nav.dns"), path: "/dns", icon: EthernetPort },
        { id: "apps", label: t("nav.apps"), path: "/apps", icon: LayoutGrid },
        { id: "optimize", label: t("nav.optimize"), path: "/optimize", icon: Rocket },
        { id: "profiles", label: t("nav.profiles"), path: "/profiles", icon: Gauge },
        { id: "diagnostics", label: t("nav.diagnostics"), path: "/diagnostics", icon: Activity },
        { id: "recovery", label: t("nav.recovery"), path: "/recovery", icon: ArchiveRestore },
        { id: "logs", label: t("nav.logs"), path: "/logs", icon: FileText },
        { id: "settings", label: t("nav.settings"), path: "/settings", icon: Settings },
    ]

    const tabs = getTabs()
    type NavTab = (typeof tabs)[number]

    useEffect(() => {
        const current = tabs.find(tab => tab.path === location.pathname)
        if (current) setActiveTab(current.id)
        else if (location.pathname === "/") setActiveTab("home")
    }, [location, t])

    const primaryTabs = tabs.filter((tab) => tab.id !== "settings")
    const secondaryTabs = tabs.filter((tab) => tab.id === "settings")

    const renderTab = (tab: NavTab) => {
        const isActive = activeTab === tab.id
        const Icon = tab.icon

        return (
            <button
                key={tab.id}
                aria-label={tab.label}
                onClick={() => navigate(tab.path)}
                className={clsx(
                    "w-full h-9 px-3 rounded-md border text-sm font-medium flex items-center gap-2.5 text-left",
                    isActive
                        ? "bg-cyan-950/30 border-cyan-500/40 text-cyan-300"
                        : "bg-transparent border-transparent text-white/70 hover:text-white hover:border-white/10 hover:bg-white/5"
                )}
            >
                <Icon size={16} />
                <span className="truncate">{tab.label}</span>
            </button>
        )
    }

    return (
        <aside className="w-[220px] h-full border-r border-white/10 bg-[#0A0A0C] px-3 py-3 flex flex-col">
            <div className="text-[11px] uppercase tracking-wider text-white/40 px-2 pb-2">Workspace</div>
            <div className="space-y-1">{primaryTabs.map(renderTab)}</div>
            <div className="mt-auto pt-3 border-t border-white/10 space-y-1">
                {secondaryTabs.map(renderTab)}
            </div>
        </aside>
    )
}

export default Nav