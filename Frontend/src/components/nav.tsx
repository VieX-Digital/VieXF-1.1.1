import { useEffect, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { clsx } from "clsx"
import { motion } from "framer-motion"
import { hoverPresets, variants } from "@/lib/animations"
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
  Gamepad2,
  MemoryStick,
  LogOut,
} from "lucide-react"
import useAuthStore from "@/store/authStore"
import { invoke } from "@/lib/electron"

function Nav() {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState("home")
  const { user, logout } = useAuthStore()
  const [avatarFailed, setAvatarFailed] = useState(false)

  const getTabs = () => [
    { id: "home", label: t("nav.home"), path: "/", icon: Gauge },
    { id: "tweaks", label: t("nav.tweaks"), path: "/tweaks", icon: Wrench },
    { id: "clean", label: t("nav.clean"), path: "/clean", icon: Sparkles },
    { id: "backup", label: t("nav.backup"), path: "/backup", icon: ArchiveRestore },
    { id: "utilities", label: t("nav.utilities"), path: "/utilities", icon: Box },
    { id: "dns", label: t("nav.dns"), path: "/dns", icon: EthernetPort },
    { id: "apps", label: t("nav.apps"), path: "/apps", icon: LayoutGrid },
    { id: "optimize", label: t("nav.optimize"), path: "/optimize", icon: Rocket },
    { id: "gamemode", label: t("nav.gamemode"), path: "/gamemode", icon: Gamepad2 },
    { id: "ramclear", label: "RamClear", path: "/ramclear", icon: MemoryStick },
    { id: "profiles", label: t("nav.profiles"), path: "/profiles", icon: Gauge },
    { id: "diagnostics", label: t("nav.diagnostics"), path: "/diagnostics", icon: Activity },
    { id: "recovery", label: t("nav.recovery"), path: "/recovery", icon: ArchiveRestore },
    { id: "logs", label: t("nav.logs"), path: "/logs", icon: FileText },
    { id: "settings", label: t("nav.settings"), path: "/settings", icon: Settings },
  ]

  const tabs = getTabs()
  type NavTab = (typeof tabs)[number]

  useEffect(() => {
    const current = tabs.find((tab) => tab.path === location.pathname)
    if (current) setActiveTab(current.id)
    else if (location.pathname === "/") setActiveTab("home")
  }, [location, t])

  const primaryTabs = tabs.filter((tab) => tab.id !== "settings")
  const secondaryTabs = tabs.filter((tab) => tab.id === "settings")

  const handleLogout = async () => {
    try {
      localStorage.clear()
      await invoke({ channel: "auth:logout", payload: null })
    } catch {
      // ignore IPC errors on logout
    }
    logout()
    window.location.href = "/login"
  }

  const avatarUrl =
    !avatarFailed && user?.avatar
      ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`
      : ""

  const displayName = user?.globalName || user?.username || "User"
  const initials = displayName.slice(0, 2).toUpperCase()

  const renderTab = (tab: NavTab) => {
    const isActive = activeTab === tab.id
    const Icon = tab.icon

    return (
      <motion.button
        key={tab.id}
        aria-label={tab.label}
        onClick={() => navigate(tab.path)}
        className={clsx(
          "relative flex items-center gap-4 p-3 mx-3 my-1 rounded-lg cursor-pointer transition-colors duration-150 text-left w-[calc(100%-24px)] transform-gpu will-change-[transform,opacity]",
          isActive
            ? "bg-cyan-950/20 text-[#00f0ff] ring-1 ring-cyan-500/10 shadow-[0_0_12px_rgba(0,255,255,0.05)]"
            : "text-zinc-400 hover:text-white hover:bg-white/5",
        )}
        whileHover={!isActive ? hoverPresets.navItemHover : { scale: 1.005 }}
        whileTap={hoverPresets.buttonTap}
      >
        {isActive && (
          <motion.span
            layoutId="nav-active"
            className="absolute inset-0 rounded-lg bg-cyan-500/[0.02] ring-1 ring-cyan-500/[0.04]"
            transition={variants.sidebarReveal.expanded.transition}
          />
        )}
        {isActive && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-r bg-cyan-400 cyan-energy-bar" />
        )}
        <motion.span className="relative z-10 shrink-0" whileHover={hoverPresets.iconNudge}>
          <Icon
            size={20}
            className={clsx(
              "w-5 h-5",
              isActive
                ? "text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.4)]"
                : "text-current",
            )}
          />
        </motion.span>
        <span className="relative z-10 text-sm font-medium opacity-0 w-0 overflow-hidden whitespace-nowrap transition-[opacity,width] duration-200 ease-out group-hover:opacity-100 group-hover:w-auto">
          {tab.label}
        </span>
      </motion.button>
    )
  }

  return (
    <motion.aside
      variants={variants.sidebarReveal}
      initial="collapsed"
      whileHover="expanded"
      className="group fixed left-0 top-0 z-50 flex h-screen w-[72px] flex-col border-r border-white/5 bg-[#09090b] overflow-hidden pt-[42px] will-change-[width]"
    >
      {/* Top accent line */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      {/* Nav items */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-3 scrollbar-none">
        <div className="flex flex-col">{primaryTabs.map(renderTab)}</div>
      </div>

      {/* Bottom: settings + user profile */}
      <div className="mt-auto border-t border-white/5">
        {/* Settings */}
        <div className="py-2">{secondaryTabs.map(renderTab)}</div>

        {/* User profile */}
        <div className="border-t border-white/5 p-3">
          <div className="flex items-center gap-3 min-w-0">
            <motion.div
              className="relative w-9 h-9 shrink-0 rounded-full border border-white/10 bg-white/[0.04] overflow-hidden flex items-center justify-center text-[11px] font-bold text-white/70 ring-1 ring-black/30"
              whileHover={{ scale: 1.035 }}
              transition={{ type: "spring", stiffness: 420, damping: 34 }}
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  loading="lazy"
                  decoding="async"
                  onError={() => setAvatarFailed(true)}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                <span>{initials}</span>
              )}
            </motion.div>
            <div className="flex flex-1 items-center justify-between opacity-0 w-0 overflow-hidden whitespace-nowrap transition-[opacity,width] duration-200 ease-out group-hover:opacity-100 group-hover:w-auto">
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-medium text-white truncate max-w-[130px]">
                  {displayName}
                </span>
                {user?.username && user.globalName && (
                  <span className="text-xs text-zinc-500 truncate max-w-[130px]">
                    @{user.username}
                  </span>
                )}
              </div>
              <button
                onClick={handleLogout}
                aria-label="Logout"
                className="ml-2 shrink-0 p-1.5 rounded-md text-zinc-500 hover:text-red-500 hover:bg-red-500/10 cursor-pointer transition-colors duration-150"
              >
                <LogOut size={15} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.aside>
  )
}

export default Nav
