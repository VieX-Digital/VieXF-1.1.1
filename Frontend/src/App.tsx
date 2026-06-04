import { useState, useEffect, useLayoutEffect } from "react"
import { Routes, Route, Navigate, useLocation } from "react-router-dom"
import { AnimatePresence, motion } from "framer-motion"
import TitleBar from "./components/titlebar"
import Nav from "./components/nav"
import "react-toastify/dist/ReactToastify.css"
import "./app.css"
import { ToastContainer } from "react-toastify"
import useBackgroundStore from "./store/backgroundStore"
import useAuthStore from "./store/authStore"
import Home from "./pages/Home"
import Tweaks from "./pages/Tweaks"
import Clean from "./pages/Clean"
import Apps from "./pages/Apps"
import Utilities from "./pages/Utilities"
import DNS from "./pages/DNS"
import Settings from "./pages/Settings"
import Backup from "./pages/Backup"
import Optimize from "./pages/Optimize"
import Profiles from "./pages/Profiles"
import Gamemode from "./pages/Gamemode"
import RamClear from "./pages/RamClear"
import Diagnostics from "./pages/Diagnostics"
import Recovery from "./pages/Recovery"
import Logs from "./pages/Logs"
import Login from "./pages/Login"
import Warning from "./components/Warning"
import FirstTime from "./components/firsttime"
import UpdateManager from "./components/updatemanager"
import ProTrialExpiredModal from "./components/ProTrialExpiredModal"
import { updateThemeColors } from "./lib/theme"
import { invoke } from "@/lib/electron"
import { toastContainerConfig } from "@/lib/toast"
import { variants } from "@/lib/animations"
import { useAdaptiveMotion } from "@/lib/performance"

const DEFAULT_DISCORD_PURCHASE =
  "https://discord.com/channels/1274585470633906176/1466020101554835466"

