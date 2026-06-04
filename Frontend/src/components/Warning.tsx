import type { FC } from "react"
import { motion } from "framer-motion"
import { hoverPresets, variants } from "@/lib/animations"

interface WarningProps {
  onAccept: () => void
}

const Warning: FC<WarningProps> = ({ onAccept }) => {
  return (
    <div className="flex h-full w-full items-center justify-center p-6">
      <motion.div
        variants={variants.modalReveal}
        initial="hidden"
        animate="show"
        className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-white/5 bg-white/[0.025] shadow-2xl shadow-black/50 backdrop-blur-xl transform-gpu will-change-[transform,opacity]"
      >
        {/* Top accent */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-500/60 to-transparent" />

        <div className="p-8">
          {/* Icon */}
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10 shadow-[0_0_32px_rgba(245,158,11,0.15)]">
            <svg
              className="h-7 w-7 text-amber-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.8}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
          </div>

          {/* Heading */}
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.28em] text-amber-500/80">
            Cảnh báo quan trọng
          </p>
          <h2 className="mb-4 text-2xl font-bold text-white">Đọc kỹ trước khi dùng nha</h2>

          {/* Body */}
          <div className="mb-6 space-y-3 text-sm leading-relaxed text-zinc-400">
            <p>
              VieXF can thiệp vào các cài đặt hệ thống Windows ở mức sâu — bao gồm registry, dịch
              vụ, và driver. Dùng sai hoặc không hiểu có thể gây lỗi hệ thống.
            </p>
            <p>
              <span className="font-medium text-amber-400">
                Backup trước khi làm bất cứ thứ gì.
              </span>{" "}
              VieXF có tính năng Backup tích hợp sẵn — xài đi cho chắc.
            </p>
            <p>
              Tác giả không chịu trách nhiệm nếu máy bạn gặp sự cố do sử dụng app. Bạn tự chịu trách
              nhiệm với mọi thay đổi mình thực hiện.
            </p>
          </div>

          {/* Checklist */}
          <div className="mb-6 space-y-2 rounded-xl border border-white/5 bg-white/[0.03] p-4 text-sm text-zinc-400">
            {[
              "Tôi hiểu app này chỉnh sửa cài đặt hệ thống Windows",
              "Tôi sẽ backup trước khi thực hiện bất kỳ thay đổi nào",
              "Tôi tự chịu trách nhiệm với mọi rủi ro phát sinh",
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-emerald-500/40 bg-emerald-500/10">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </span>
                <span>{item}</span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <motion.button
            onClick={onAccept}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(16,185,129,0.2)] transition-colors duration-150 hover:bg-emerald-500 transform-gpu"
            whileHover={hoverPresets.smoothScale}
            whileTap={hoverPresets.buttonTap}
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            Tôi đã hiểu, cho tôi vào app
          </motion.button>
        </div>
      </motion.div>
    </div>
  )
}

export default Warning
