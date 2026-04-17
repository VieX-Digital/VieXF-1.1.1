import { cn } from "@/lib/utils"

export default function PageHero({
  title,
  subtitle,
  icon,
  actions,
  className,
  accentClassName,
}) {
  return (
    <div
      className={cn(
        "px-4 md:px-7 py-5 md:py-7",
        "bg-gradient-to-br from-[#020617] via-[#0a1226] to-[#020617]",
        "shadow-[0_0_34px_rgba(56,189,248,0.18)]",
        className,
      )}
    >
      <div className="pointer-events-none absolute -top-24 -right-24 h-56 w-56 rounded-full bg-sky-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-indigo-500/10 blur-3xl" />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          {icon && (
            <div
              className={cn(
                "shrink-0 rounded-2xl border border-vie-border/70 bg-black/35 p-2.5",
                accentClassName,
              )}
            >
              {icon}
            </div>
          )}
          <div className="space-y-1">
            <h1 className="text-base md:text-lg font-semibold text-vie-text leading-tight">{title}</h1>
            {subtitle && (
              <p className="text-xs md:text-sm text-vie-text-secondary leading-relaxed max-w-2xl">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  )
}

