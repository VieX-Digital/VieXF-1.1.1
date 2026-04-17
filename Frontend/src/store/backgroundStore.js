import { create } from "zustand"

const useBackgroundStore = create((set) => ({
    backgroundImageUrl: localStorage.getItem("vie:backgroundImageUrl") || "",
    backgroundPosition: localStorage.getItem("vie:backgroundPosition") || "center",
    backgroundSize: localStorage.getItem("vie:backgroundSize") || "cover",
    backgroundRepeat: localStorage.getItem("vie:backgroundRepeat") || "no-repeat",
    backgroundOpacity: parseFloat(localStorage.getItem("vie:backgroundOpacity") || "1"),

    setBackgroundImageUrl: (url) => {
        set({ backgroundImageUrl: url })
        localStorage.setItem("vie:backgroundImageUrl", url)
    },
    setBackgroundPosition: (position) => {
        set({ backgroundPosition: position })
        localStorage.setItem("vie:backgroundPosition", position)
    },
    setBackgroundSize: (size) => {
        set({ backgroundSize: size })
        localStorage.setItem("vie:backgroundSize", size)
    },
    setBackgroundRepeat: (repeat) => {
        set({ backgroundRepeat: repeat })
        localStorage.setItem("vie:backgroundRepeat", repeat)
    },
    setBackgroundOpacity: (opacity) => {
        set({ backgroundOpacity: opacity })
        localStorage.setItem("vie:backgroundOpacity", String(opacity))
    },
}))

export default useBackgroundStore