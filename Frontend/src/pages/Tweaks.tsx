import { useState, useEffect, useRef, useMemo, useCallback, memo } from "react"
import { useTranslation } from "react-i18next"
import RootDiv from "@/components/rootdiv"

import Button from "@/components/ui/button"
import Toggle from "@/components/ui/toggle"
import { invoke } from "@/lib/electron"
import { toast } from "react-toastify"
import log from "electron-log/renderer"
import {
  Zap,
  Wrench,
  RefreshCcw,
  Monitor,
  Shield,
  Star,
  Rocket,
  Crown,
  Lock,
  Info,
  Filter,
  Search,
  TrendingUp,
  Bookmark,
  RotateCcw,
  Gamepad2,
} from "lucide-react"
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
type CategoryViewId = CategoryId | "gaming"

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
        className={`bg-[#121214] border border-white/5 rounded-xl p-5 hover:border-white/10 hover:scale-[1.01] transition-all duration-300 ${proLocked ? "opacity-75 cursor-not-allowed" : "cursor-pointer"}`}
        onClick={() => {
          if (isProcessing || proLocked) {
            if (proLocked) onProLocked()
            return
          }
          onToggle(tweak.id)
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 min-w-0">
              <h3 className="text-base font-semibold text-white truncate">
                {getLocalized(tweak.label, language)}
              </h3>

              <div className="ml-1 flex shrink-0 items-center gap-2 text-xs font-medium">
                <span className="inline-flex items-center gap-1 rounded-full bg-zinc-800 px-2 py-1 text-white">
                  <Zap size={12} className="text-amber-400" />
                  +18 XP
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-zinc-800 px-2 py-1 text-white">
                  <TrendingUp size={12} className="text-emerald-400" />
                  +0.4%
                </span>
                {proLocked && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-purple-500/20 bg-purple-500/10 px-2 py-1 text-purple-300">
                    <Lock size={11} /> Pro
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3" onClick={(e) => e.stopPropagation()}>
            <button
              className="text-zinc-500 hover:text-white transition-colors"
              aria-label="Bookmark"
            >
              <Bookmark size={18} />
            </button>
            <label
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-all duration-300 ${
                isProcessing || proLocked ? "cursor-not-allowed opacity-60" : "cursor-pointer"
              } ${isActive ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]" : "bg-zinc-700"}`}
              aria-label="Toggle tweak"
            >
              <input
                type="checkbox"
                checked={isActive}
                disabled={isProcessing || proLocked}
                onChange={() => {
                  if (proLocked) {
                    onProLocked()
                    return
                  }
                  onToggle(tweak.id)
                }}
                className="sr-only"
              />
              <span
                className={`h-4 w-4 rounded-full bg-white transition-all duration-300 ${isActive ? "translate-x-6" : "translate-x-1"}`}
              />
            </label>
          </div>
        </div>

        <p className="mt-2 mb-4 pr-12 text-sm leading-relaxed text-zinc-400">
          {getLocalized(tweak.description, language)}
        </p>

        <div className="flex flex-wrap gap-2 text-xs font-medium">
          <span className="rounded bg-zinc-800 px-2 py-1 text-zinc-300">{tweak.category}</span>
          {tweak.top && (
            <span className="rounded border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-emerald-400">
              Recommended
            </span>
          )}
          <span className="rounded border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-emerald-400">
            Safe
          </span>
          <span className="rounded border border-amber-500/15 bg-amber-500/10 px-2 py-1 text-amber-400">
            Restart Required
          </span>
        </div>
      </div>
    )
  },
)

