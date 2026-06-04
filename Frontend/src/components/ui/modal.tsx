import { useRef } from "react"
import { Dialog } from "@headlessui/react"
import { AnimatePresence, motion } from "framer-motion"
import { X } from "lucide-react"
import { hoverPresets, variants } from "@/lib/animations"

export default function Modal({ open, onClose, children, className = "" }: any) {
  const cancelButtonRef = useRef(null)
  const handleClose = onClose || (() => {})

  return (
    <AnimatePresence>
      {open ? (
        <Dialog
          as="div"
          className="relative z-50"
          initialFocus={cancelButtonRef}
          onClose={handleClose}
          static
          open={open}
        >
          <motion.div
            className="fixed inset-0 bg-black/55"
            variants={variants.modalBackdrop}
            initial="hidden"
            animate="show"
            exit="exit"
          />

          <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
              <Dialog.Panel
                as={motion.div}
                variants={variants.modalReveal}
                initial="hidden"
                animate="show"
                exit="exit"
                className={`relative transform-gpu will-change-[transform,opacity] overflow-hidden rounded-2xl bg-vie-card text-left shadow-xl sm:my-8 sm:w-full sm:max-w-lg border border-vie-border ${className}`}
              >
                <div className="absolute right-4 top-4 z-10">
                  <motion.button
                    type="button"
                    className="rounded-full p-1 text-vie-text-muted hover:bg-white/10 hover:text-white transition-colors duration-150 transform-gpu"
                    onClick={handleClose}
                    ref={cancelButtonRef}
                    whileHover={hoverPresets.smoothScale}
                    whileTap={hoverPresets.buttonTap}
                  >
                    <X size={20} />
                  </motion.button>
                </div>
                {children}
              </Dialog.Panel>
            </div>
          </div>
        </Dialog>
      ) : null}
    </AnimatePresence>
  )
}