function App() {
  const [theme] = useState(localStorage.getItem("theme") || "system")
  const location = useLocation()
  const [proTrialExpiredOpen, setProTrialExpiredOpen] = useState(false)
  const [purchaseDiscordUrl, setPurchaseDiscordUrl] = useState(DEFAULT_DISCORD_PURCHASE)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [hasAcceptedRisk, setHasAcceptedRisk] = useState(false)

  const {
    backgroundImageUrl,
    backgroundPosition,
    backgroundSize,
    backgroundRepeat,
    backgroundOpacity,
  } = useBackgroundStore()

  useEffect(() => {
    document.body.classList.remove("light", "purple", "dark", "gray", "classic")
    document.body.classList.add("dark")
    const savedColor = localStorage.getItem("vie:primaryColor")
    if (savedColor) updateThemeColors(savedColor)
  }, [theme])

  useEffect(() => {
    setHasAcceptedRisk(localStorage.getItem("acker_risk_accepted") === "true")
  }, [])

  useEffect(() => {
    invoke({ channel: "license:get", payload: null })
      .then((r: unknown) => {
        const lic = r as { proTrialExpired?: boolean; discordUrl?: string }
        if (lic?.proTrialExpired) {
          if (typeof lic.discordUrl === "string" && lic.discordUrl.startsWith("http"))
            setPurchaseDiscordUrl(lic.discordUrl)
          setProTrialExpiredOpen(true)
        }
      })
      .catch(() => undefined)
  }, [])

  useLayoutEffect(() => {
    if (backgroundImageUrl) {
      document.body.style.backgroundImage = `url(${backgroundImageUrl})`
      document.body.style.backgroundPosition = backgroundPosition
      document.body.style.backgroundSize = backgroundSize
      document.body.style.backgroundRepeat = backgroundRepeat
      document.documentElement.style.setProperty(
        "--background-overlay-opacity",
        (backgroundOpacity / 100).toString(),
      )
      document.body.classList.add("has-custom-background")
    } else {
      document.body.style.backgroundImage = ""
      document.body.style.backgroundPosition = ""
      document.body.style.backgroundSize = ""
      document.body.style.backgroundRepeat = ""
      document.documentElement.style.removeProperty("--background-overlay-opacity")
      document.body.classList.remove("has-custom-background")
    }
  }, [backgroundImageUrl, backgroundPosition, backgroundSize, backgroundRepeat, backgroundOpacity])

  const { isAuthenticated: authStoreAuthenticated } = useAuthStore()

  useEffect(() => {
    if (authStoreAuthenticated) setIsAuthenticated(true)
  }, [authStoreAuthenticated])

  const renderContent = () => {
    if (!isAuthenticated) {
      return <Login onLoginSuccess={() => setIsAuthenticated(true)} />
    }

    if (!hasAcceptedRisk) {
      return (
        <div className="w-screen h-screen bg-black">
          <Warning
            onAccept={() => {
              localStorage.setItem("acker_risk_accepted", "true")
              setHasAcceptedRisk(true)
            }}
          />
        </div>
      )
    }

    return (
      <div className="flex flex-col h-screen bg-transparent text-vie-text overflow-hidden font-sans select-none">
        <FirstTime />
        <ProTrialExpiredModal
          open={proTrialExpiredOpen}
          onClose={() => setProTrialExpiredOpen(false)}
          discordUrl={purchaseDiscordUrl}
        />
        <BackgroundEffects />
        <HUDOverlay />
        <TitleBar />
        <div className="flex-1 w-full pt-[42px] overflow-hidden">
          <div className="h-full w-full flex">
            <Nav />
            <main className="h-full flex-1 overflow-y-auto overflow-x-hidden pl-[112px] lg:pl-[120px] 2xl:pl-[128px] pr-8 lg:pr-12 2xl:pr-16 transition-[padding] duration-200">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={location.pathname}
                  variants={variants.pageEnter}
                  initial="hidden"
                  animate="show"
                  exit="exit"
                  className="h-full will-change-[transform,opacity] transform-gpu"
                >
                  <Routes location={location}>
                    <Route path="/" element={<Home />} />
                    <Route path="/tweaks" element={<Tweaks />} />
                    <Route path="/clean" element={<Clean />} />
                    <Route path="/backup" element={<Backup />} />
                    <Route path="/utilities" element={<Utilities />} />
                    <Route path="/dns" element={<DNS />} />
                    <Route path="/apps" element={<Apps />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/optimize" element={<Optimize />} />
                    <Route path="/gamemode" element={<Gamemode />} />
                    <Route path="/ramclear" element={<RamClear />} />
                    <Route path="/operations" element={<Navigate to="/optimize" replace />} />
                    <Route path="/profiles" element={<Profiles />} />
                    <Route path="/diagnostics" element={<Diagnostics />} />
                    <Route path="/recovery" element={<Recovery />} />
                    <Route path="/logs" element={<Logs />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </motion.div>
              </AnimatePresence>
            </main>
          </div>
        </div>
        <UpdateManager />
      </div>
    )
  }

  return (
    <>
      {renderContent()}
      <ToastContainer {...toastContainerConfig} />
    </>
  )
}

function BackgroundEffects() {
  const { disableNonEssentialEffects } = useAdaptiveMotion()
  if (localStorage.getItem("vie:backgroundEffect") === "false" || disableNonEssentialEffects)
    return null
  return (
    <div className="fixed inset-0 pointer-events-none -z-10 contain-paint">
      {/* Base dark background */}
      <div className="absolute inset-0 bg-[#0A0A0C]" />

      {/* Ambient glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[radial-gradient(ellipse_at_center,_rgba(8,145,178,0.10),_transparent_70%)] transform-gpu hud-glow-1" />
      <div className="absolute top-[10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-[radial-gradient(ellipse_at_center,_rgba(37,99,235,0.08),_transparent_70%)] transform-gpu hud-glow-2" />
      <div className="absolute bottom-[-10%] left-[20%] w-[50%] h-[50%] rounded-full bg-[radial-gradient(ellipse_at_center,_rgba(0,255,255,0.04),_transparent_70%)] transform-gpu" />

      {/* Drifting Grid */}
      <div className="absolute inset-0 opacity-[0.4] hud-grid-background" />

      {/* Scanline */}
      <div className="absolute inset-x-0 top-0 h-[30vh] opacity-60 pointer-events-none hud-scanline" />

      {/* Pulse Nodes */}
      <div className="absolute top-[25%] left-[15%] w-1.5 h-1.5 rounded-full bg-cyan-400 opacity-30 shadow-[0_0_8px_rgba(6,182,212,0.8)] tech-pulse-node-1" />
      <div className="absolute top-[65%] right-[20%] w-1.5 h-1.5 rounded-full bg-cyan-400 opacity-20 shadow-[0_0_8px_rgba(6,182,212,0.8)] tech-pulse-node-2" />
      <div className="absolute bottom-[20%] left-[45%] w-1.5 h-1.5 rounded-full bg-cyan-400 opacity-25 shadow-[0_0_8px_rgba(6,182,212,0.8)] tech-pulse-node-3" />
    </div>
  )
}

function HUDOverlay() {
  const { disableNonEssentialEffects } = useAdaptiveMotion()
  if (localStorage.getItem("vie:backgroundEffect") === "false" || disableNonEssentialEffects)
    return null
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {/* L-Brackets */}
      {/* Top Left */}
      <div className="absolute top-[52px] left-6 w-4 h-4 border-t-2 border-l-2 border-cyan-500/15" />
      <div className="absolute top-[52px] left-12 text-[9px] font-mono text-cyan-500/30 tracking-widest uppercase">
        SYS_INTEL // ONLINE
      </div>

      {/* Top Right */}
      <div className="absolute top-[52px] right-6 w-4 h-4 border-t-2 border-r-2 border-cyan-500/15" />

      {/* Bottom Left */}
      <div className="absolute bottom-6 left-6 w-4 h-4 border-b-2 border-l-2 border-cyan-500/15" />

      {/* Bottom Right */}
      <div className="absolute bottom-6 right-6 w-4 h-4 border-b-2 border-r-2 border-cyan-500/15" />
      <div className="absolute bottom-6 right-12 text-[9px] font-mono text-cyan-500/30 tracking-widest uppercase text-right">
        ADAPTIVE_PERF // ACTIVE
      </div>
    </div>
  )
}

export default App
