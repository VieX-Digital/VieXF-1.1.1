import { Fragment, useRef } from "react"
import { Dialog, Transition } from "@headlessui/react"
import { X } from "lucide-react"

export default function Modal({ open, onClose, children, className = "" }: any) {
    const cancelButtonRef = useRef(null)

    // Provide a default no-op function if onClose is not provided
    const handleClose = onClose || (() => { })

    return (
        <Transition.Root show={open} as={Fragment}>
            <Dialog as="div" className="relative z-50" initialFocus={cancelButtonRef} onClose={handleClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-lg transition-opacity" />
                </Transition.Child>

                <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
                    <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                            enterTo="opacity-100 translate-y-0 sm:scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                            leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                        >
                            <Dialog.Panel className={`relative transform overflow-hidden rounded-2xl bg-vie-card text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg border border-vie-border ${className}`}>
                                <div className="absolute right-4 top-4 z-10">
                                    <button
                                        type="button"
                                        className="rounded-full p-1 text-vie-text-muted hover:bg-white/10 hover:text-white transition-colors"
                                        onClick={handleClose}
                                        ref={cancelButtonRef}
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                                {children}
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition.Root>
    )
}