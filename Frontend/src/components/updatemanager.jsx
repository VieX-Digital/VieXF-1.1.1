import { useEffect, useRef } from "react"
import { toast } from "react-toastify"
import { invoke } from "@/lib/electron"

function UpdateManager() {
  const availableToastId = useRef(null)
  const downloadToastId = useRef(null)
  const downloadedToastId = useRef(null)

  useEffect(() => {
    const ipc = window.electron?.ipcRenderer
    if (!ipc?.on) return

    const dismissAll = () => {
      if (availableToastId.current) toast.dismiss(availableToastId.current)
      if (downloadToastId.current) toast.dismiss(downloadToastId.current)
      if (downloadedToastId.current) toast.dismiss(downloadedToastId.current)
      availableToastId.current = null
      downloadToastId.current = null
      downloadedToastId.current = null
    }

    const startDownload = async () => {
      if (downloadToastId.current) return
      toast.dismiss(availableToastId.current)
      availableToastId.current = null

      downloadToastId.current = toast.info("Đang tải bản cập nhật…", {
        autoClose: false,
        closeOnClick: false,
      })

      const res = await invoke({ channel: "updater:download" })
      if (!res?.ok) {
        toast.update(downloadToastId.current, {
          type: "error",
          render: res?.error ? String(res.error) : "Không thể tải cập nhật.",
          autoClose: 6000,
        })
        downloadToastId.current = null
      }
    }

    const installUpdate = async () => {
      await invoke({ channel: "updater:install" })
    }

    const onAvailable = (_event, payload) => {
      if (availableToastId.current || downloadedToastId.current) return

      const nextVersion = payload?.version ? String(payload.version) : null
      availableToastId.current = toast.info(
        <div className="space-y-2">
          <div className="font-medium">
            Có bản cập nhật mới{nextVersion ? `: ${nextVersion}` : ""}.
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={startDownload}
              className="px-2 py-1 rounded-md bg-vie-primary/20 border border-vie-primary/40 text-vie-text hover:bg-vie-primary/30"
            >
              Tải về
            </button>
            <button
              type="button"
              onClick={() => {
                toast.dismiss(availableToastId.current)
                availableToastId.current = null
              }}
              className="px-2 py-1 rounded-md border border-vie-border/60 text-vie-text-secondary hover:text-vie-text hover:border-vie-border"
            >
              Để sau
            </button>
          </div>
        </div>,
        { autoClose: false, closeOnClick: false },
      )
    }

    const onNotAvailable = () => {
      dismissAll()
    }

    const onError = (_event, payload) => {
      toast.error(payload?.message ? String(payload.message) : "Không thể kiểm tra cập nhật.")
    }

    const onProgress = (_event, payload) => {
      if (!downloadToastId.current) return
      const percent = Number(payload?.percent ?? 0)
      const clamped = Math.max(0, Math.min(100, percent))
      toast.update(downloadToastId.current, {
        type: "info",
        render: `Đang tải cập nhật… ${clamped.toFixed(0)}%`,
        autoClose: false,
      })
    }

    const onDownloaded = (_event, payload) => {
      if (downloadToastId.current) {
        toast.dismiss(downloadToastId.current)
        downloadToastId.current = null
      }
      toast.dismiss(availableToastId.current)
      availableToastId.current = null

      const nextVersion = payload?.version ? String(payload.version) : null
      downloadedToastId.current = toast.success(
        <div className="space-y-2">
          <div className="font-medium">
            Đã tải xong bản cập nhật{nextVersion ? `: ${nextVersion}` : ""}.
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={installUpdate}
              className="px-2 py-1 rounded-md bg-emerald-500/20 border border-emerald-400/40 text-emerald-50 hover:bg-emerald-500/30"
            >
              Cài & khởi động lại
            </button>
          </div>
        </div>,
        { autoClose: false, closeOnClick: false },
      )
    }

    ipc.on("updater:available", onAvailable)
    ipc.on("updater:not-available", onNotAvailable)
    ipc.on("updater:error", onError)
    ipc.on("updater:download-progress", onProgress)
    ipc.on("updater:downloaded", onDownloaded)

    return () => {
      ipc.removeListener("updater:available", onAvailable)
      ipc.removeListener("updater:not-available", onNotAvailable)
      ipc.removeListener("updater:error", onError)
      ipc.removeListener("updater:download-progress", onProgress)
      ipc.removeListener("updater:downloaded", onDownloaded)
    }
  }, [])

  return null
}

export default UpdateManager
