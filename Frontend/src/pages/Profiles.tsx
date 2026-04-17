import PageShell from "@/components/ui/page-shell"
import Button from "@/components/ui/button"
import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { invoke } from "@/lib/electron"
import { toast } from "react-toastify"

const PROFILE_PRESETS = [
  { id: "safe" as const, categories: ["remember", "performance", "network"] },
  { id: "gaming" as const, categories: ["performance", "network"] },
  { id: "work" as const, categories: ["remember", "ui"] },
]

export default function Profiles() {
  const { t } = useTranslation()
  const [tweaks, setTweaks] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    void (async () => {
      try {
        const allTweaks = await invoke({ channel: "tweaks:fetch", payload: null })
        setTweaks(Array.isArray(allTweaks) ? allTweaks : [])
      } catch {
        setTweaks([])
      }
    })()
  }, [])

  const tweakCountByCategory = useMemo(() => {
    const count: Record<string, number> = {}
    for (const tw of tweaks) {
      const cat = (Array.isArray(tw.category) ? tw.category[0] : tw.category || "performance")
        .toString()
        .toLowerCase()
      count[cat] = (count[cat] || 0) + 1
    }
    return count
  }, [tweaks])

  const applyProfile = async (profileId: (typeof PROFILE_PRESETS)[number]["id"]) => {
    const profile = PROFILE_PRESETS.find((p) => p.id === profileId)
    if (!profile) return
    setLoading(true)
    try {
      const changes = tweaks
        .filter((tw) => {
          const cat = (Array.isArray(tw.category) ? tw.category.join(" ") : String(tw.category || "")).toLowerCase()
          return profile.categories.some((token) => cat.includes(token))
        })
        .map((tw) => ({ id: tw.id, state: true }))

      await invoke({
        channel: "tweak:set-batch",
        payload: { changes },
      })
      toast.success(t("profiles.applied", { name: t(`profiles.presets.${profileId}.name`) }))
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "unknown error"
      toast.error(`${t("profiles.apply_failed")}: ${msg}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageShell title={t("profiles.title")} subtitle={t("profiles.subtitle")}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PROFILE_PRESETS.map((p) => {
          const matchCount = p.categories.reduce((sum, c) => sum + (tweakCountByCategory[c] || 0), 0)
          return (
            <div key={p.id} className="rounded-lg border border-white/10 bg-[#0F0F10] p-4">
              <h3 className="text-white font-medium">{t(`profiles.presets.${p.id}.name`)}</h3>
              <p className="text-sm text-white/60 mt-1 min-h-10">{t(`profiles.presets.${p.id}.desc`)}</p>
              <p className="text-xs text-cyan-300 mt-2">
                {t("profiles.matching", { count: matchCount })}
              </p>
              <div className="mt-4 flex gap-2 flex-wrap">
                <Button variant="primary" disabled={loading} onClick={() => applyProfile(p.id)}>
                  {t("profiles.apply")}
                </Button>
                <Button variant="secondary" disabled>
                  {p.categories.join(", ")}
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </PageShell>
  )
}
