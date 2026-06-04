import type { Transition, Variants } from "framer-motion"
import { getCurrentPerformanceProfile } from "@/lib/performance"

export const easings = {
  premium: [0.22, 1, 0.36, 1] as const,
  emphasized: [0.16, 1, 0.3, 1] as const,
  standard: [0.2, 0, 0, 1] as const,
  exit: [0.4, 0, 1, 1] as const,
}

export const springs = {
  ultraSmoothSpring: {
    type: "spring",
    stiffness: 420,
    damping: 34,
    mass: 0.72,
    restDelta: 0.001,
  } satisfies Transition,
  softSpring: {
    type: "spring",
    stiffness: 300,
    damping: 30,
    mass: 0.8,
    restDelta: 0.001,
  } satisfies Transition,
  buttonSpring: {
    type: "spring",
    stiffness: 520,
    damping: 36,
    mass: 0.55,
    restDelta: 0.001,
  } satisfies Transition,
  modalSpring: {
    type: "spring",
    stiffness: 380,
    damping: 32,
    mass: 0.78,
    restDelta: 0.001,
  } satisfies Transition,
}

export function duration(ms: number) {
  return (ms / 1000) * getCurrentPerformanceProfile().durationScale
}

export function stagger(seconds = 0.02) {
  return seconds * getCurrentPerformanceProfile().staggerScale
}

export const transitions = {
  page: { duration: duration(240), ease: easings.premium } satisfies Transition,
  pageExit: { duration: duration(140), ease: easings.exit } satisfies Transition,
  micro: { duration: duration(160), ease: easings.premium } satisfies Transition,
  fade: { duration: duration(180), ease: easings.standard } satisfies Transition,
  hover: springs.buttonSpring,
  modal: springs.modalSpring,
}

export const variants = {
  fadeIn: {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: transitions.fade },
    exit: { opacity: 0, transition: transitions.pageExit },
  } satisfies Variants,

  fadeUp: {
    hidden: { opacity: 0, y: 8, transform: "translate3d(0,8px,0)" },
    show: { opacity: 1, y: 0, transform: "translate3d(0,0,0)", transition: transitions.page },
    exit: { opacity: 0, y: 4, transition: transitions.pageExit },
  } satisfies Variants,

  fadeScale: {
    hidden: { opacity: 0, scale: 0.985 },
    show: { opacity: 1, scale: 1, transition: transitions.page },
    exit: { opacity: 0, scale: 0.99, transition: transitions.pageExit },
  } satisfies Variants,

  pageEnter: {
    hidden: { opacity: 0, y: 8, scale: 0.985 },
    show: { opacity: 1, y: 0, scale: 1, transition: transitions.page },
    exit: { opacity: 0, y: 4, scale: 0.995, transition: transitions.pageExit },
  } satisfies Variants,

  sidebarReveal: {
    collapsed: { width: 72, transition: springs.softSpring },
    expanded: { width: 280, transition: springs.softSpring },
  } satisfies Variants,

  modalBackdrop: {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { duration: duration(160), ease: easings.standard } },
    exit: { opacity: 0, transition: { duration: duration(120), ease: easings.exit } },
  } satisfies Variants,

  modalReveal: {
    hidden: { opacity: 0, scale: 0.97, y: 6 },
    show: { opacity: 1, scale: 1, y: 0, transition: transitions.modal },
    exit: {
      opacity: 0,
      scale: 0.985,
      y: 4,
      transition: { duration: duration(140), ease: easings.exit },
    },
  } satisfies Variants,

  listStagger: {
    hidden: {},
    show: { transition: { staggerChildren: stagger(0.02), delayChildren: duration(35) } },
  } satisfies Variants,

  itemStagger: {
    hidden: { opacity: 0, y: 6 },
    show: { opacity: 1, y: 0, transition: transitions.micro },
  } satisfies Variants,

  floatingSoft: {
    hidden: { opacity: 0, scale: 0.99 },
    show: { opacity: 1, scale: 1, transition: transitions.page },
  } satisfies Variants,
}

export const hoverPresets = {
  cardHover: { y: -2, scale: 1.005, transition: springs.buttonSpring },
  navItemHover: { x: 2, scale: 1.01, transition: springs.buttonSpring },
  smoothScale: { scale: 1.01, transition: springs.buttonSpring },
  buttonTap: { scale: 0.98, transition: { duration: 0.06 } },
  iconNudge: { x: 1, scale: 1.03, transition: springs.buttonSpring },
}

export const motionViewport = { once: true, amount: 0.18 }

// Backwards-compatible exports used by older pages.
export const pageContainerVariants = variants.listStagger
export const itemVariants = variants.itemStagger
