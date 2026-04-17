import { useState, useEffect, useLayoutEffect } from "react"
import { Routes, Route, Navigate, useLocation } from "react-router-dom"
import TitleBar from "./components/titlebar"
import Nav from "./components/nav"
import "./app.css"
import { ToastContainer, cssTransition } from "react-toastify"
import useBackgroundStore from "./store/backgroundStore"
import useAuthStore from "./store/authStore"

// Pages
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
import Diagnostics from "./pages/Diagnostics"
import Recovery from "./pages/Recovery"
import Logs from "./pages/Logs"
import Login from "./pages/Login"

// Components
import FirstTime from "./components/firsttime"
import UpdateManager from "./components/updatemanager"
import ProTrialExpiredModal from "./components/ProTrialExpiredModal"
import { updateThemeColors } from "./lib/theme"
import { invoke } from "@/lib/electron"

// react-toastify splits enter/exit by spaces and calls classList.add — empty strings throw.
const NoMotionToastTransition = cssTransition({
    enter: "vie-toast-motion-placeholder",
    exit: "vie-toast-motion-placeholder",
    collapse: false,
    appendPosition: false,
})

const DEFAULT_DISCORD_PURCHASE =
    "https://discord.com/channels/1274585470633906176/1466020101554835466"

function App() {
    const [theme] = useState(localStorage.getItem("theme") || "system")
    const location = useLocation()
    const [proTrialExpiredOpen, setProTrialExpiredOpen] = useState(false)
    const [purchaseDiscordUrl, setPurchaseDiscordUrl] = useState(DEFAULT_DISCORD_PURCHASE)

    const {
        backgroundImageUrl,
        backgroundPosition,
        backgroundSize,
        backgroundRepeat,
        backgroundOpacity,
    } = useBackgroundStore()

    useEffect(() => {
        // Theme logic - simpler implementation
        const applyTheme = (theme: string) => {
            document.body.classList.remove("light", "purple", "dark", "gray", "classic")
            // Currently forcing dark/clean theme as requested design
            document.body.classList.add("dark")
        }
        applyTheme(theme)

        // Sync Primary Color
        const savedColor = localStorage.getItem("vie:primaryColor")
        if (savedColor) {
            updateThemeColors(savedColor)
        }

    }, [theme])

    useEffect(() => {
        invoke({ channel: "license:get", payload: null })
            .then((r: unknown) => {
                const lic = r as { proTrialExpired?: boolean; discordUrl?: string }
                if (lic?.proTrialExpired) {
                    if (typeof lic.discordUrl === "string" && lic.discordUrl.startsWith("http")) {
                        setPurchaseDiscordUrl(lic.discordUrl)
                    }
                    setProTrialExpiredOpen(true)
                }
            })
            .catch(() => undefined)
    }, [])

    // Apply background styles globally
    useLayoutEffect(() => {
        if (backgroundImageUrl) {
            document.body.style.backgroundImage = `url(${backgroundImageUrl})`
            document.body.style.backgroundPosition = backgroundPosition
            document.body.style.backgroundSize = backgroundSize
            document.body.style.backgroundRepeat = backgroundRepeat
            document.documentElement.style.setProperty('--background-overlay-opacity', (backgroundOpacity / 100).toString());
            document.body.classList.add("has-custom-background");
        } else {
            document.body.style.backgroundImage = ""
            document.body.style.backgroundPosition = ""
            document.body.style.backgroundSize = ""
            document.body.style.backgroundRepeat = ""
            document.documentElement.style.removeProperty('--background-overlay-opacity');
            document.body.classList.remove("has-custom-background");
        }
    }, [backgroundImageUrl, backgroundPosition, backgroundSize, backgroundRepeat, backgroundOpacity])

    const { isAuthenticated } = useAuthStore()

    // Show login gate if not authenticated
    if (!isAuthenticated) {
        return <Login />
    }

    return (
        <div className="flex flex-col h-screen bg-transparent text-vie-text overflow-hidden font-sans select-none">
            <FirstTime />

            <ProTrialExpiredModal
                open={proTrialExpiredOpen}
                onClose={() => setProTrialExpiredOpen(false)}
                discordUrl={purchaseDiscordUrl}
            />

            {/* Background Effects - Global overlay for all pages */}
            <BackgroundEffects />

            <TitleBar />

            <div className="flex-1 w-full pt-[42px] overflow-hidden">
                <div className="h-full w-full flex">
                    <Nav />
                    <main className="h-full flex-1 overflow-y-auto overflow-x-hidden">
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
                            <Route path="/operations" element={<Navigate to="/optimize" replace />} />
                            <Route path="/profiles" element={<Profiles />} />
                            <Route path="/diagnostics" element={<Diagnostics />} />
                            <Route path="/recovery" element={<Recovery />} />
                            <Route path="/logs" element={<Logs />} />
                            <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>
                    </main>
                </div>
            </div>

            <UpdateManager />
            <ToastContainer
                stacked
                limit={5}
                position="bottom-right"
                theme="dark"
                transition={NoMotionToastTransition}
                hideProgressBar
                pauseOnFocusLoss={false}
                toastClassName="!bg-vie-card !border !border-vie-border !text-vie-text !rounded-xl !shadow-2xl !backdrop-blur-lg"
            />
        </div>
    )
}

// Background Effects Component - Ultra optimizations for performance
function BackgroundEffects() {
    const backgroundEffectEnabled = localStorage.getItem("vie:backgroundEffect") !== "false"

    if (!backgroundEffectEnabled) return null

    return (
        <div className="fixed inset-0 pointer-events-none -z-10">
            {/* Base Charcoal Background overrides */}
            <div className="absolute inset-0 bg-[#0A0A0C]" />
            
            {/* Lightweight CSS Gradients instead of heavy blurs */}
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-900/10 to-transparent" />
            <div className="absolute top-[10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/10 to-transparent" />
            <div className="absolute bottom-[-10%] left-[20%] w-[50%] h-[50%] rounded-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#00ffff]/5 to-transparent" />
            
            {/* Subtle Grid Pattern */}
            <div className="absolute inset-0 opacity-[0.02] bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:64px_64px]" />
        </div>
    )
}

export default App
