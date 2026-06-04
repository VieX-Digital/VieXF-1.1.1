import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { AnimatePresence, motion } from "framer-motion"
import {
  CheckCircle2,
  ChevronLeft,
  Gauge,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Wand2,
} from "lucide-react"
import data from "../../../package.json"
import Button from "./ui/button"
import { invoke } from "@/lib/electron"
import { toast } from "@/lib/toast"
import { hoverPresets, variants } from "@/lib/animations"

const FIRST_TIME_KEY = "firstTime"
const RECOMMENDED_TWEAK_ID = "ultra-debloat"

const scanKeys = ["analyzing", "apps", "startup", "gaming"]

export default function FirstTime() {
  const { t } = useTranslation("onboarding")
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(1)
  const [scanIndex, setScanIndex] = useState(0)
  const [scanDone, setScanDone] = useState(false)
  const [recommendedAvailable, setRecommendedAvailable] = useState(true)
  const [applying, setApplying] = useState(false)
  const [applied, setApplied] = useState(false)

  useEffect(() => {
    const firstTime = localStorage.getItem(FIRST_TIME_KEY)
    if (!firstTime || firstTime === "true") {
      const timer = window.setTimeout(() => setOpen(true), 420)
      return () => window.clearTimeout(timer)
    }
  }, [])

  useEffect(() => {
    if (!open || step !== 2) return
    let cancelled = false
    setScanIndex(0)
    setScanDone(false)

    const interval = window.setInterval(() => {
      setScanIndex((i) => Math.min(i + 1, scanKeys.length - 1))
    }, 620)

    const runScan = async () => {
      try {
        const [tweaks] = await Promise.all([
          invoke({ channel: "tweaks:fetch", payload: null }).catch(() => []),
          invoke({ channel: "get-system-specs", payload: null }).catch(() => ({})),
          invoke({ channel: "get-system-metrics", payload: null }).catch(() => ({})),
        ])
        if (!cancelled) {
          const list = Array.isArray(tweaks) ? tweaks : []
          setRecommendedAvailable(
            list.length === 0 ||
              list.some(
                (tw) => tw?.id === RECOMMENDED_TWEAK_ID || tw?.name === RECOMMENDED_TWEAK_ID,
              ),
          )
        }
      } catch {
        if (!cancelled) toast.warning(t("toast.scanFailed"))
      } finally {
        window.setTimeout(() => {
          if (!cancelled) {
            setScanDone(true)
            setStep(3)
          }
        }, 1900)
      }
    }

    void runScan()
    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [open, step, t])

  const finish = () => {
    localStorage.setItem(FIRST_TIME_KEY, "false")
    setOpen(false)
  }

  const applyRecommendation = async () => {
    if (applying) return
    setApplying(true)
    const toastId = toast.loading(t("recommendation.enabling"), {
      toastId: `onboarding:${RECOMMENDED_TWEAK_ID}`,
    })
    try {
      const result = await invoke({ channel: "tweak:apply", payload: RECOMMENDED_TWEAK_ID })
      const ok = result?.ok || result?.success
      if (!ok) throw new Error(result?.error || t("toast.applyFailed"))
      setApplied(true)
      toast.update(toastId, { render: t("success.toast"), type: "success", isLoading: false })
      setStep(4)
    } catch (error) {
      toast.update(toastId, {
        render: error?.message || t("toast.applyFailed"),
        type: "error",
        isLoading: false,
      })
    } finally {
      setApplying(false)
    }
  }

  const tourItems = useMemo(
    () => [
      { icon: Wand2, title: t("tour.tweaksTitle"), body: t("tour.tweaksBody") },
      { icon: RotateCcw, title: t("tour.recoveryTitle"), body: t("tour.recoveryBody") },
      { icon: Gauge, title: t("tour.optimizeTitle"), body: t("tour.optimizeBody") },
    ],
    [t],
  )

  if (!open) return null

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="absolute inset-0 bg-black/65"
          variants={variants.modalBackdrop}
          initial="hidden"
          animate="show"
          exit="exit"
        />

        <motion.div
          variants={variants.modalReveal}
          initial="hidden"
          animate="show"
          exit="exit"
          className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-white/10 bg-[#09090b]/95 shadow-[0_24px_80px_rgba(0,0,0,0.5)] backdrop-blur-2xl transform-gpu will-change-[transform,opacity]"
        >
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/70 to-transparent" />
          <div className="absolute right-[-16%] top-[-18%] h-56 w-56 rounded-full bg-cyan-500/10" />
          <div className="absolute left-[-18%] bottom-[-22%] h-60 w-60 rounded-full bg-emerald-500/10" />

          <div className="relative p-8">
            <div className="mb-7 flex items-center justify-center gap-2">
              {[1, 2, 3, 4].map((i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-200 ${step === i ? "w-7 bg-cyan-400" : step > i ? "w-2 bg-cyan-400/45" : "w-2 bg-white/10"}`}
                />
              ))}
            </div>

            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div
                  key="welcome"
                  variants={variants.fadeUp}
                  initial="hidden"
                  animate="show"
                  exit="exit"
                  className="flex flex-col items-center text-center"
                >
                  <div className="mb-6 rounded-2xl bg-cyan-500/10 p-5 ring-1 ring-cyan-500/25 shadow-[0_0_28px_rgba(34,211,238,0.14)]">
                    <ShieldCheck className="h-12 w-12 text-cyan-300" />
                  </div>
                  <h2 className="mb-3 text-3xl font-display text-white tracking-wide">
                    {t("welcome.title")}
                  </h2>
                  <p className="mb-8 max-w-md text-sm leading-relaxed text-white/58">
                    {t("welcome.subtitle")}
                  </p>
                  <Button
                    size="lg"
                    className="w-full max-w-sm rounded-xl py-3 text-sm uppercase tracking-wider"
                    onClick={() => setStep(2)}
                  >
                    {t("welcome.start")}
                  </Button>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="scan"
                  variants={variants.fadeUp}
                  initial="hidden"
                  animate="show"
                  exit="exit"
                  className="text-center"
                >
                  <motion.div
                    className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-500/20 bg-cyan-500/10"
                    animate={{ scale: [1, 1.035, 1] }}
                    transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <Sparkles className="h-8 w-8 text-cyan-300" />
                  </motion.div>
                  <h2 className="mb-2 text-2xl font-display text-white">{t("scan.title")}</h2>
                  <p className="mx-auto mb-7 max-w-md text-sm text-white/55">
                    {t("scan.subtitle")}
                  </p>
                  <div className="space-y-3 text-left">
                    {scanKeys.map((key, index) => {
                      const active = index <= scanIndex
                      const done = index < scanIndex || scanDone
                      return (
                        <div
                          key={key}
                          className={`flex items-center gap-3 rounded-xl border p-3 transition-colors ${active ? "border-cyan-500/20 bg-cyan-500/[0.06] text-white" : "border-white/5 bg-white/[0.025] text-white/35"}`}
                        >
                          <span
                            className={`flex h-6 w-6 items-center justify-center rounded-full ${done ? "bg-emerald-500/15 text-emerald-300" : "bg-white/5 text-white/45"}`}
                          >
                            {done ? (
                              <CheckCircle2 size={15} />
                            ) : (
                              <span className="h-2 w-2 rounded-full bg-current" />
                            )}
                          </span>
                          <span className="text-sm">{t(`scan.${key}`)}</span>
                        </div>
                      )
                    })}
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div
                  key="recommendation"
                  variants={variants.fadeUp}
                  initial="hidden"
                  animate="show"
                  exit="exit"
                >
                  <h2 className="mb-2 text-center text-2xl font-display text-white">
                    {t("recommendation.title")}
                  </h2>
                  <p className="mx-auto mb-6 max-w-md text-center text-sm text-white/55">
                    {t("recommendation.subtitle")}
                  </p>
                  <motion.div
                    className="rounded-2xl border border-cyan-500/20 bg-cyan-500/[0.055] p-5 shadow-[0_16px_52px_rgba(0,0,0,0.28)]"
                    whileHover={hoverPresets.cardHover}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-bold text-white">
                          {t("recommendation.ultraDebloatTitle")}
                        </h3>
                        <p className="mt-1 text-sm leading-relaxed text-white/60">
                          {t("recommendation.ultraDebloatDescription")}
                        </p>
                      </div>
                      <div className="rounded-xl bg-white/5 p-3 text-cyan-300">
                        <Wand2 size={22} />
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {["tagRecommended", "tagSafe", "tagPopular"].map((key) => (
                        <span
                          key={key}
                          className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white/70"
                        >
                          {t(`recommendation.${key}`)}
                        </span>
                      ))}
                    </div>
                    <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                      <Button
                        className="flex-1 rounded-xl py-3"
                        onClick={applyRecommendation}
                        disabled={applying || !recommendedAvailable}
                      >
                        {applying ? t("recommendation.enabling") : t("recommendation.enable")}
                      </Button>
                      <Button
                        variant="secondary"
                        className="rounded-xl py-3"
                        onClick={() => setStep(4)}
                        disabled={applying}
                      >
                        {t("recommendation.skip")}
                      </Button>
                    </div>
                  </motion.div>
                </motion.div>
              )}

              {step === 4 && (
                <motion.div
                  key="success"
                  variants={variants.fadeUp}
                  initial="hidden"
                  animate="show"
                  exit="exit"
                  className="text-center"
                >
                  <div
                    className={`mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl ${applied ? "bg-emerald-500/12 text-emerald-300" : "bg-cyan-500/10 text-cyan-300"}`}
                  >
                    {applied ? <CheckCircle2 size={34} /> : <Sparkles size={34} />}
                  </div>
                  <h2 className="mb-2 text-2xl font-display text-white">
                    {applied ? t("success.title") : t("tour.title")}
                  </h2>
                  <p className="mx-auto mb-6 max-w-md text-sm text-white/55">
                    {applied ? t("success.subtitle") : t("recommendation.subtitle")}
                  </p>
                  <div className="mb-7 grid gap-3 sm:grid-cols-3">
                    {tourItems.map((item) => (
                      <div
                        key={item.title}
                        className="rounded-2xl border border-white/5 bg-white/[0.03] p-4 text-left"
                      >
                        <item.icon className="mb-3 h-5 w-5 text-cyan-300" />
                        <div className="text-sm font-bold text-white">{item.title}</div>
                        <div className="mt-1 text-xs leading-relaxed text-white/45">
                          {item.body}
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button
                    size="lg"
                    className="w-full max-w-sm rounded-xl py-3 uppercase tracking-wider"
                    onClick={finish}
                  >
                    {t("success.finish")}
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mt-8 flex items-center justify-center gap-3 text-[10px] text-white/25 uppercase tracking-widest font-mono font-bold">
              {step > 1 && step < 4 ? (
                <button
                  onClick={() => setStep((s) => Math.max(1, s - 1))}
                  className="flex items-center gap-1 hover:text-white/60 transition-colors"
                >
                  <ChevronLeft size={12} />
                  {t("tour.back")}
                </button>
              ) : null}
              <span>v{data?.version || "1.0.0"}</span>
              <span className="h-1 w-1 rounded-full bg-white/20" />
              <span>{t("versionLabel")}</span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
