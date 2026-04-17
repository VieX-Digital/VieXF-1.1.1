import { create } from "zustand"

export interface AppItem {
  name: string
  id: string
  category: string
  info: string
  link?: string
  icon?: string
  warning?: string
}

export type InstallStatus = "pending" | "installing" | "done" | "error"

export interface QueueItem {
  id: string
  name: string
  status: InstallStatus
  message?: string
}

interface AppsState {
  // Tab management
  activeTab: "store" | "bloatware"
  setActiveTab: (tab: "store" | "bloatware") => void

  // Selection
  selectedApps: string[]
  toggleApp: (id: string) => void
  selectMultiple: (ids: string[]) => void
  clearSelection: () => void

  // Search & filter
  searchQuery: string
  setSearchQuery: (q: string) => void
  activeCategory: string
  setActiveCategory: (cat: string) => void

  // Install queue
  installQueue: QueueItem[]
  isInstalling: boolean
  showQueue: boolean
  setShowQueue: (v: boolean) => void
  addToQueue: (items: QueueItem[]) => void
  updateQueueItem: (id: string, updates: Partial<QueueItem>) => void
  clearQueue: () => void
  setIsInstalling: (v: boolean) => void

  // Favorites
  favorites: string[]
  toggleFavorite: (id: string) => void
}

// Load favorites from localStorage
function loadFavorites(): string[] {
  try {
    const raw = localStorage.getItem("vie:app-favorites")
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveFavorites(favs: string[]) {
  try {
    localStorage.setItem("vie:app-favorites", JSON.stringify(favs))
  } catch {
    // ignore
  }
}

const useAppsStore = create<AppsState>((set, get) => ({
  // Tab
  activeTab: "store",
  setActiveTab: (tab) => set({ activeTab: tab }),

  // Selection
  selectedApps: [],
  toggleApp: (id) =>
    set((s) => ({
      selectedApps: s.selectedApps.includes(id)
        ? s.selectedApps.filter((x) => x !== id)
        : [...s.selectedApps, id],
    })),
  selectMultiple: (ids) =>
    set((s) => {
      const merged = new Set([...s.selectedApps, ...ids])
      return { selectedApps: [...merged] }
    }),
  clearSelection: () => set({ selectedApps: [] }),

  // Search & filter
  searchQuery: "",
  setSearchQuery: (q) => set({ searchQuery: q }),
  activeCategory: "all",
  setActiveCategory: (cat) => set({ activeCategory: cat }),

  // Install queue
  installQueue: [],
  isInstalling: false,
  showQueue: false,
  setShowQueue: (v) => set({ showQueue: v }),
  addToQueue: (items) =>
    set((s) => ({
      installQueue: [...s.installQueue, ...items],
      showQueue: true,
    })),
  updateQueueItem: (id, updates) =>
    set((s) => ({
      installQueue: s.installQueue.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      ),
    })),
  clearQueue: () => set({ installQueue: [], isInstalling: false }),
  setIsInstalling: (v) => set({ isInstalling: v }),

  // Favorites
  favorites: loadFavorites(),
  toggleFavorite: (id) =>
    set((s) => {
      const next = s.favorites.includes(id)
        ? s.favorites.filter((x) => x !== id)
        : [...s.favorites, id]
      saveFavorites(next)
      return { favorites: next }
    }),
}))

export default useAppsStore
