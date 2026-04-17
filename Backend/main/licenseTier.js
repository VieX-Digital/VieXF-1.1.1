import Store from "electron-store"

const store = new Store()

export const PRO_TRIAL_MS = 7 * 24 * 60 * 60 * 1000

/** Kênh Discord mua Pro (đồng bộ với UI). */
export const DISCORD_PURCHASE_URL =
  "https://discord.com/channels/1274585470633906176/1466020101554835466"

function expireProIfNeeded() {
  if (store.get("licenseTier", "free") !== "pro") {
    return
  }
  const exp = Number(store.get("proExpiresAt", 0))
  if (!exp) {
    store.set("licenseTier", "free")
    store.delete("proExpiresAt")
    store.set("proTrialExpiredPending", true)
    return
  }
  if (Date.now() > exp) {
    store.set("licenseTier", "free")
    store.delete("proExpiresAt")
    store.set("proTrialExpiredPending", true)
  }
}

export function getLicenseTier() {
  expireProIfNeeded()
  return store.get("licenseTier", "free") === "pro" ? "pro" : "free"
}

export function getLicenseState() {
  expireProIfNeeded()
  const pending = store.get("proTrialExpiredPending", false)
  if (pending) {
    store.delete("proTrialExpiredPending")
  }

  const tier = store.get("licenseTier", "free") === "pro" ? "pro" : "free"
  const exp = tier === "pro" ? Number(store.get("proExpiresAt", 0)) : 0
  const msRemaining = tier === "pro" && exp ? Math.max(0, exp - Date.now()) : 0
  const daysRemaining =
    tier === "pro" && msRemaining > 0 ? Math.ceil(msRemaining / (24 * 60 * 60 * 1000)) : 0

  return {
    tier,
    expiresAt: tier === "pro" && exp ? exp : null,
    msRemaining,
    daysRemaining,
    proTrialExpired: Boolean(pending),
    discordUrl: DISCORD_PURCHASE_URL,
  }
}

export function setLicenseTier(tier) {
  if (tier === "pro" || tier === "free") {
    store.set("licenseTier", tier)
    if (tier === "free") {
      store.delete("proExpiresAt")
      store.delete("proTrialExpiredPending")
    } else {
      store.set("proExpiresAt", Date.now() + PRO_TRIAL_MS)
    }
    return true
  }
  return false
}

const VALID_PRO_KEY = "VIEXF_PRO-2026"

/**
 * Chỉ mã VieXF_PRO-2026 (không phân biệt hoa thường) kích hoạt Pro trial 7 ngày.
 */
export function tryActivateLicenseKey(rawKey) {
  const key = String(rawKey || "")
    .trim()
    .toUpperCase()
  if (key !== VALID_PRO_KEY) {
    return { ok: false, error: "invalid_key" }
  }

  const expiresAt = Date.now() + PRO_TRIAL_MS
  store.set("licenseTier", "pro")
  store.set("proExpiresAt", expiresAt)
  store.delete("proTrialExpiredPending")

  return { ok: true, tier: "pro", expiresAt }
}
