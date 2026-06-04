import {
  cssTransition,
  toast as toastify,
  type Id,
  type ToastOptions,
  type UpdateOptions,
} from "react-toastify"

const DEFAULT_AUTO_CLOSE = 5000
const DEFAULT_LIMIT = 5
const DEFAULT_POSITION = "top-right" as const

export const VieToastTransition = cssTransition({
  enter: "vie-toast-enter",
  exit: "vie-toast-exit",
  collapse: true,
  collapseDuration: 180,
  appendPosition: false,
})

export const toastContainerConfig = {
  stacked: true,
  limit: DEFAULT_LIMIT,
  newestOnTop: true,
  position: DEFAULT_POSITION,
  theme: "dark" as const,
  autoClose: DEFAULT_AUTO_CLOSE,
  pauseOnHover: true,
  pauseOnFocusLoss: true,
  closeOnClick: false,
  hideProgressBar: false,
  transition: VieToastTransition,
  toastClassName: (context: any) => {
    const base = "vie-toast-custom"
    const type = context?.type || "default"
    const variant =
      type === "success"
        ? "vie-toast-custom--success"
        : type === "error"
          ? "vie-toast-custom--error"
          : type === "info"
            ? "vie-toast-custom--info"
            : type === "warning"
              ? "vie-toast-custom--warning"
              : ""
    return `${base} ${variant}`.trim()
  },
}

function stableToastId(type: string, message: unknown, explicit?: Id) {
  if (explicit) return explicit
  const text = typeof message === "string" ? message : JSON.stringify(message)
  return `${type}:${String(text).slice(0, 160)}`
}

function options(type: string, message: unknown, opts: ToastOptions = {}): ToastOptions {
  const toastId = stableToastId(type, message, opts.toastId)
  return {
    autoClose: DEFAULT_AUTO_CLOSE,
    pauseOnHover: true,
    pauseOnFocusLoss: true,
    closeOnClick: false,
    ...opts,
    toastId,
  }
}

export function successToast(message: unknown, opts?: ToastOptions) {
  return toastify.success(message as any, options("success", message, opts))
}

export function errorToast(message: unknown, opts?: ToastOptions) {
  return toastify.error(message as any, options("error", message, opts))
}

export function warningToast(message: unknown, opts?: ToastOptions) {
  return toastify.warning(message as any, options("warning", message, opts))
}

export function infoToast(message: unknown, opts?: ToastOptions) {
  return toastify.info(message as any, options("info", message, opts))
}

export function loadingToast(message: unknown, opts?: ToastOptions) {
  return toastify.loading(message as any, {
    ...options("loading", message, opts),
    autoClose: false,
  })
}

export function updateToast(id: Id, opts: UpdateOptions) {
  return toastify.update(id, {
    autoClose: DEFAULT_AUTO_CLOSE,
    pauseOnHover: true,
    closeOnClick: false,
    ...opts,
  })
}

export function dismissToast(id?: Id) {
  return toastify.dismiss(id)
}

export const toast = Object.assign(toastify, {
  success: successToast,
  error: errorToast,
  warning: warningToast,
  warn: warningToast,
  info: infoToast,
  loading: loadingToast,
  update: updateToast,
  dismiss: dismissToast,
})
