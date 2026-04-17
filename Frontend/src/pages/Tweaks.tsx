import { useState, useEffect, useRef, useMemo, useCallback, memo } from "react"
import { useTranslation } from "react-i18next"
import RootDiv from "@/components/rootdiv"

import Button from "@/components/ui/button"
import Toggle from "@/components/ui/toggle"
import { invoke } from "@/lib/electron"
import { toast } from "react-toastify"
import log from "electron-log/renderer"
import { Zap, Wrench, RefreshCcw, Monitor, Shield, Star, Rocket, Crown, Lock } from "lucide-react"
import { Virtuoso } from "react-virtuoso"

interface Tweak {
  id: string
  label: string
  description: string
  category: "performance" | "network" | "privacy" | "ui" | "remember"
  tier?: string
  top?: boolean
}

type CategoryId = "remember" | "performance" | "network" | "privacy" | "ui"

type ToggleResult = {
  id: string
  success: boolean
  state: boolean
  changed: boolean
  message?: string
  error?: string
}

const TOGGLE_THROTTLE_MS = 350
const BATCH_WINDOW_MS = 120
const VIRTUALIZE_THRESHOLD = 50
const ONE_CLICK_FREE_TWEAK_ID = "ultra-debloat"

const categories: { id: CategoryId; labelKey: string; icon: any }[] = [
  { id: "remember", labelKey: "Remember", icon: Star },
  { id: "performance", labelKey: "tweaks.performance", icon: Zap },
  { id: "network", labelKey: "tweaks.network", icon: RefreshCcw },
  { id: "privacy", labelKey: "tweaks.privacy", icon: Shield },
  { id: "ui", labelKey: "tweaks.interface", icon: Monitor },
]

