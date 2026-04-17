import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import Modal from "@/components/ui/modal"
import Button from "@/components/ui/button"
import { invoke } from "@/lib/electron"
import { ExternalLink } from "lucide-react"

type Props = {
  open: boolean
  onClose: () => void
  discordUrl: string
}

export default function ProTrialExpiredModal({ open, onClose, discordUrl }: Props) {
  const { t } = useTranslation()
  const [secondsLeft, setSecondsLeft] = useState(3)
  const openedRef = useRef(false)

  useEffect(() => {
    if (!open) {
      openedRef.current = false
      setSecondsLeft(3)
      return
    }

    openedRef.current = false
    setSecondsLeft(3)

    const tick = window.setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0))
    }, 1000)

    const openTimer = window.setTimeout(async () => {
      if (openedRef.current) return
      openedRef.current = true
      try {
        await invoke({ channel: "shell:open-external", payload: discordUrl })
      } catch {
        window.open(discordUrl, "_blank", "noopener,noreferrer")
      }
    }, 3000)

    return () => {
      clearInterval(tick)
      clearTimeout(openTimer)
    }
  }, [open, discordUrl])

  const openNow = async () => {
    if (openedRef.current) return
    openedRef.current = true
    try {
      await invoke({ channel: "shell:open-external", payload: discordUrl })
    } catch {
      window.open(discordUrl, "_blank", "noopener,noreferrer")
    }
  }

  return (
    <Modal open={open} onClose={onClose}>
      <div className="p-6 pt-10 space-y-4">
        <h3 className="text-lg font-semibold text-white pr-8">{t("license.pro_trial_expired_title")}</h3>
        <p className="text-sm text-white/70 leading-relaxed">{t("license.pro_trial_expired_body")}</p>
        <p className="text-xs text-amber-200/80">
          {t("license.pro_trial_auto_open", { seconds: Math.max(0, secondsLeft) })}
        </p>
        <div className="flex flex-wrap gap-2 pt-2">
          <Button size="sm" onClick={openNow} className="gap-2">
            <ExternalLink size={16} />
            {t("license.pro_trial_open_discord")}
          </Button>
          <Button size="sm" variant="secondary" onClick={onClose}>
            {t("license.pro_trial_close")}
          </Button>
        </div>
        <a
          href={discordUrl}
          className="block text-xs text-cyan-400/90 break-all hover:underline"
          onClick={(e) => {
            e.preventDefault()
            void openNow()
          }}
        >
          {discordUrl}
        </a>
      </div>
    </Modal>
  )
}
