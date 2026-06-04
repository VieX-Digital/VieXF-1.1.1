import { useState, useEffect, useRef } from "react"
import { motion } from "framer-motion"
import { Minimize2, Maximize2, X } from "lucide-react"
import { onIpc } from "@/lib/electron"

export default function Titlebar() {
  const [maximized, setMaximized] = useState(false)
  const maximizedRef = useRef(false)

  useEffect(() => {
    if (!window.electron) return

    // Query initial state via IPC so we are always in sync on mount
    window.electron.ipcRenderer
      .invoke("window:getMaximized")
      .then((v: boolean) => {
        setMaximized(Boolean(v))
        maximizedRef.current = Boolean(v)
      })
      .catch(() => undefined)

    const offMax = onIpc({
      channel: "window-maximized",
      listener: () => {
        if (!maximizedRef.current) {
          maximizedRef.current = true
          setMaximized(true)
        }
      },
    })
    const offUnmax = onIpc({
      channel: "window-unmaximized",
      listener: () => {
        if (maximizedRef.current) {
          maximizedRef.current = false
          setMaximized(false)
        }
      },
    })

    return () => {
      offMax()
      offUnmax()
    }
  }, [])

  const handleMinimize = () => window.electron?.ipcRenderer.send("window-minimize")
  const handleMaximizeToggle = () => window.electron?.ipcRenderer.send("window-toggle-maximize")
  const handleClose = () => window.electron?.ipcRenderer.send("window-close")

  const spring = { type: "spring" as const, stiffness: 520, damping: 36, mass: 0.55 }

  return (
    <div className="h-[42px] flex justify-between items-center bg-[#0A0A0C] border-b border-white/[0.06] select-none pl-4 draggable z-[9999] fixed top-0 left-0 right-0">
      <div className="flex items-center gap-3 opacity-90">
        <div className="flex items-baseline gap-1.5 text-sm font-medium tracking-wide">
          <span className="text-white font-bold font-display">VieXF</span>
          <span className="text-[10px] text-white/40 font-mono ml-1"></span>
        </div>
      </div>

      <div className="flex h-full no-drag">
        <motion.button
          onClick={handleMinimize}
          title="Minimize"
          className="w-12 h-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/5 transition-colors duration-150 transform-gpu"
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.9 }}
          transition={spring}
        >
          <Minimize2 size={14} />
        </motion.button>

        <motion.button
          onClick={handleMaximizeToggle}
          title={maximized ? "Restore" : "Maximize"}
          className="w-12 h-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/5 transition-colors duration-150 transform-gpu"
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.9 }}
          transition={spring}
        >
          {maximized ? <Minimize2 size={13} className="rotate-180" /> : <Maximize2 size={13} />}
        </motion.button>

        <motion.button
          onClick={handleClose}
          title="Close"
          className="w-12 h-full flex items-center justify-center text-white/50 hover:text-white hover:bg-red-600/80 transition-colors duration-150 transform-gpu"
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.9 }}
          transition={spring}
        >
          <X size={14} />
        </motion.button>
      </div>
    </div>
  )
}