const TweakCard = memo(
  ({
    tweak,
    isActive,
    isProcessing,
    onToggle,
    getLocalized,
    language,
    isProUser,
    onProLocked,
  }: {
    key?: string | number
    tweak: Tweak
    isActive: boolean
    isProcessing: boolean
    onToggle: (id: string, state?: boolean) => void
    getLocalized: (content: any, lang: string) => any
    language: string
    isProUser: boolean
    onProLocked: () => void
  }) => {
    const tier = String(tweak.tier || "free").toLowerCase()
    const proLocked = tier === "pro" && !isProUser

    return (
      <div
        className={`
          relative p-4 flex flex-col justify-between h-full rounded-xl transition-all duration-300 overflow-hidden
          bg-[#0A0A0C] border
          ${proLocked ? "border-amber-500/25 opacity-90 cursor-not-allowed" : "cursor-pointer"}
          ${isActive && !proLocked ? "border-cyan-400/50 shadow-[0_0_15px_-3px_rgba(34,211,238,0.08)] bg-white/[0.02]" : !proLocked ? "border-white/5 hover:border-white/15 hover:bg-white/[0.01]" : ""}
        `}
        onClick={() => {
          if (isProcessing || proLocked) {
            if (proLocked) onProLocked()
            return
          }
          onToggle(tweak.id)
        }}
      >
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-2 h-2 shrink-0 rounded-full transition-colors duration-300 ${isActive ? "bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" : "bg-white/20"}`} />
            <h3 className={`text-sm font-semibold tracking-wide truncate ${isActive ? "text-cyan-50" : "text-white/80"}`}>
              {getLocalized(tweak.label, language)}
            </h3>
            {proLocked && (
              <span className="shrink-0 inline-flex items-center gap-0.5 text-[10px] uppercase tracking-wider text-amber-400/90 font-bold">
                <Lock size={11} /> Pro
              </span>
            )}
          </div>
          <div onClick={(e) => e.stopPropagation()}>
            <Toggle
              checked={isActive}
              onChange={() => {
                if (proLocked) {
                  onProLocked()
                  return
                }
                onToggle(tweak.id)
              }}
              disabled={isProcessing || proLocked}
            />
          </div>
        </div>
        <p className="text-xs text-white/50 leading-relaxed font-light pl-5">
          {getLocalized(tweak.description, language)}
        </p>
      </div>
    )
  }
)

export default function Tweaks() {
  const { t, i18n } = useTranslation()
  const [tweaks, setTweaks] = useState<Tweak[]>([])
  const [activeTweaks, setActiveTweaks] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set())
  const [appVersion, setAppVersion] = useState<string>("")
  const [licenseTier, setLicenseTier] = useState<"free" | "pro">("free")

  const mountedRef = useRef(true)
  const inFlightRef = useRef<Set<string>>(new Set())
  const pendingStateRef = useRef<Map<string, boolean>>(new Map())
  const throttleUntilRef = useRef<Map<string, number>>(new Map())
  const confirmedActiveRef = useRef<Set<string>>(new Set())
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const flushQueueRef = useRef<() => void>(() => undefined)

  const normalizeCategory = (cat: string | string[] | undefined): CategoryId => {
    if (!cat) return "performance"

    const cats = Array.isArray(cat) ? cat : [cat]
    const lowerCats = cats.map((c) => c.toString().toLowerCase())

    if (lowerCats.some((c) => c.includes("remember"))) return "remember"
    if (lowerCats.some((c) => c.includes("network") || c.includes("wifi") || c.includes("internet"))) return "network"
    if (lowerCats.some((c) => c.includes("privacy") || c.includes("security") || c.includes("telemetry") || c.includes("defender"))) {
      return "privacy"
    }
    if (lowerCats.some((c) => c.includes("ui") || c.includes("appearance") || c.includes("general") || c.includes("context"))) {
      return "ui"
    }

    return "performance"
  }

  const getLocalized = useCallback((content: any, lang: string) => {
    if (typeof content === "object" && content !== null) {
      const l = (lang || "en").trim() || "en"
      const short = l.split("-")[0] || "en"
      const pick =
        content[l] ??
        content[short] ??
        (short === "vi" ? content["vi-VN"] : undefined) ??
        content.en ??
        content.vi ??
        ""
      return typeof pick === "string" ? pick : String(pick ?? "")
    }
    return String(content ?? "")
  }, [])

  const groupedTweaks = useMemo(() => {
    const grouped = new Map<CategoryId, Tweak[]>()

    for (const category of categories) {
      grouped.set(category.id, [])
    }

    for (const tweak of tweaks) {
      const bucket = grouped.get(tweak.category) || []
      bucket.push(tweak)
      grouped.set(tweak.category, bucket)
    }

    return grouped
  }, [tweaks])

  const scheduleFlush = useCallback((delayMs: number = BATCH_WINDOW_MS) => {
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current)
    }

    flushTimerRef.current = setTimeout(() => {
      flushTimerRef.current = null
      flushQueueRef.current()
    }, Math.max(0, delayMs))
  }, [])

  const flushQueue = useCallback(async () => {
    if (!mountedRef.current) return

    const now = Date.now()
    const readyChanges: Array<{ id: string; state: boolean }> = []
    let nextDelay = Number.POSITIVE_INFINITY

    for (const [id, state] of pendingStateRef.current.entries()) {
      if (inFlightRef.current.has(id)) continue

      const throttleUntil = throttleUntilRef.current.get(id) || 0
      if (throttleUntil <= now) {
        readyChanges.push({ id, state })
      } else {
        nextDelay = Math.min(nextDelay, throttleUntil - now)
      }
    }

    if (readyChanges.length === 0) {
      if (nextDelay !== Number.POSITIVE_INFINITY) {
        scheduleFlush(nextDelay)
      }
      return
    }

    for (const change of readyChanges) {
      pendingStateRef.current.delete(change.id)
      inFlightRef.current.add(change.id)
      throttleUntilRef.current.set(change.id, now + TOGGLE_THROTTLE_MS)
    }

    setProcessingIds((prev) => {
      const next = new Set(prev)
      for (const change of readyChanges) {
        next.add(change.id)
      }
      return next
    })

    try {
      let results: ToggleResult[] = []

      if (readyChanges.length > 1) {
        const batchRes = await invoke({
          channel: "tweak:set-batch",
          payload: { changes: readyChanges },
        })
        results = Array.isArray(batchRes?.results) ? batchRes.results : []
      } else {
        const singleRes = await invoke({
          channel: "tweak:set",
          payload: readyChanges[0],
        })
        results = singleRes ? [singleRes] : []
      }

      const nextConfirmed = new Set(confirmedActiveRef.current)
      const failed = results.filter((result) => !result?.success)

      for (const result of results) {
        if (!result?.id || !result.success) continue
        if (result.state) {
          nextConfirmed.add(result.id)
        } else {
          nextConfirmed.delete(result.id)
        }
      }

      confirmedActiveRef.current = nextConfirmed
      setActiveTweaks(new Set(nextConfirmed))

      if (failed.length > 0) {
        toast.error(failed[0].error || t("tweaks.failed"))
      } else if (results.length === 1) {
        const only = results[0]
        if (only?.changed) {
          toast.success(only.state ? t("tweaks.enabled") : t("tweaks.disabled"), { autoClose: 1000 })
        } else if (only?.message) {
          toast.info(only.message, { autoClose: 1200 })
        }
      }
    } catch (error) {
      log.error("Failed to flush tweak queue", error)
      setActiveTweaks(new Set(confirmedActiveRef.current))
      toast.error(t("tweaks.failed"))
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev)
        for (const change of readyChanges) {
          next.delete(change.id)
          inFlightRef.current.delete(change.id)
        }
        return next
      })

      if (pendingStateRef.current.size > 0) {
        scheduleFlush(0)
      }
    }
  }, [scheduleFlush, t])

  flushQueueRef.current = () => {
    void flushQueue()
  }

  const queueToggle = useCallback(
    (id: string, explicitState?: boolean) => {
      const queuedState = pendingStateRef.current.has(id) ? pendingStateRef.current.get(id) : activeTweaks.has(id)
      const targetState = typeof explicitState === "boolean" ? explicitState : !queuedState
      pendingStateRef.current.set(id, targetState)

      setActiveTweaks((prev) => {
        const next = new Set(prev)
        if (targetState) {
          next.add(id)
        } else {
          next.delete(id)
        }
        return next
      })

      scheduleFlush(BATCH_WINDOW_MS)
    },
    [activeTweaks, scheduleFlush]
  )

  const loadTweaks = useCallback(async () => {
    try {
      setLoading(true)
      const [allTweaks, active, version, lic] = await Promise.all([
        invoke({ channel: "tweaks:fetch", payload: null }),
        invoke({ channel: "tweak:active", payload: null }),
        invoke({ channel: "app:version", payload: null }),
        invoke({ channel: "license:get", payload: null }).catch(() => ({ tier: "free" })),
      ])
      
      setAppVersion(version as string)
      setLicenseTier((lic as { tier?: string })?.tier === "pro" ? "pro" : "free")

      const normalized = (allTweaks as any[])
        .filter((tweak) => tweak && String(tweak.id || tweak.name || "").trim())
        .map((tweak) => {
          const id = String(tweak.id || tweak.name).trim()
          return {
            ...tweak,
            id,
            label: tweak.title || tweak.name || id,
            tier: tweak.tier || "free",
            top: !!tweak.top,
            category: normalizeCategory(tweak.category),
          }
        })

      if (!mountedRef.current) return

      const activeSet = new Set(Array.isArray(active) ? (active as string[]) : [])
      setTweaks(normalized as Tweak[])
      confirmedActiveRef.current = activeSet
      setActiveTweaks(new Set(activeSet))
    } catch (error) {
      log.error("Failed to load tweaks", error)
      toast.error(t("tweaks.failed"))
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
    }
  }, [t])

  useEffect(() => {
    mountedRef.current = true

    const requestIdle = (cb: () => void) => {
      const win = window as any
      if (win.requestIdleCallback) return win.requestIdleCallback(cb)
      return window.setTimeout(cb, 1)
    }

    const cancelIdle = (id: any) => {
      const win = window as any
      if (win.cancelIdleCallback) return win.cancelIdleCallback(id)
      clearTimeout(id)
    }

    const idleId = requestIdle(() => {
      if (mountedRef.current) {
        void loadTweaks()
      }
    })

    return () => {
      mountedRef.current = false
      cancelIdle(idleId)

      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current)
        flushTimerRef.current = null
      }
    }
  }, [loadTweaks])

  const isProUser = licenseTier === "pro"
  const isVieXActive = activeTweaks.has(ONE_CLICK_FREE_TWEAK_ID)
  const isVieXProcessing = processingIds.has(ONE_CLICK_FREE_TWEAK_ID)

  const onProLocked = useCallback(() => {
    toast.info(t("tweaks.pro_locked_hint"))
  }, [t])

  return (
    <RootDiv style={{}}>
      <div className="relative h-full">

        <div className="relative max-w-6xl mx-auto px-6 py-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
          <div className="flex items-center justify-between">
            <div className="rounded-2xl bg-[#09090B] ring-1 ring-white/5 px-5 py-4 shadow-[0_10px_32px_rgba(0,0,0,0.5)]">
              <h1 className="text-3xl font-display text-white">{t("tweaks.title")}</h1>
              <p className="text-white/50 text-sm mt-1">{t("tweaks.subtitle")}</p>
            </div>
          </div>

          <div
            className="relative overflow-hidden group rounded-2xl bg-[#09090B] ring-1 ring-cyan-400/50 hover:ring-cyan-400 hover:shadow-[0_0_40px_rgba(34,211,238,0.4)] transition-all duration-500 p-[2px] shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_20px_40px_rgba(0,0,0,0.8)]"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/20 via-transparent to-transparent opacity-100 pointer-events-none" />
            <div className="relative flex items-center justify-between p-6 bg-[#0A0A0C] rounded-xl gap-6 shadow-[inset_0_2px_15px_rgba(34,211,238,0.1)] border border-cyan-400/20 group-hover:border-cyan-400/40 transition-colors">
              <div className="flex items-center gap-6">
                <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-300 to-cyan-600 flex items-center justify-center shadow-[0_10px_20px_rgba(34,211,238,0.3),inset_0_2px_4px_rgba(255,255,255,0.5)] ring-1 ring-white/20 transform group-hover:scale-[1.03] transition-transform duration-500">
                  <Rocket size={32} className="text-white fill-white drop-shadow-md" />
                  <div className="absolute inset-0 rounded-2xl shadow-[inset_0_0_10px_rgba(255,255,255,0.4)] pointer-events-none"></div>
                </div>
                <div>
                  <h2 className="text-[28px] tracking-wide font-extrabold font-display text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-cyan-500 mb-1 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]">
                    {t("tweaks.one_click_title", { version: appVersion || "…" })}
                  </h2>
                  <p className="text-cyan-50/70 text-sm max-w-xl font-light">{t("tweaks.one_click_subtitle_free")}</p>
                  <p className="text-amber-200/50 text-xs mt-2 flex items-center gap-1.5">
                    <Crown size={12} className="text-amber-400/80 shrink-0" />
                    {t("tweaks.one_click_pro_hint")}
                  </p>
                </div>
              </div>
              <Button
                onClick={() => queueToggle(ONE_CLICK_FREE_TWEAK_ID, !isVieXActive)}
                disabled={isVieXProcessing}
                className={`
                  h-12 px-8 text-base font-bold transition-all duration-300 capitalize rounded-xl
                  ${isVieXActive
                    ? "bg-[#0A0A0C] text-red-500 border border-red-500/50 hover:bg-red-500/10 hover:shadow-[0_0_20px_rgba(239,68,68,0.4)] shadow-[inset_0_1px_4px_rgba(255,255,255,0.05)]"
                    : "bg-gradient-to-b from-cyan-400 to-cyan-500 text-black border border-cyan-300/50 hover:from-cyan-300 hover:to-cyan-400 hover:shadow-[0_0_25px_rgba(34,211,238,0.7)] shadow-[inset_0_1px_4px_rgba(255,255,255,0.6)]"
                  }
                `}
              >
                {isVieXProcessing ? (
                  <RefreshCcw size={20} className="animate-spin mr-2" />
                ) : isVieXActive ? (
                  i18n.language === "vi" ? "Hoàn tác" : "Revert"
                ) : i18n.language === "vi" ? (
                  "Áp dụng"
                ) : (
                  "Apply"
                )}
              </Button>
            </div>
          </div>

          {categories.map((cat) => {
            const catTweaks = groupedTweaks.get(cat.id) || []
            if (catTweaks.length === 0) return null

            const Icon = cat.icon
            const isRemember = cat.id === "remember"

            return (
              <div key={cat.id} className="space-y-4">
                <div className={`flex items-center gap-2 border-b pb-2 ${isRemember ? "text-yellow-400 border-yellow-500/30" : "text-white/80 border-cyan-400/20"}`}>
                  <Icon size={18} className={isRemember ? "text-yellow-400 fill-yellow-400" : "text-cyan-300"} />
                  <h2 className="text-lg font-medium capitalize">{cat.labelKey === "Remember" ? "Remember" : t(cat.labelKey)}</h2>
                </div>

                {catTweaks.length > VIRTUALIZE_THRESHOLD ? (
                  <Virtuoso
                    style={{ height: Math.min(640, catTweaks.length * 118) }}
                    totalCount={catTweaks.length}
                    itemContent={(index) => {
                      const tweak = catTweaks[index]
                      return (
                        <div className="pb-4">
                          <TweakCard
                            tweak={tweak}
                            isActive={activeTweaks.has(tweak.id)}
                            isProcessing={processingIds.has(tweak.id)}
                            onToggle={queueToggle}
                            getLocalized={getLocalized}
                            language={i18n.language}
                            isProUser={isProUser}
                            onProLocked={onProLocked}
                          />
                        </div>
                      )
                    }}
                  />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {catTweaks.map((tweak) => (
                      <TweakCard
                        key={tweak.id}
                        tweak={tweak}
                        isActive={activeTweaks.has(tweak.id)}
                        isProcessing={processingIds.has(tweak.id)}
                        onToggle={queueToggle}
                        getLocalized={getLocalized}
                        language={i18n.language}
                        isProUser={isProUser}
                        onProLocked={onProLocked}
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })}

          {!loading && tweaks.length === 0 && (
            <div className="text-center py-20 text-white/40">
              <Wrench size={48} className="mx-auto mb-4 opacity-20" />
              <p>{t("tweaks.no_tweaks")}</p>
            </div>
          )}
        </div>
      </div>
    </RootDiv>
  )
}

