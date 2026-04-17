import { ReactNode } from "react"
import RootDiv from "@/components/rootdiv"

type PageShellProps = {
  title: string
  subtitle: string
  actions?: ReactNode
  children: ReactNode
}

export default function PageShell({ title, subtitle, actions, children }: PageShellProps) {
  return (
    <RootDiv>
      <div className="max-w-6xl mx-auto px-6 py-6 h-full flex flex-col gap-5">
        <header className="border-b border-white/10 pb-4 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display text-white">{title}</h1>
            <p className="text-sm text-white/60 mt-1">{subtitle}</p>
          </div>
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </header>
        <div className="flex-1 min-h-0">{children}</div>
      </div>
    </RootDiv>
  )
}
