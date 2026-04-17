import { useState, useEffect } from "react"
import { Minimize2, Maximize2, CircleX } from "lucide-react"


declare global {
    interface Window {
        electron: {
            ipcRenderer: {
                send: (channel: string, ...args: any[]) => void
                on: (channel: string, func: (...args: any[]) => void) => void
                removeAllListeners: (channel: string) => void
            }
        }
    }
}

export default function Titlebar() {
    const [maximized, setMaximized] = useState(false)

    useEffect(() => {
        // Check if window.electron exists to prevent crash in non-electron env (dev)
        if (!window.electron) return

        const handleMaximize = () => setMaximized(true)
        const handleUnmaximize = () => setMaximized(false)

        window.electron.ipcRenderer.on("window-maximized", handleMaximize)
        window.electron.ipcRenderer.on("window-unmaximized", handleUnmaximize)

        return () => {
            window.electron.ipcRenderer.removeAllListeners("window-maximized")
            window.electron.ipcRenderer.removeAllListeners("window-unmaximized")
        }
    }, [])

    // Safely call electron methods with CORRECT channel names
    const handleMinimize = () => window.electron?.ipcRenderer.send("window-minimize")
    const handleMaximizeToggle = () => window.electron?.ipcRenderer.send("window-toggle-maximize")
    const handleClose = () => window.electron?.ipcRenderer.send("window-close")

    return (
        <div className="h-[42px] flex justify-between items-center bg-[#0A0A0C] border-b border-white/10 select-none pl-4 draggable z-[9999] fixed top-0 left-0 right-0">
            {/* App Title / Logo Area */}
            <div className="flex items-center gap-3 opacity-90">

                <div className="flex items-baseline gap-1.5 text-sm font-medium tracking-wide">
                    <span className="text-white font-bold font-display">VieXF</span>
                    <span className="text-[10px] text-white/40 font-mono ml-1"></span>
                </div>
            </div>

            {/* Window Controls */}
            <div className="flex h-full no-drag">
                <button
                    onClick={handleMinimize}
                    className="w-12 h-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/5"
                    title="Minimize"
                >
                    <Minimize2 size={14} />
                </button>

                <button
                    onClick={handleMaximizeToggle}
                    className="w-12 h-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/5"
                    title={maximized ? "Restore" : "Maximize"}
                >
                    {maximized ? (
                        <Minimize2 size={13} className="transform rotate-180" />
                    ) : (
                        <Maximize2 size={13} />
                    )}
                </button>

                <button
                    onClick={handleClose}
                    className="w-12 h-full flex items-center justify-center text-white/60 hover:text-white hover:bg-red-600/80"
                    title="Close"
                >
                    <CircleX size={14} />
                </button>
            </div>
        </div>
    )
}