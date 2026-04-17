import { useEffect, useMemo, useState } from "react"

const computeLayout = (width) => {
  const compactNav = width < 1200
  const navWidth = compactNav ? 64 : 208 // px

  let contentPadding = 24
  if (width < 768) {
    contentPadding = 16
  } else if (width < 1200) {
    contentPadding = 20
  }

  const scale = Math.min(Math.max(width / 1440, 0.85), 1.1)

  return {
    navWidth,
    compactNav,
    contentPadding,
    scale,
  }
}

export default function useResponsiveLayout() {
  const [layout, setLayout] = useState(() => computeLayout(typeof window !== "undefined" ? window.innerWidth : 1440))

  useEffect(() => {
    const handleResize = () => {
      setLayout(computeLayout(window.innerWidth))
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  useEffect(() => {
    document.documentElement.style.setProperty("--vie-nav-width", `${layout.navWidth}px`)
    document.documentElement.style.setProperty("--vie-content-padding", `${layout.contentPadding}px`)
    document.documentElement.style.setProperty("--vie-scale", layout.scale.toFixed(3))
  }, [layout])

  return useMemo(() => layout, [layout])
}
