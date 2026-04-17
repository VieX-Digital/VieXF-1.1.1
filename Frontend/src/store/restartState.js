import { create } from "zustand"

const useRestartStore = create((set) => ({
  needsRestart: false,
  setNeedsRestart: (value) => set(() => ({ needsRestart: value })),
  resetRestartState: () => set(() => ({ needsRestart: false })),
}))

export default useRestartStore
