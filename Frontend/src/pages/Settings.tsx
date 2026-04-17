import { useState, useEffect, useCallback } from "react"
import { useTranslation } from "react-i18next"
import RootDiv from "@/components/rootdiv"

import Button from "@/components/ui/button"
import Toggle from "@/components/ui/toggle"
import Modal from "@/components/ui/modal"
import { invoke } from "@/lib/electron"
import { toast } from "react-toastify"
import jsonData from "../../../package.json"
import { updateThemeColors } from "@/lib/theme"
import useBackgroundStore from "@/store/backgroundStore"
import {
    Settings2,
    Palette,
    Globe,
    ShieldAlert,
    Trash2,
    Image, // Added for background settings
    Rocket,
    Monitor,
    Crown,
} from "lucide-react"

export default function Settings() {
    const { t, i18n } = useTranslation()
    const [lang, setLang] = useState(i18n.language)
    const [primaryColor, setPrimaryColor] = useState("#38bdf8")
    const [runAsAdmin, setRunAsAdmin] = useState(false)
    const [showTrayIcon, setShowTrayIcon] = useState(
        () => localStorage.getItem("vie:showTrayIcon") !== "false"
    )

    const [compactMode, setCompactMode] = useState(
        () => localStorage.getItem("vie:ui-compact") === "true"
    )
    const [backgroundEffect, setBackgroundEffect] = useState(
        () => localStorage.getItem("vie:backgroundEffect") !== "false"
    )
    const {
        backgroundImageUrl, setBackgroundImageUrl,
        backgroundPosition, setBackgroundPosition,
        backgroundSize, setBackgroundSize,
        backgroundRepeat, setBackgroundRepeat,
        backgroundOpacity, setBackgroundOpacity,
    } = useBackgroundStore()
    const [deleteModalOpen, setDeleteModalOpen] = useState(false)
    const [licenseTier, setLicenseTierState] = useState<"free" | "pro">("free")
    const [proDaysRemaining, setProDaysRemaining] = useState(0)
    const [purchaseDiscordUrl, setPurchaseDiscordUrl] = useState(
        "https://discord.com/channels/1274585470633906176/1466020101554835466"
    )
    const [licenseKeyInput, setLicenseKeyInput] = useState("")

    // Sync state with i18next
    useEffect(() => {
        setLang(i18n.language)
    }, [i18n.language])

    const refreshLicense = useCallback(() => {
        invoke({ channel: "license:get", payload: null })
            .then((r: unknown) => {
                const lic = r as {
                    tier?: string
                    daysRemaining?: number
                    discordUrl?: string
                }
                setLicenseTierState(lic?.tier === "pro" ? "pro" : "free")
                setProDaysRemaining(typeof lic?.daysRemaining === "number" ? lic.daysRemaining : 0)
                if (typeof lic?.discordUrl === "string" && lic.discordUrl.startsWith("http")) {
                    setPurchaseDiscordUrl(lic.discordUrl)
                }
            })
            .catch(() => {
                setLicenseTierState("free")
                setProDaysRemaining(0)
            })
    }, [])

    useEffect(() => {
        refreshLicense()
    }, [refreshLicense])

    useEffect(() => {
        updateThemeColors(primaryColor)
    }, [primaryColor])

    useEffect(() => {
        const savedColor = localStorage.getItem("vie:primaryColor")
        if (savedColor) setPrimaryColor(savedColor)
    }, [])

    useEffect(() => {
        localStorage.setItem("vie:ui-compact", String(compactMode))
        if (compactMode) document.body.classList.add("vie-compact")
        else document.body.classList.remove("vie-compact")
    }, [compactMode])

    useEffect(() => {
        localStorage.setItem("vie:backgroundEffect", String(backgroundEffect))
    }, [backgroundEffect])

    useEffect(() => {
        localStorage.setItem("vie:showTrayIcon", String(showTrayIcon))
        invoke({ channel: "set-tray-visibility", payload: showTrayIcon })
    }, [showTrayIcon])

    // Handlers for the new settings
    const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const color = e.target.value
        setPrimaryColor(color)
        localStorage.setItem("vie:primaryColor", color)
    }

    const handleBackgroundImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            const reader = new FileReader()
            reader.onloadend = () => {
                setBackgroundImageUrl(reader.result as string)
            }
            reader.readAsDataURL(file)
        }
    }

    const handleClearBackgroundImage = () => {
        setBackgroundImageUrl("")
    }

    const handleBackgroundOpacityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setBackgroundOpacity(parseFloat(e.target.value) / 100)
    }

    const handleActivatePro = async () => {
        try {
            const r = (await invoke({ channel: "license:activate", payload: licenseKeyInput })) as {
                ok?: boolean
                error?: string
            }
            if (r?.ok) {
                toast.success(t("settings.vie_pro_toast_ok"))
                setLicenseKeyInput("")
                refreshLicense()
            } else {
                toast.error(t("settings.vie_pro_toast_bad"))
            }
        } catch {
            toast.error(t("settings.vie_pro_toast_bad"))
        }
    }

    const handleDowngradeFree = async () => {
        try {
            await invoke({ channel: "license:clear", payload: null })
            refreshLicense()
            toast.info(t("settings.vie_pro_toast_free"))
        } catch {
            toast.error(t("settings.vie_pro_toast_bad"))
        }
    }

    const handleLangToggle = () => {
        const newLang = lang === "vi" ? "en" : "vi"
        i18n.changeLanguage(newLang)
        setLang(newLang)
        localStorage.setItem("vie:lang", newLang)
        toast.info(t("settings.toast_lang_changed"))
    }

    return (
        <RootDiv style={{}}>
            <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
                {/* Header */}
                <div className="flex items-center justify-between pb-6 border-b border-white/5">
                    <div>
                        <h1 className="text-3xl font-display text-white">Độ Tuỳ Chỉnh</h1>
                        <p className="text-white/50 text-sm mt-1 uppercase tracking-widest font-bold">Hack giao diện, độ Setting bao cháy.</p>
                    </div>
                    <div className="px-4 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-xs text-cyan-400 font-mono tracking-widest uppercase font-bold shadow-[0_0_15px_rgba(34,211,238,0.15)]">
                        v{jsonData.version}
                    </div>
                </div>

                {/* 1. Personalization */}
                <Section title={t("settings.personalization")} icon={<Palette size={18} className="text-vie-primary" />}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <SettingItem
                            label={t("settings.accent_color")}
                            desc={t("settings.accent_desc")}
                        >
                            <div className="flex items-center gap-3">
                                <div
                                    className="w-8 h-8 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)] border border-white/10"
                                    style={{ backgroundColor: primaryColor }}
                                />
                                <input
                                    type="color"
                                    value={primaryColor}
                                    onChange={handleColorChange}
                                    className="bg-transparent border-0 w-8 h-8 p-0 cursor-pointer opacity-0 absolute w-8 h-8"
                                />
                                <Button size="sm" variant="secondary" className="relative">
                                    {t("settings.pick_color")}
                                    <input
                                        type="color"
                                        value={primaryColor}
                                        onChange={handleColorChange}
                                        className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                                    />
                                </Button>
                            </div>
                        </SettingItem>

                        <SettingItem
                            label={t("settings.language")}
                            desc={t("settings.language_desc")}
                        >
                            <Button onClick={handleLangToggle} variant="secondary" className="min-w-[80px]">
                                {lang === "vi" ? "Tiếng Việt" : "English"}
                            </Button>
                        </SettingItem>

                        <SettingItem
                            label={t("settings.compact_mode")}
                            desc={t("settings.compact_desc")}
                        >
                            <Toggle checked={compactMode} onChange={(e) => setCompactMode(e.target.checked)} />
                        </SettingItem>

                        <SettingItem
                            label={t("settings.background_effect")}
                            desc={t("settings.background_effect_desc")}
                        >
                            <Toggle checked={backgroundEffect} onChange={(e) => setBackgroundEffect(e.target.checked)} />
                        </SettingItem>
                    </div>
                </Section>

                {/* 1.1. Background */}
                <Section title={t("settings.background")} icon={<Image size={18} className="text-vie-primary" />}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <SettingItem
                            label={t("settings.background_image")}
                            desc={t("settings.background_image_desc")}
                        >
                            <div className="flex items-center gap-3">
                                <Button size="sm" variant="secondary" className="relative">
                                    {t("settings.upload_image")}
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleBackgroundImageUpload}
                                        className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                                    />
                                </Button>
                                {backgroundImageUrl && (
                                    <Button size="sm" variant="danger" onClick={handleClearBackgroundImage}>
                                        {t("settings.clear_image")}
                                    </Button>
                                )}
                            </div>
                        </SettingItem>

                        <SettingItem
                            label={t("settings.background_position")}
                            desc={t("settings.background_position_desc")}
                        >
                            <select
                                value={backgroundPosition}
                                onChange={(e) => setBackgroundPosition(e.target.value)}
                                className="bg-vie-card border border-vie-border rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-vie-primary"
                            >
                                <option value="center">{t("settings.position_center")}</option>
                                <option value="top">{t("settings.position_top")}</option>
                                <option value="bottom">{t("settings.position_bottom")}</option>
                                <option value="left">{t("settings.position_left")}</option>
                                <option value="right">{t("settings.position_right")}</option>
                            </select>
                        </SettingItem>

                        <SettingItem
                            label={t("settings.background_size")}
                            desc={t("settings.background_size_desc")}
                        >
                            <select
                                value={backgroundSize}
                                onChange={(e) => setBackgroundSize(e.target.value)}
                                className="bg-vie-card border border-vie-border rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-vie-primary"
                            >
                                <option value="cover">{t("settings.size_cover")}</option>
                                <option value="contain">{t("settings.size_contain")}</option>
                                <option value="auto">{t("settings.size_auto")}</option>
                                <option value="100% 100%">{t("settings.size_fill")}</option>
                            </select>
                        </SettingItem>

                        <SettingItem
                            label={t("settings.background_repeat")}
                            desc={t("settings.background_repeat_desc")}
                        >
                            <select
                                value={backgroundRepeat}
                                onChange={(e) => setBackgroundRepeat(e.target.value)}
                                className="bg-vie-card border border-vie-border rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-vie-primary"
                            >
                                <option value="no-repeat">{t("settings.repeat_no_repeat")}</option>
                                <option value="repeat">{t("settings.repeat_repeat")}</option>
                                <option value="repeat-x">{t("settings.repeat_repeat_x")}</option>
                                <option value="repeat-y">{t("settings.repeat_repeat_y")}</option>
                            </select>
                        </SettingItem>

                        <SettingItem
                            label={t("settings.background_opacity")}
                            desc={t("settings.background_opacity_desc")}
                        >
                            <div className="flex items-center gap-3 w-full max-w-[150px]">
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={backgroundOpacity * 100}
                                    onChange={handleBackgroundOpacityChange}
                                    className="w-full h-2 bg-vie-border rounded-lg appearance-none cursor-pointer accent-vie-primary"
                                />
                                <span className="text-sm text-white min-w-[30px] text-right">
                                    {Math.round(backgroundOpacity * 100)}%
                                </span>
                            </div>
                        </SettingItem>
                    </div>
                </Section>

                <Section title={t("settings.vie_pro_section")} icon={<Crown size={18} className="text-amber-400" />}>
                    <div className="space-y-4">
                        <SettingItem label={t("settings.vie_pro_status")} desc={t("settings.vie_pro_status_desc")}>
                            <div className="flex flex-col items-end gap-2">
                                <span
                                    className={`text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg border ${
                                        licenseTier === "pro"
                                            ? "text-amber-300 border-amber-500/40 bg-amber-500/10"
                                            : "text-white/50 border-white/10 bg-white/5"
                                    }`}
                                >
                                    {licenseTier === "pro" ? t("settings.vie_pro_badge_pro") : t("settings.vie_pro_badge_free")}
                                </span>
                                {licenseTier === "pro" && proDaysRemaining > 0 && (
                                    <span className="text-[11px] text-amber-200/80">
                                        {t("settings.vie_pro_days_left", { count: proDaysRemaining })}
                                    </span>
                                )}
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    className="text-xs"
                                    onClick={async () => {
                                        try {
                                            await invoke({ channel: "shell:open-external", payload: purchaseDiscordUrl })
                                        } catch {
                                            window.open(purchaseDiscordUrl, "_blank", "noopener,noreferrer")
                                        }
                                    }}
                                >
                                    {t("settings.vie_pro_buy_discord")}
                                </Button>
                            </div>
                        </SettingItem>
                        <SettingItem label={t("settings.vie_pro_activate_label")} desc={t("settings.vie_pro_activate_desc")}>
                            <div className="flex flex-col items-end gap-2 w-full max-w-xs">
                                <input
                                    type="text"
                                    value={licenseKeyInput}
                                    onChange={(e) => setLicenseKeyInput(e.target.value)}
                                    placeholder={t("settings.vie_pro_key_placeholder")}
                                    className="w-full bg-vie-card border border-vie-border rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                                />
                                <div className="flex gap-2">
                                    <Button size="sm" variant="secondary" onClick={handleActivatePro}>
                                        {t("settings.vie_pro_activate_btn")}
                                    </Button>
                                    {licenseTier === "pro" && (
                                        <Button size="sm" variant="ghost" onClick={handleDowngradeFree} className="text-white/50">
                                            {t("settings.vie_pro_back_free")}
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </SettingItem>
                    </div>
                </Section>

                {/* 2. System & Admin */}
                <Section title="Độ Sâu Hệ Thống" icon={<ShieldAlert size={20} className="text-cyan-400" />}>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-5 rounded-2xl bg-[#09090b]/40 border border-white/5 hover:border-white/10 transition-colors shadow-inner">
                            <div className="flex items-center gap-5">
                                <div className="p-3 rounded-xl bg-orange-500/10 text-orange-400 shadow-[0_0_10px_rgba(249,115,22,0.2)]">
                                    <ShieldAlert size={22} />
                                </div>
                                <div className="space-y-1">
                                    <h4 className="text-sm font-bold tracking-wider uppercase text-white">Auto Chạy Quyền Admin</h4>
                                    <p className="text-xs text-white/40 font-medium">Auto run as Administrator mỗi khi bật app. An toàn nhưng cẩn thận củi lửa.</p>
                                </div>
                            </div>
                            <Toggle checked={runAsAdmin} onChange={(e) => setRunAsAdmin(e.target.checked)} />
                        </div>

                        <div className="flex items-center justify-between p-5 rounded-2xl bg-[#09090b]/40 border border-white/5 hover:border-white/10 transition-colors shadow-inner">
                            <div className="flex items-center gap-5">
                                <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.2)]">
                                    <Monitor size={22} />
                                </div>
                                <div className="space-y-1">
                                    <h4 className="text-sm font-bold tracking-wider uppercase text-white">Ghim Khay Hệ Thống</h4>
                                    <p className="text-xs text-white/40 font-medium">Thu nhỏ xuống system tray khi chéo đi, ngầm ngầm cho sạch taskbar.</p>
                                </div>
                            </div>
                            <Toggle checked={showTrayIcon} onChange={(e) => setShowTrayIcon(e.target.checked)} />
                        </div>

                        <div className="flex items-center justify-between p-5 rounded-2xl bg-[#09090b]/40 border border-white/5 hover:border-white/10 transition-colors shadow-inner">
                            <div className="flex items-center gap-5">
                                <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400 shadow-[0_0_10px_rgba(99,102,241,0.2)]">
                                    <Rocket size={22} />
                                </div>
                                <div className="space-y-1">
                                    <h4 className="text-sm font-bold tracking-wider uppercase text-white">Unlock Mắc FPS</h4>
                                    <p className="text-xs text-white/40 font-medium">Tới công chuyện với tools chuyên sâu của hệ liệt ngoài VieXF.</p>
                                </div>
                            </div>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => window.open("https://discord.gg/wsphWPp7Zr", "_blank")}
                                className="px-4 py-2 text-xs font-bold uppercase tracking-wider border border-indigo-500/30 text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 hover:text-indigo-300 rounded-lg shadow-md transition-all"
                            >
                                Get Đồ Chơi
                            </Button>
                        </div>
                    </div>
                </Section>

                {/* 3. Data */}
                <Section title={t("settings.data_mgmt")} icon={<Settings2 size={18} className="text-vie-text-dim" />}>
                    <div className="flex items-center gap-4">
                        <Button variant="danger" onClick={() => setDeleteModalOpen(true)}>
                            <Trash2 size={14} className="mr-2" /> {t("settings.clear_backup")}
                        </Button>
                        <p className="text-xs text-vie-text-dim">
                            {t("settings.clear_backup_desc")}
                        </p>
                    </div>
                </Section>

            </div>

            {/* Delete Modal */}
            <Modal open={deleteModalOpen} onClose={() => setDeleteModalOpen(false)}>
                <div className="p-6 text-center space-y-4">
                    <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto">
                        <Trash2 size={24} />
                    </div>
                    <h3 className="text-lg font-medium text-white">{t("settings.modal_delete_title")}</h3>
                    <p className="text-sm text-vie-text-muted">
                        {t("settings.modal_delete_desc")}
                    </p>
                    <div className="flex gap-3 justify-center pt-2">
                        <Button variant="secondary" onClick={() => setDeleteModalOpen(false)}>{t("settings.cancel")}</Button>
                        <Button
                            variant="danger"
                            onClick={() => {
                                invoke({ channel: "delete-old-vie-backups", payload: null })
                                setDeleteModalOpen(false)
                                toast.success(t("settings.toast_backup_deleted"))
                            }}
                        >
                            {t("settings.confirm_delete")}
                        </Button>
                    </div>
                </div>
            </Modal>
        </RootDiv>
    )
}

const Section = ({ title, icon, children }: { title: string, icon: any, children: any }) => (
    <div className="p-6 md:p-8 space-y-6 rounded-3xl border border-white/5 bg-[#0a0a0c]/80 backdrop-blur-xl shadow-2xl">
        <div className="flex items-center gap-3 border-b border-white/5 pb-4 mb-4">
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 shadow-inner">
                {icon}
            </div>
            <h2 className="text-xl font-display tracking-wide uppercase text-white">{title}</h2>
        </div>
        {children}
    </div>
)

const SettingItem = ({ label, desc, children }: { label: string, desc: string, children: any }) => (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#09090b]/40 border border-white/5 focus-within:border-cyan-500/30 transition-colors group">
        <div className="space-y-1">
            <h4 className="text-sm font-bold tracking-wider uppercase text-white/90 group-hover:text-white transition-colors">{label}</h4>
            <p className="text-xs text-white/40 leading-relaxed font-medium">{desc}</p>
        </div>
        <div className="shrink-0 flex items-center justify-end">
            {children}
        </div>
    </div>
)