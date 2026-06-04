import { ButtonHTMLAttributes, ReactNode } from "react"
import { clsx } from "clsx"
import { motion } from "framer-motion"
import { hoverPresets } from "@/lib/animations"

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost"
type ButtonSize = "sm" | "md" | "lg"

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
  disabled?: boolean
  as?: React.ElementType
}

const sizes: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-base",
}

const Button = ({
  children,
  variant = "primary",
  size = "sm",
  className = "",
  disabled = false,
  ...props
}: ButtonProps) => {
  const base =
    "inline-flex items-center justify-center rounded-lg font-medium select-none focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transform-gpu will-change-[transform,opacity] transition-colors duration-150"

  const variants: Record<ButtonVariant, string> = {
    primary:
      "bg-vie-primary text-white hover:bg-vie-primary-hover shadow-[0_0_15px_-5px_var(--color-vie-primary)] border border-transparent",
    secondary:
      "bg-vie-card border border-vie-border text-vie-text hover:bg-white/5 hover:border-vie-border-hover",
    danger: "bg-vie-danger/10 border border-vie-danger/20 text-vie-danger hover:bg-vie-danger/20",
    ghost: "text-vie-text-secondary hover:text-vie-text hover:bg-white/5",
  }

  return (
    <motion.button
      className={clsx(base, sizes[size], variants[variant], className)}
      disabled={disabled}
      whileHover={disabled ? undefined : hoverPresets.smoothScale}
      whileTap={disabled ? undefined : hoverPresets.buttonTap}
      {...props}
    >
      {children}
    </motion.button>
  )
}

export default Button
