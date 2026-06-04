import { ReactNode } from "react"
import { motion } from "framer-motion"
import RootDiv from "@/components/rootdiv"
import { variants } from "@/lib/animations"

type PageShellProps = {
  title: string
  subtitle: string
  actions?: ReactNode
  children: ReactNode
}

export default function PageShell({ title, subtitle, actions, children }: PageShellProps) {
  return (
    <RootDiv>
      <div className="w-full max-w-[1400px] py-10 h-full flex flex-col gap-8">
        <motion.header
          variants={variants.fadeUp}
          initial="hidden"
          animate="show"
          className="border-b border-white/10 pb-4 flex items-start justify-between gap-4 will-change-[transform,opacity] transform-gpu"
        >
          <div>
            <h1 className="text-2xl font-display text-white">{title}</h1>
            <p className="text-sm text-white/60 mt-1">{subtitle}</p>
          </div>
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </motion.header>
        <motion.div
          variants={variants.fadeIn}
          initial="hidden"
          animate="show"
          className="flex-1 min-h-0 will-change-[opacity]"
        >
          {children}
        </motion.div>
      </div>
    </RootDiv>
  )
}
