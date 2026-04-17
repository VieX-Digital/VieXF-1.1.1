import { create } from "zustand"

export interface DiscordUser {
  id: string
  username: string
  discriminator: string
  globalName: string
  avatar: string
  nick: string | null
}

interface AuthState {
  isAuthenticated: boolean
  user: DiscordUser | null
  isLoading: boolean
  error: string | null
  setAuthenticated: (user: DiscordUser) => void
  setError: (error: string | null) => void
  setLoading: (loading: boolean) => void
  logout: () => void
}

const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  user: null,
  isLoading: true,
  error: null,

  setAuthenticated: (user) =>
    set({ isAuthenticated: true, user, isLoading: false, error: null }),

  setError: (error) =>
    set({ error, isLoading: false }),

  setLoading: (loading) =>
    set({ isLoading: loading }),

  logout: () =>
    set({ isAuthenticated: false, user: null, isLoading: false, error: null }),
}))

export default useAuthStore
