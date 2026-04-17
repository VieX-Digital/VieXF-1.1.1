import { useState, useEffect } from "react"
import RootDiv from "@/components/rootdiv"

import Button from "@/components/ui/button"
import Modal from "@/components/ui/modal"
import { toast } from "react-toastify"
import { ArchiveRestore, Save, RotateCcw, RefreshCw, Trash2, X } from "lucide-react"
import { useTranslation } from "react-i18next"
import { invoke } from "@/lib/electron"

interface RestorePoint {
    SequenceNumber: number
    Description: string
    CreationTime: string
    EventType: number
    RestorePointType: number
}

export default function Backup() {
    const { t } = useTranslation()
    const [restorePoints, setRestorePoints] = useState<RestorePoint[]>([])
    const [loading, setLoading] = useState(true)
    const [createOpen, setCreateOpen] = useState(false)
    const [creating, setCreating] = useState(false)
    const [restoringId, setRestoringId] = useState<number | null>(null)
    const [deleteOpen, setDeleteOpen] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [deletingId, setDeletingId] = useState<number | null>(null)
    const [isAdmin, setIsAdmin] = useState(true)

    const fetchRestorePoints = async () => {
        setLoading(true)
        try {
            const res = await invoke({ channel: "get-restore-points", payload: null })
            if (res?.success && Array.isArray(res.points)) {
                setRestorePoints(res.points)
            } else {
                setRestorePoints([])
            }
        } catch (err) {
            console.error(err)
            setRestorePoints([])
            toast.error(t("backup.create_failed"))
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchRestorePoints()
        invoke({ channel: "app:is-admin", payload: null }).then((admin: any) => {
            setIsAdmin(!!admin)
        })
    }, [])

    const handleCreate = async () => {
        setCreating(true)
        try {
            const res = await invoke({ channel: "create-restore-point", payload: null })
            if (res?.success) {
                toast.success(t("backup.created"))
                setCreateOpen(false)
                await fetchRestorePoints()
            } else {
                toast.error(res?.error || t("backup.create_failed"))
            }
        } catch (err) {
            console.error(err)
            toast.error(t("backup.create_failed"))
        } finally {
            setCreating(false)
        }
    }

    const handleDeleteAllBackups = async () => {
        setDeleting(true)
        try {
            const res = await invoke({ channel: "delete-all-restore-points", payload: null })
            if (res?.success) {
                toast.success(t("toast_backup_deleted"))
                setDeleteOpen(false)
                await fetchRestorePoints()
            } else {
                toast.error(res?.error || t("backup.delete_failed"))
            }
        } catch (err) {
            console.error(err)
            toast.error(t("backup.delete_failed"))
        } finally {
            setDeleting(false)
        }
    }

    const handleDeleteSingleBackup = async (seq: number) => {
        setDeleting(true)
        try {
            const res = await invoke({ channel: "delete-restore-point", payload: seq })
            if (res?.success) {
                toast.success(t("backup.deleted"))
                setDeleteOpen(false)
                setDeletingId(null)
                await fetchRestorePoints()
            } else {
                toast.error(res?.error || t("backup.delete_failed"))
            }
        } catch (err) {
            console.error(err)
            toast.error(t("backup.delete_failed"))
        } finally {
            setDeleting(false)
        }
    }

    const handleRestore = async (seq: number) => {
        if (!confirm(t("backup.restore_confirm"))) return
        setRestoringId(seq)
        try {
            const res = await invoke({ channel: "restore-restore-point", payload: seq })
            if (res?.success) {
                toast.info(t("backup.restoring"))
            } else {
                toast.error(res?.error || t("backup.restore_failed"))
            }
        } catch (err) {
            console.error(err)
            toast.error(t("backup.restore_failed"))
        } finally {
            setRestoringId(null)
        }
    }

    const formatType = (type: number) => {
        if (type === 0) return "APPLICATION_INSTALL"
        if (type === 1) return "APPLICATION_UNINSTALL"
        if (type === 10) return "DEVICE_DRIVER_INSTALL"
        if (type === 12) return "MODIFY_SETTINGS"
        return "MANUAL"
    }

    return (
        <RootDiv style={{}}>
            <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
                <div className="flex items-center justify-between pb-6 border-b border-white/5">
                    <div>
                        <h1 className="text-3xl font-display text-white">Khôi Phục Nhân Phẩm</h1>
                        <p className="text-white/50 text-sm mt-1 uppercase tracking-widest font-bold">Làm hỏng máy? Cứu rỗi tại đây.</p>
                    </div>
                    {!isAdmin && (
                        <div className="flex-1 mx-8 px-4 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold animate-pulse flex items-center gap-3">
                            <span className="p-1 rounded-full bg-rose-500 text-white"><X size={12} /></span>
                            YÊU CẦU QUYỀN ADMINISTRATOR ĐỂ TẠO/PHỤC HỒI ĐIỂM LƯU
                        </div>
                    )}
                    <div className="flex gap-3">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={fetchRestorePoints}
                            disabled={loading}
                            className={`gap-2 px-4 py-2 rounded-xl text-xs font-bold tracking-wider uppercase transition-all border ${loading ? "border-white/5 text-white/30" : "border-white/10 text-white/60 hover:text-white hover:bg-white/5 hover:border-white/20"}`}
                        >
                            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                            Làm Mới
                        </Button>
                        <Button variant="ghost" className="gap-2 px-4 py-2 rounded-xl text-xs font-bold tracking-wider uppercase transition-all border border-rose-500/30 text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 hover:text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.1)]" onClick={() => setDeleteOpen(true)} disabled={!isAdmin}>
                            <Trash2 size={16} /> Dọn Sạch
                        </Button>
                        <Button variant="ghost" className="gap-2 px-4 py-2 rounded-xl text-xs font-bold tracking-wider uppercase transition-all border border-cyan-500/40 text-cyan-400 bg-cyan-500/20 hover:bg-cyan-500/30 hover:text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.2)]" onClick={() => setCreateOpen(true)} disabled={!isAdmin}>
                            <Save size={16} /> Tạo Điểm Lưu
                        </Button>
                    </div>
                </div>

                <div className="space-y-4">
                    <h2 className="text-[10px] font-bold text-white/30 uppercase tracking-widest pl-1">Danh sách phao cứu sinh</h2>

                    {loading ? (
                        <div className="text-center py-16 border-2 border-dashed border-white/5 rounded-2xl bg-[#09090b]/40 backdrop-blur-sm">
                            <p className="text-white/40 uppercase tracking-wider text-sm font-bold animate-pulse">Đang tìm phao...</p>
                        </div>
                    ) : (
                        <div className="grid gap-3">
                            {restorePoints.map(rp => (
                                <div
                                    key={rp.SequenceNumber}
                                    className="p-5 flex items-center justify-between group rounded-2xl border border-white/5 bg-[#09090b]/80 backdrop-blur-xl hover:border-white/10 hover:bg-white/5 transition-all duration-300 shadow-[0_8px_30px_rgba(0,0,0,0.4)]"
                                >
                                    <div className="flex items-center gap-5">
                                        <div className="p-3.5 rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20 group-hover:shadow-[0_0_15px_rgba(16,185,129,0.2)] transition-all">
                                            <ArchiveRestore size={22} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold tracking-wider text-sm text-white/90 group-hover:text-white transition-colors">{rp.Description || `Restore Point #${rp.SequenceNumber}`}</h3>
                                            <div className="flex items-center gap-3 mt-1.5 text-xs text-white/40 font-mono">
                                                <span>{rp.CreationTime}</span>
                                                <span className="px-2 py-0.5 rounded-md bg-black/40 border border-white/10 text-[10px]">
                                                    {formatType(rp.RestorePointType)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                setDeletingId(rp.SequenceNumber)
                                                setDeleteOpen(true)
                                            }}
                                            disabled={deleting || restoringId !== null || !isAdmin}
                                            className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 border border-rose-500/20"
                                        >
                                            <X size={14} className="mr-1.5" />
                                            Xoá
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleRestore(rp.SequenceNumber)}
                                            disabled={restoringId !== null || deleting || !isAdmin}
                                            className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 hover:text-cyan-300 border border-cyan-500/20"
                                        >
                                            <RotateCcw size={14} className="mr-1.5" />
                                            {restoringId === rp.SequenceNumber ? "Đang Cứu..." : "Phục Hồi"}
                                        </Button>
                                    </div>
                                </div>
                            ))}

                            {restorePoints.length === 0 && (
                                <div className="text-center py-16 border-2 border-dashed border-rose-500/20 rounded-2xl bg-rose-950/10 backdrop-blur-sm">
                                    <p className="text-rose-400/60 uppercase tracking-wider text-sm font-bold">Chưa có cái phao nào, liều quá vậy!</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Create Backup Modal */}
                <Modal open={createOpen} onClose={() => !creating && setCreateOpen(false)}>
                    <div className="p-8 rounded-3xl border border-cyan-500/20 bg-[#0a0a0c]/95 backdrop-blur-2xl shadow-[0_0_50px_rgba(34,211,238,0.15)] space-y-6">
                        <div className="flex items-center gap-4 pb-4 border-b border-white/5">
                            <div className="p-3 rounded-2xl bg-cyan-500/20 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.3)]">
                                <Save size={28} />
                            </div>
                            <div>
                                <h3 className="text-xl font-display text-white">Lưu Checkpoint</h3>
                                <p className="text-xs text-cyan-400/60 uppercase tracking-widest font-bold mt-1">Hệ Thống Phục Hồi</p>
                            </div>
                        </div>

                        <p className="text-sm text-white/60 leading-relaxed font-medium">Bấm phát lưu luôn tình trạng máy tính hiện tại. Nếu sau này vọc vạch lỗi thì lôi ra backup, tỷ lệ về bờ 100%.</p>

                        <div className="pt-4 flex justify-end gap-3">
                            <Button variant="ghost" className="px-5 py-2.5 rounded-xl uppercase text-xs font-bold border border-white/10 text-white/50 hover:bg-white/5 hover:text-white transition-all shadow-md" onClick={() => setCreateOpen(false)} disabled={creating}>
                                Quay Xe
                            </Button>
                            <Button variant="ghost" className="px-5 py-2.5 rounded-xl uppercase text-xs font-bold border border-cyan-500/40 text-cyan-400 bg-cyan-500/20 hover:bg-cyan-500/30 hover:text-cyan-300 transition-all shadow-[0_0_15px_rgba(34,211,238,0.2)]" onClick={handleCreate} disabled={creating}>
                                {creating ? "Đang Khởi Tạo..." : "Tạo Ngay & Luôn"}
                            </Button>
                        </div>
                    </div>
                </Modal>

                {/* Delete Backup Modal */}
                <Modal open={deleteOpen} onClose={() => !deleting && (setDeleteOpen(false), setDeletingId(null))}>
                    <div className="p-8 rounded-3xl border border-rose-500/20 bg-[#0a0a0c]/95 backdrop-blur-2xl shadow-[0_0_50px_rgba(244,63,94,0.15)] space-y-6">
                        <div className="flex items-center gap-4 pb-4 border-b border-white/5">
                            <div className="p-3 rounded-2xl bg-rose-500/20 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.3)]">
                                <Trash2 size={28} />
                            </div>
                            <div>
                                <h3 className="text-xl font-display text-white">
                                    {deletingId !== null ? "Thủ Tiêu Điểm Phục Hồi Nay" : "Thiêu Rụi Tất Cả"}
                                </h3>
                                <p className="text-xs text-rose-400/60 uppercase tracking-widest font-bold mt-1">Cảnh Báo Nguy Hiểm</p>
                            </div>
                        </div>

                        <p className="text-sm text-white/60 leading-relaxed font-medium">
                            {deletingId !== null
                                ? "Mày có chắc muốn bay màu cái điểm phục hồi này không? Xoá mả nhỡ có gì là mệt à nha."
                                : "Chơi lớn xoá sạch backup? Tôn ngộ không cũng không cứu đc nếu window hỏng!"
                            }
                        </p>

                        <div className="pt-4 flex justify-end gap-3">
                            <Button
                                variant="ghost"
                                className="px-5 py-2.5 rounded-xl uppercase text-xs font-bold border border-white/10 text-white/50 hover:bg-white/5 hover:text-white transition-all shadow-md"
                                onClick={() => { setDeleteOpen(false); setDeletingId(null) }}
                                disabled={deleting}
                            >
                                Sợ Rồi Quay Xe
                            </Button>
                            <Button
                                variant="ghost"
                                className="px-5 py-2.5 rounded-xl uppercase text-xs font-bold border border-rose-500/40 text-rose-400 bg-rose-500/20 hover:bg-rose-500/30 hover:text-rose-300 transition-all shadow-[0_0_15px_rgba(244,63,94,0.2)]"
                                onClick={() => deletingId !== null ? handleDeleteSingleBackup(deletingId) : handleDeleteAllBackups()}
                                disabled={deleting}
                            >
                                {deleting ? "Đang Xoá..." : "Chơi Tới Bến"}
                            </Button>
                        </div>
                    </div>
                </Modal>
            </div>
        </RootDiv>
    )
}
