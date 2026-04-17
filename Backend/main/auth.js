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

const AUTH_SCOPES = "identify guilds.members.read guilds"

const logo = "[viexf:auth]:"

// --- Session Helpers ---

function saveSession(userData) {
  store.set("auth:user", userData)
  store.set("auth:authenticated", true)
  store.set("auth:savedAt", Date.now())
}

function clearSession() {
  store.delete("auth:user")
  store.delete("auth:authenticated")
  store.delete("auth:savedAt")
}

function loadSession() {
  const authenticated = store.get("auth:authenticated")
  if (!authenticated) return null
  const user = store.get("auth:user")
  if (!user) return null
  return user
}

// --- OAuth Flow ---

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
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  if (resp.status === 404) {
    return null
  }
  if (!resp.ok) throw new Error(`Failed to fetch guild member: ${resp.status}`)
  return resp.json()
}

async function handleAuthCode(code) {
  log.info(logo, "Received auth code, exchanging for token...")

  try {
    const tokenData = await exchangeCodeForToken(code)
    const accessToken = tokenData.access_token

    const userInfo = await fetchUserInfo(accessToken)
    log.info(logo, `User identified: ${userInfo.username}#${userInfo.discriminator}`)

    const memberData = await fetchGuildMember(accessToken)

    if (!memberData) {
      log.warn(logo, "User is not a member of the required guild.")
      sendToRenderer("auth:error", {
        reason: "not_in_guild",
        message: "Bạn không có trong server VieXF.",
      })
      return
    }

    const roles = memberData.roles || []
    const hasRequiredRole = roles.includes(DISCORD_REQUIRED_ROLE_ID)

    if (!hasRequiredRole) {
      log.warn(logo, "User does not have the required role.")
      sendToRenderer("auth:error", {
        reason: "missing_role",
        message: "Bạn không có quyền truy cập (thiếu role VieXF Plus).",
      })
      return
    }

    const session = {
      id: userInfo.id,
      username: userInfo.username,
      discriminator: userInfo.discriminator,
      globalName: userInfo.global_name || userInfo.username,
      avatar: userInfo.avatar
        ? `https://cdn.discordapp.com/avatars/${userInfo.id}/${userInfo.avatar}.png?size=256`
        : `https://cdn.discordapp.com/embed/avatars/${parseInt(userInfo.discriminator || "0") % 5}.png`,
      nick: memberData.nick || null,
    }

    saveSession(session)
    log.info(logo, `Auth success for user: ${session.globalName}`)
    sendToRenderer("auth:success", session)
  } catch (err) {
    log.error(logo, "Auth flow error:", err)
    sendToRenderer("auth:error", {
      reason: "error",
      message: err.message || "Đã xảy ra lỗi không xác định.",
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

let authServer = null;

// --- IPC Handlers ---

export function setupAuthHandlers() {
  // Trigger Discord OAuth login
  ipcMain.handle("auth:loginWithDiscord", async () => {
    // 1. Nếu server cũ còn chạy thì đóng lại
    if (authServer) {
      authServer.close();
      authServer = null;
    }

    // 2. Tạo server HTTP tạm thời để bắt code
    authServer = http.createServer((req, res) => {
      const url = new URL(req.url, `http://${req.headers.host}`);
      
      if (url.pathname === "/auth/discord") {
        const code = url.searchParams.get("code");
        
        // Trả về trang HTML thông báo cho người dùng
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(`
          <div style="background:#050505; color:white; height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:center; font-family:sans-serif;">
            <h1 style="color:#5865F2">Xác thực thành công!</h1>
            <p>Bạn có thể đóng trình duyệt này và quay lại ứng dụng VieXF.</p>
            <script>setTimeout(() => window.close(), 3000);</script>
          </div>
        `);

        if (code) {
          handleAuthCode(code);
        }

        // Đóng server sau khi nhận được code
        if (authServer) {
          authServer.close();
          authServer = null;
        }
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    authServer.listen(54321, "localhost", () => {
      log.info(logo, "Auth server is listening on port 54321");
    });

    // 3. Mở Browser
    const scopes = "identify+guilds.members.read+guilds";
    const authUrl =
      `https://discord.com/oauth2/authorize` +
      `?client_id=${DISCORD_CLIENT_ID}` +
      `&response_type=code` +
      `&redirect_uri=${encodeURIComponent(DISCORD_REDIRECT_URI)}` +
      `&scope=${scopes}`

    log.info(logo, "Opening Discord OAuth URL:", authUrl)
    await shell.openExternal(authUrl)
    return { ok: true }
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
}

export function handleProtocolUrl(url) {
  try {
    log.info(logo, "Protocol URL received:", url)
    const parsed = new URL(url)

    if (parsed.hostname === "auth" && parsed.pathname === "/discord") {
      const code = parsed.searchParams.get("code")
      if (code) {
        handleAuthCode(code)
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
