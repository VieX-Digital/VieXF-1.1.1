import { ipcMain, shell } from "electron"
import { URL } from "url"
import http from "http"
import Store from "electron-store"
import log from "electron-log"
import { mainWindow } from "./index.js"

const store = new Store()

const DISCORD_CLIENT_ID = "1352856066358120578"
const DISCORD_CLIENT_SECRET = "3VwdgGhc0CQ1H5lP4JgEnOg0e056U7oo"
const DISCORD_REDIRECT_URI = "http://localhost:54321/auth/discord"
const DISCORD_REQUIRED_GUILD_ID = "1274585470633906176"
const DISCORD_REQUIRED_ROLE_ID = "1493244117101314069"
const DISCORD_GAMEMODE_ROLE_ID = "1493244326594215997"
const DISCORD_RAMCLEAR_ROLE_ID = "1493244241223094332"

const AUTH_SCOPES = "identify guilds.members.read guilds"
const logo = "[viexf:auth]:"

function saveSession(userData) {
  store.set("auth:user", userData)
  store.set("auth:authenticated", true)
  store.set("auth:savedAt", Date.now())
}

function saveGameModeSession(userData) {
  store.set("auth:gamemode:user", userData)
  store.set("auth:gamemode:authenticated", true)
  store.set("auth:gamemode:savedAt", Date.now())
}

function clearGameModeSession() {
  store.delete("auth:gamemode:user")
  store.delete("auth:gamemode:authenticated")
  store.delete("auth:gamemode:savedAt")
}

function clearSession() {
  store.delete("auth:user")
  store.delete("auth:authenticated")
  store.delete("auth:savedAt")
  clearGameModeSession()
}

function loadSession() {
  const authenticated = store.get("auth:authenticated")
  if (!authenticated) return null
  const user = store.get("auth:user")
  if (!user) return null
  return user
}

function loadGameModeSession() {
  const authenticated = store.get("auth:gamemode:authenticated")
  if (!authenticated) return null
  const user = store.get("auth:gamemode:user")
  if (!user) return null
  return user
}

function saveRamClearSession(userData) {
  store.set("auth:ramclear:user", userData)
  store.set("auth:ramclear:authenticated", true)
  store.set("auth:ramclear:savedAt", Date.now())
}

function clearRamClearSession() {
  store.delete("auth:ramclear:user")
  store.delete("auth:ramclear:authenticated")
  store.delete("auth:ramclear:savedAt")
}

function loadRamClearSession() {
  const authenticated = store.get("auth:ramclear:authenticated")
  if (!authenticated) return null
  const user = store.get("auth:ramclear:user")
  if (!user) return null
  return user
}

function getAuthFlowConfig(mode) {
  if (mode === "gamemode") {
    return {
      mode,
      requiredRoleId: DISCORD_GAMEMODE_ROLE_ID,
      successChannel: "gamemode:auth:success",
      errorChannel: "gamemode:auth:error",
      missingRoleMessage: "Game Mode yêu cầu Discord role Level 15.",
      save: saveGameModeSession,
    }
  }

  if (mode === "ramclear") {
    return {
      mode,
      requiredRoleId: DISCORD_RAMCLEAR_ROLE_ID,
      successChannel: "ramclear:auth:success",
      errorChannel: "ramclear:auth:error",
      missingRoleMessage: "RamClear yêu cầu Discord role Level 10.",
      save: saveRamClearSession,
    }
  }

  return {
    mode: "app",
    requiredRoleId: DISCORD_REQUIRED_ROLE_ID,
    successChannel: "auth:success",
    errorChannel: "auth:error",
    missingRoleMessage: "Bạn không có quyền truy cập (thiếu role VieXF Plus).",
    save: saveSession,
  }
}

async function exchangeCodeForToken(code) {
  const params = new URLSearchParams()
  params.append("client_id", DISCORD_CLIENT_ID)
  params.append("client_secret", DISCORD_CLIENT_SECRET)
  params.append("grant_type", "authorization_code")
  params.append("code", code)
  params.append("redirect_uri", DISCORD_REDIRECT_URI)

  const resp = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  })

  if (!resp.ok) {
    const errText = await resp.text().catch(() => resp.statusText)
    throw new Error(`Token exchange failed (${resp.status}): ${errText}`)
  }

  return resp.json()
}