export default function Tweaks() {
  const { t, i18n } = useTranslation()
  const [tweaks, setTweaks] = useState<Tweak[]>([])
  const [activeTweaks, setActiveTweaks] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set())
  const [appVersion, setAppVersion] = useState<string>("")
  const [licenseTier, setLicenseTier] = useState<"free" | "pro">("free")
  const [selectedCategory, setSelectedCategory] = useState<CategoryViewId>("performance")

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
    if (
      lowerCats.some((c) => c.includes("network") || c.includes("wifi") || c.includes("internet"))
    )
      return "network"
    if (
      lowerCats.some(
        (c) =>
          c.includes("privacy") ||
          c.includes("security") ||
          c.includes("telemetry") ||
          c.includes("defender"),
      )
    ) {
      return "privacy"
    }
    if (
      lowerCats.some(
        (c) =>
          c.includes("ui") ||
          c.includes("appearance") ||
          c.includes("general") ||
          c.includes("context"),
      )
    ) {
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

    flushTimerRef.current = setTimeout(
      () => {
        flushTimerRef.current = null
        flushQueueRef.current()
      },
      Math.max(0, delayMs),
    )
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
          toast.success(only.state ? t("tweaks.enabled") : t("tweaks.disabled"), {
            autoClose: 1000,
          })
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
      const queuedState = pendingStateRef.current.has(id)
        ? pendingStateRef.current.get(id)
        : activeTweaks.has(id)
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
    [activeTweaks, scheduleFlush],
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

  const categoryItems: Array<{
    id: CategoryViewId
    title: string
    subtitle: string
    icon: any
    premium?: boolean
  }> = [
    {
      id: "performance",
      title: "Performance",
      subtitle: "Tối ưu hóa phản hồi, giảm độ trễ và tăng độ ổn định hệ thống",
      icon: Zap,
    },
    { id: "network", title: "Network", subtitle: "Ping ổn hơn, mạng chill hơn", icon: RefreshCcw },
    { id: "privacy", title: "Privacy", subtitle: "Dọn telemetry, bớt bị soi", icon: Shield },
    { id: "ui", title: "Interface", subtitle: "Windows gọn nhẹ, đỡ rối", icon: Monitor },
    { id: "remember", title: "Remember", subtitle: "Các tweak đáng lưu tâm", icon: Star },
    {
      id: "gaming",
      title: "Gaming",
      subtitle: "Preset chiến game cao cấp",
      icon: Gamepad2,
      premium: true,
    },
  ]

  const visibleTweaks =
    selectedCategory === "gaming" ? [] : groupedTweaks.get(selectedCategory) || []
  const sectionTitle =
    selectedCategory === "gaming"
      ? "Gaming Optimizations"
      : `${categoryItems.find((cat) => cat.id === selectedCategory)?.title || "General"} Optimizations`

  const applyVisibleTweaks = () => {
    visibleTweaks.forEach((tweak) => {
      const tier = String(tweak.tier || "free").toLowerCase()
      if (tier === "pro" && !isProUser) return
      queueToggle(tweak.id, true)
    })
  }

  const unapplyVisibleTweaks = () => {
    visibleTweaks.forEach((tweak) => queueToggle(tweak.id, false))
  }

  return (
    <RootDiv style={{}}>
      <div className="flex h-screen bg-transparent py-10 pr-6 pl-0 text-white">
        {/* Left column: Categories */}
        <aside className="w-72 shrink-0 border-r border-white/5 pr-6">
          <div className="mb-8 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-400 text-black">
                <Rocket size={22} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">VieXF {appVersion || "..."}</h2>
                <p className="text-xs text-zinc-400">One-click optimization</p>
              </div>
            </div>
            <button
              onClick={() => queueToggle(ONE_CLICK_FREE_TWEAK_ID, !isVieXActive)}
              disabled={isVieXProcessing}
              className={`mt-4 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                isVieXActive
                  ? "bg-red-500/10 text-red-400 hover:bg-red-500/20"
                  : "bg-cyan-400 text-black hover:bg-cyan-300"
              }`}
            >
              {isVieXProcessing ? (
                <RefreshCcw size={16} className="animate-spin" />
              ) : (
                <Crown size={16} />
              )}
              {isVieXActive ? "Hoàn tác preset" : "Áp dụng preset"}
            </button>
          </div>

          <h2 className="mb-4 text-lg font-bold">Categories</h2>
          <div className="space-y-2">
            {categoryItems.map((cat) => {
              const Icon = cat.icon
              const active = selectedCategory === cat.id

              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex w-full items-center gap-4 rounded-xl p-3 text-left cursor-pointer transition-all ${
                    active
                      ? "bg-zinc-800 border border-white/5"
                      : "border border-transparent hover:bg-zinc-800/50"
                  }`}
                >
                  <Icon size={20} className="shrink-0 text-zinc-300" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">{cat.title}</span>
                      {cat.premium && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-purple-500/20 bg-purple-950 px-2 py-0.5 text-[10px] font-semibold text-purple-300">
                          <Lock size={10} /> Premium
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-zinc-500">{cat.subtitle}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </aside>

        {/* Right column: Main Content */}
        <main className="flex-1 flex flex-col pl-8 overflow-hidden">
          {/* Global header */}
          <header>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">Optimizations</h1>
              <Info size={18} className="text-zinc-500" />
            </div>
            <p className="mt-1 mb-8 text-sm text-zinc-400">
              Fine-tune your system with safe, reversible optimizations across performance, privacy,
              security, and more.
            </p>
          </header>

          {/* Toolbar */}
          <div className="mb-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800">
                <Filter size={16} /> Filter
              </button>
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
                />
                <input
                  className="w-64 rounded-lg border border-zinc-800 bg-zinc-900 py-2 pl-9 pr-4 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-zinc-700"
                  placeholder="Search tweaks..."
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={applyVisibleTweaks}
                className="flex items-center gap-2 rounded-lg px-4 py-2 font-medium text-emerald-500 hover:bg-emerald-500/10"
              >
                <Zap size={16} /> Apply All
              </button>
              <button
                onClick={unapplyVisibleTweaks}
                className="flex items-center gap-2 rounded-lg px-4 py-2 font-medium text-amber-500 hover:bg-amber-500/10"
              >
                <RotateCcw size={16} /> Un-Apply All
              </button>
            </div>
          </div>

          {/* Section header */}
          <div className="mb-6">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold">{sectionTitle}</h2>
              <Info size={17} className="text-zinc-500" />
            </div>
            <p className="mt-1 text-sm text-zinc-400">
              Chọn tweak hợp gu rồi bật/tắt thoải mái — mọi thay đổi đều đi qua queue để đỡ lag app
              nha.
            </p>
          </div>

          {/* Tweak cards */}
          <div className="flex-1 overflow-y-auto pr-2">
            {loading ? (
              <div className="flex h-64 items-center justify-center text-sm text-zinc-500">
                Đang load tweak xịn cho bạn...
              </div>
            ) : selectedCategory === "gaming" ? (
              <div className="rounded-xl border border-purple-500/20 bg-purple-500/10 p-8 text-center">
                <Lock size={34} className="mx-auto mb-4 text-purple-300" />
                <h3 className="text-lg font-bold text-white">Gaming Premium đang khóa nha</h3>
                <p className="mt-2 text-sm text-zinc-400">
                  Preset gaming cao cấp sẽ mở khi bạn nâng cấp Pro. Chill chút, hàng ngon đang chờ.
                </p>
              </div>
            ) : visibleTweaks.length > VIRTUALIZE_THRESHOLD ? (
              <Virtuoso
                style={{ height: "100%" }}
                totalCount={visibleTweaks.length}
                itemContent={(index) => {
                  const tweak = visibleTweaks[index]
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
            ) : visibleTweaks.length > 0 ? (
              <div className="flex flex-col gap-4 pb-10">
                {visibleTweaks.map((tweak) => (
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
            ) : (
              <div className="py-20 text-center text-zinc-500">
                <Wrench size={48} className="mx-auto mb-4 opacity-20" />
                <p>{t("tweaks.no_tweaks")}</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </RootDiv>
  )
}
