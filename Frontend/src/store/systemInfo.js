import { create } from "zustand"

const useSystemStore = create((set) => ({
  systemInfo: {},
  setSystemInfo: (info) => set(() => ({ systemInfo: info })),
}))

export default useSystemStore