async function fetchUserInfo(accessToken) {
  const resp = await fetch("https://discord.com/api/users/@me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!resp.ok) throw new Error(`Failed to fetch user info: ${resp.status}`)
  return resp.json()
}

async function fetchGuildMember(accessToken) {
  const resp = await fetch(
    `https://discord.com/api/users/@me/guilds/${DISCORD_REQUIRED_GUILD_ID}/member`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )
  if (resp.status === 404) {
    return null
  }
  if (!resp.ok) throw new Error(`Failed to fetch guild member: ${resp.status}`)
  return resp.json()
}

function buildDiscordSession(userInfo, memberData) {
  return {
    id: userInfo.id,
    username: userInfo.username,
    discriminator: userInfo.discriminator,
    globalName: userInfo.global_name || userInfo.username,
    avatar: userInfo.avatar
      ? `https://cdn.discordapp.com/avatars/${userInfo.id}/${userInfo.avatar}.png?size=256`
      : `https://cdn.discordapp.com/embed/avatars/${parseInt(userInfo.discriminator || "0") % 5}.png`,
    nick: memberData.nick || null,
    roles: memberData.roles || [],
  }
}

async function handleAuthCode(code, mode = "app") {
  const flow = getAuthFlowConfig(mode)
  log.info(logo, `Received auth code for ${flow.mode}, exchanging for token...`)

  try {
    const tokenData = await exchangeCodeForToken(code)
    const accessToken = tokenData.access_token

    const userInfo = await fetchUserInfo(accessToken)
    log.info(logo, `User identified: ${userInfo.username}#${userInfo.discriminator}`)

    const memberData = await fetchGuildMember(accessToken)
    if (!memberData) {
      log.warn(logo, "User is not a member of the required guild.")
      sendToRenderer(flow.errorChannel, {
        reason: "not_in_guild",
        message: "Bạn không có trong server VieXF.",
      })
      return
    }

    const roles = memberData.roles || []
    if (!roles.includes(flow.requiredRoleId)) {
      log.warn(logo, `User does not have the required role for ${flow.mode}.`)
      sendToRenderer(flow.errorChannel, {
        reason: "missing_role",
        message: flow.missingRoleMessage,
      })
      return
    }

    const session = buildDiscordSession(userInfo, memberData)
    flow.save(session)
    log.info(logo, `Auth success for ${flow.mode} user: ${session.globalName}`)
    sendToRenderer(flow.successChannel, session)
  } catch (err) {
    log.error(logo, "Auth flow error:", err)
    sendToRenderer(flow.errorChannel, {
      reason: "error",
      message: err.message || "Đã xảy ra lỗi xác thực.",
    })
  }
}

function sendToRenderer(channel, payload) {
  try {
    const win = mainWindow
    if (win && !win.isDestroyed() && !win.webContents.isDestroyed()) {
      win.webContents.send(channel, payload)
    }
  } catch (e) {
    log.error(logo, "Failed to send to renderer:", e)
  }
}

let authServer = null
let pendingAuthMode = "app"

async function startDiscordOAuth(mode = "app") {
  pendingAuthMode = mode

  if (authServer) {
    authServer.close()
    authServer = null
  }

  authServer = http.createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`)

    if (url.pathname === "/auth/discord") {
      const code = url.searchParams.get("code")

      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" })
      res.end(`
        <div style="background:#050505; color:white; height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:center; font-family:sans-serif;">
          <h1 style="color:#5865F2">Xác thực thành công!</h1>
          <p>Bạn có thể đóng trình duyệt này và quay lại ứng dụng VieXF.</p>
          <script>setTimeout(() => window.close(), 3000);</script>
        </div>
      `)

      if (code) {
        handleAuthCode(code, pendingAuthMode)
      }

      if (authServer) {
        authServer.close()
        authServer = null
      }
    } else {
      res.writeHead(404)
      res.end()
    }
  })

  authServer.listen(54321, "localhost", () => {
    log.info(logo, "Auth server is listening on port 54321")
  })

  const scopes = encodeURIComponent(AUTH_SCOPES).replace(/%20/g, "+")
  const authUrl =
    `https://discord.com/oauth2/authorize` +
    `?client_id=${DISCORD_CLIENT_ID}` +
    `&response_type=code` +
    `&redirect_uri=${encodeURIComponent(DISCORD_REDIRECT_URI)}` +
    `&scope=${scopes}`

  log.info(logo, `Opening Discord OAuth URL for ${mode}:`, authUrl)
  await shell.openExternal(authUrl)
  return { ok: true }
}

export function setupAuthHandlers() {
  ipcMain.handle("auth:loginWithDiscord", async () => {
    return startDiscordOAuth("app")
  })

  ipcMain.handle("auth:getSession", () => {
    const user = loadSession()
    return { authenticated: !!user, user: user || null }
  })

  ipcMain.handle("auth:logout", () => {
    clearSession()
    log.info(logo, "User logged out, session cleared.")
    return { ok: true }
  })

  ipcMain.handle("gamemode:auth:loginWithDiscord", async () => {
    return startDiscordOAuth("gamemode")
  })

  ipcMain.handle("gamemode:auth:getSession", () => {
    const user = loadGameModeSession()
    return { authenticated: !!user, user: user || null }
  })

  ipcMain.handle("gamemode:auth:logout", () => {
    clearGameModeSession()
    log.info(logo, "Game Mode session cleared.")
    return { ok: true }
  })

  ipcMain.handle("ramclear:auth:loginWithDiscord", async () => {
    return startDiscordOAuth("ramclear")
  })

  ipcMain.handle("ramclear:auth:getSession", () => {
    const user = loadRamClearSession()
    return { authenticated: !!user, user: user || null }
  })

  ipcMain.handle("ramclear:auth:logout", () => {
    clearRamClearSession()
    log.info(logo, "RamClear session cleared.")
    return { ok: true }
  })
}

export function handleProtocolUrl(url) {
  try {
    log.info(logo, "Protocol URL received:", url)
    const parsed = new URL(url)

    if (parsed.hostname === "auth" && parsed.pathname === "/discord") {
      const code = parsed.searchParams.get("code")
      if (code) {
        handleAuthCode(code, pendingAuthMode)
      } else {
        log.warn(logo, "Protocol URL has no code param")
        sendToRenderer("auth:error", {
          reason: "no_code",
          message: "Không nhận được mã xác thực từ Discord.",
        })
      }
    }
  } catch (err) {
    log.error(logo, "Error parsing protocol URL:", err)
  }
}

export { loadSession }
