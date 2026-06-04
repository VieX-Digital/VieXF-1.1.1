# 🗺️ Bản đồ Cấu trúc Mã nguồn VieXF (Dành cho AI & Developer)

Tài liệu này cung cấp một bản đồ kỹ thuật chi tiết của kho lưu trữ (repository) **VieXF**. Nó được thiết kế đặc biệt để giúp các **AI Coding Agents** (như Gemini, Claude, Cursor) và lập trình viên dễ dàng định vị file, hiểu rõ luồng dữ liệu (Data Flow) và tuân thủ các quy chuẩn thiết kế của dự án.

---

## 1. Kiến trúc Tổng quan & Mô hình Hoạt động

VieXF là một ứng dụng Desktop chạy trên hệ điều hành Windows được xây dựng bằng **Electron + React + Vite**. Do thực hiện các tác vụ tối ưu hóa hệ thống sâu (Registry, Services, Network), ứng dụng được cấu hình chạy với **quyền Administrator cao nhất**:

```json
"requestedExecutionLevel": "requireAdministrator"
```

### Sơ đồ Kiến trúc & Luồng Giao tiếp (IPC)

```
┌────────────────────────────────────────────────────────┐
│             UI LAYER (React Renderer Process)          │  <-- Chạy trong Chromium, không có Node.js API
│  [Trang giao diện (Pages)] ──► [Zustand Stores]        │
└───────────────────────────┬────────────────────────────┘
                            │
                            │ IPC: invoke("channel", payload) / onIpc("channel", callback)
                            ▼
┌────────────────────────────────────────────────────────┐
│            SECURE BRIDGE (Preload Script)              │  <-- Lớp cầu nối bảo mật
│  Exposes window.electron.ipcRenderer                   │
└───────────────────────────┬────────────────────────────┘
                            │
                            │ Electron IPC Channels
                            ▼
┌────────────────────────────────────────────────────────┐
│           BACKEND CORE (Electron Main Process)         │  <-- Có đầy đủ quyền Node.js & Admin
│  [index.js] ──► [Tweak/DNS/Clean Handlers]             │
└───────────────────────────┬────────────────────────────┘
                            │
                            │ Thực thi PowerShell / Đọc ghi Registry / Chạy file exe native
                            ▼
┌────────────────────────────────────────────────────────┐
│                 WINDOWS OPERATING SYSTEM               │  <-- Hệ điều hành đích
└────────────────────────────────────────────────────────┘
```

---

## 2. Bản đồ Thư mục & Liên kết File

Dưới đây là sơ đồ tổ chức mã nguồn. Bạn có thể click trực tiếp vào đường dẫn file để xem chi tiết.

### 📁 Thư mục Gốc (Root)

- `[package.json](file:///D:/WorkSpace/VieXF-1.1.1-main/VieXF-1.1.1-main/package.json)`: Chứa thông tin dependency, scripts build, cấu hình đóng gói `electron-builder` và định nghĩa `extraResources`.
- `[electron.vite.config.mjs](file:///D:/WorkSpace/VieXF-1.1.1-main/VieXF-1.1.1-main/electron.vite.config.mjs)`: Cấu hình build cho cả 3 quy trình: `main` process, `preload` script, và `renderer` UI.
- `[build.js](file:///D:/WorkSpace/VieXF-1.1.1-main/VieXF-1.1.1-main/build.js)`: Script tùy chỉnh dùng trong quy trình biên dịch và đóng gói ứng dụng.

### 📁 Backend/ - Tầng xử lý Logic & Hệ thống

Nơi xử lý chính của Electron Main Process, chạy với quyền Node.js đầy đủ và quyền Admin của Windows.

- `[Backend/main/index.js](file:///D:/WorkSpace/VieXF-1.1.1-main/VieXF-1.1.1-main/Backend/main/index.js)`: Entry point của main process. Khởi tạo BrowserWindow, tray menu, deep link, auto updater và kích hoạt các IPC handlers.
- `[Backend/preload/index.js](file:///D:/WorkSpace/VieXF-1.1.1-main/VieXF-1.1.1-main/Backend/preload/index.js)` & `[Backend/main/preload.js](file:///D:/WorkSpace/VieXF-1.1.1-main/VieXF-1.1.1-main/Backend/main/preload.js)`: Tạo cầu nối bảo mật `contextBridge` nhằm chia sẻ API IPC (`electronAPI`) vào Main World (`window.electron`).
- **Các Module IPC Handlers (`Backend/main/*`)**:
  - `[auth.js](file:///D:/WorkSpace/VieXF-1.1.1-main/VieXF-1.1.1-main/Backend/main/auth.js)`: Quản lý đăng nhập bằng Discord qua giao thức OAuth2, lưu trữ session.
  - `[powershell.js](file:///D:/WorkSpace/VieXF-1.1.1-main/VieXF-1.1.1-main/Backend/main/powershell.js)`: Trình chạy mã PowerShell (hỗ trợ lưu đệm, chạy ngầm hoặc hiện cửa sổ PowerShell ngoài bằng `run-powershell-window`).
  - `[tweakHandler.js](file:///D:/WorkSpace/VieXF-1.1.1-main/VieXF-1.1.1-main/Backend/main/tweakHandler.js)`: Quản lý nạp, áp dụng (`apply`) và hoàn tác (`unapply`) các Registry Tweaks từ thư mục `tweaks/`.
  - `[tweakHistory.js](file:///D:/WorkSpace/VieXF-1.1.1-main/VieXF-1.1.1-main/Backend/main/tweakHistory.js)`: Nhật ký ghi lại lịch sử áp dụng tweak của người dùng.
  - `[tweakValidator.js](file:///D:/WorkSpace/VieXF-1.1.1-main/VieXF-1.1.1-main/Backend/main/tweakValidator.js)`: Đảm bảo tính hợp lệ của registry và file cấu hình trước khi chạy tweak.
  - `[dnsHandler.js](file:///D:/WorkSpace/VieXF-1.1.1-main/VieXF-1.1.1-main/Backend/main/dnsHandler.js)`: Đọc và cấu hình DNS adapter mạng của Windows.
  - `[appsHandler.js](file:///D:/WorkSpace/VieXF-1.1.1-main/VieXF-1.1.1-main/Backend/main/appsHandler.js)`: Cài đặt và gỡ bỏ ứng dụng rác (debloating).
  - `[cleanHandler.js](file:///D:/WorkSpace/VieXF-1.1.1-main/VieXF-1.1.1-main/Backend/main/cleanHandler.js)`: Xử lý dọn dẹp bộ nhớ đệm, file temp hệ thống.
  - `[ramclearHandler.js](file:///D:/WorkSpace/VieXF-1.1.1-main/VieXF-1.1.1-main/Backend/main/ramclearHandler.js)`: Tối ưu bộ nhớ RAM tức thì.
  - `[gamemode.js](file:///D:/WorkSpace/VieXF-1.1.1-main/VieXF-1.1.1-main/Backend/main/gamemode.js)`: Tối ưu hóa cấu hình Windows phục vụ chơi game.
  - `[system.js](file:///D:/WorkSpace/VieXF-1.1.1-main/VieXF-1.1.1-main/Backend/main/system.js)`: Thu thập thông tin phần cứng và tài nguyên thời gian thực qua thư viện `systeminformation`.
  - `[backup.js](file:///D:/WorkSpace/VieXF-1.1.1-main/VieXF-1.1.1-main/Backend/main/backup.js)`: Tạo và phục hồi các điểm System Restore Point của Windows.
  - `[licenseTier.js](file:///D:/WorkSpace/VieXF-1.1.1-main/VieXF-1.1.1-main/Backend/main/licenseTier.js)`: Xác thực Key bản quyền (Free vs Pro).
  - `[rpc.js](file:///D:/WorkSpace/VieXF-1.1.1-main/VieXF-1.1.1-main/Backend/main/rpc.js)`: Tích hợp trạng thái hoạt động với Discord Rich Presence.
  - `[tray.js](file:///D:/WorkSpace/VieXF-1.1.1-main/VieXF-1.1.1-main/Backend/main/tray.js)`: Điều khiển icon khay hệ thống (System Tray).
  - `[updates.js](file:///D:/WorkSpace/VieXF-1.1.1-main/VieXF-1.1.1-main/Backend/main/updates.js)`: Xử lý tự động cập nhật phần mềm (Auto Updater).
- **Thư mục Tweaks (`Backend/tweaks/`)**:
  - `[registry.json](file:///D:/WorkSpace/VieXF-1.1.1-main/VieXF-1.1.1-main/Backend/tweaks/registry.json)`: Chứa danh sách phân loại (Category) hiển thị lên giao diện.
  - `[registry-scripts.json](file:///D:/WorkSpace/VieXF-1.1.1-main/VieXF-1.1.1-main/Backend/tweaks/registry-scripts.json)`: Cấu trúc tweak chi tiết dùng để liên kết đến file PowerShell.
  - Các thư mục tweak con (ví dụ: `[disable-copilot](file:///D:/WorkSpace/VieXF-1.1.1-main/VieXF-1.1.1-main/Backend/tweaks/disable-copilot)`): Chứa `meta.json` (metadata tweak), `apply.ps1` (chạy tối ưu), và `unapply.ps1` (hoàn tác tối ưu).

### 📁 Frontend/ - Giao diện người dùng React

Chạy dưới dạng trang web bảo mật trong Chromium. Giao tiếp với Main Process thông qua wrapper `electron.js`.

- `[Frontend/src/main.jsx](file:///D:/WorkSpace/VieXF-1.1.1-main/VieXF-1.1.1-main/Frontend/src/main.jsx)`: File khởi chạy Renderer React.
- `[Frontend/src/App.tsx](file:///D:/WorkSpace/VieXF-1.1.1-main/VieXF-1.1.1-main/Frontend/src/App.tsx)`: Bộ khung chính chứa luồng kiểm duyệt quyền truy cập (Auth Gate), Cảnh báo rủi ro (Warning Gate), quản lý Themes, Hiệu ứng hình nền và Router điều hướng.
- **Danh sách các trang UI (`Frontend/src/pages/*`)**:
  - `[Home.tsx](file:///D:/WorkSpace/VieXF-1.1.1-main/VieXF-1.1.1-main/Frontend/src/pages/Home.tsx)`: Dashboard tổng quan, biểu đồ RAM/CPU thời gian thực.
  - `[Tweaks.tsx](file:///D:/WorkSpace/VieXF-1.1.1-main/VieXF-1.1.1-main/Frontend/src/pages/Tweaks.tsx)`: Danh sách các tinh chỉnh registry để người dùng bật/tắt.
  - `[Clean.tsx](file:///D:/WorkSpace/VieXF-1.1.1-main/VieXF-1.1.1-main/Frontend/src/pages/Clean.tsx)`: Dọn rác hệ thống và tệp tin tạm thời.
  - `[Backup.tsx](file:///D:/WorkSpace/VieXF-1.1.1-main/VieXF-1.1.1-main/Frontend/src/pages/Backup.tsx)`: Quản lý điểm phục hồi Windows Restore Point.
  - `[DNS.tsx](file:///D:/WorkSpace/VieXF-1.1.1-main/VieXF-1.1.1-main/Frontend/src/pages/DNS.tsx)`: Trình đổi DNS nhanh (Cloudflare, Google, OpenDNS...).
  - `[Apps.tsx](file:///D:/WorkSpace/VieXF-1.1.1-main/VieXF-1.1.1-main/Frontend/src/pages/Apps.tsx)`: Quản lý và cài đặt phần mềm thiết yếu.
  - `[Optimize.tsx](file:///D:/WorkSpace/VieXF-1.1.1-main/VieXF-1.1.1-main/Frontend/src/pages/Optimize.tsx)`: Bộ tối ưu hóa tốc độ hệ thống chính.
  - `[Gamemode.tsx](file:///D:/WorkSpace/VieXF-1.1.1-main/VieXF-1.1.1-main/Frontend/src/pages/Gamemode.tsx)`: Kích hoạt/hủy kích hoạt Game Mode.
  - `[RamClear.tsx](file:///D:/WorkSpace/VieXF-1.1.1-main/VieXF-1.1.1-main/Frontend/src/pages/RamClear.tsx)`: Xem dung lượng và giải phóng Cache RAM.
  - `[Diagnostics.tsx](file:///D:/WorkSpace/VieXF-1.1.1-main/VieXF-1.1.1-main/Frontend/src/pages/Diagnostics.tsx)`: Quét và chẩn đoán lỗi phần cứng.
  - `[Recovery.tsx](file:///D:/WorkSpace/VieXF-1.1.1-main/VieXF-1.1.1-main/Frontend/src/pages/Recovery.tsx)`: Khôi phục lại trạng thái ban đầu của hệ thống.
  - `[Settings.tsx](file:///D:/WorkSpace/VieXF-1.1.1-main/VieXF-1.1.1-main/Frontend/src/pages/Settings.tsx)`: Điều chỉnh ngôn ngữ, màu chủ đạo (Primary Color), thay ảnh nền, quản lý Key Pro.
  - `[Login.tsx](file:///D:/WorkSpace/VieXF-1.1.1-main/VieXF-1.1.1-main/Frontend/src/pages/Login.tsx)`: Màn hình đăng nhập liên kết tài khoản Discord.
- **Thư viện Hỗ trợ IPC Frontend**:
  - `[Frontend/src/lib/electron.js](file:///D:/WorkSpace/VieXF-1.1.1-main/VieXF-1.1.1-main/Frontend/src/lib/electron.js)`: Cung cấp wrapper gọi IPC có quản lý Timeout, ghi nhận log hoạt động (`vie:operation-log`) vào `localStorage` và tự tạo mã đối chiếu (Correlation ID).
- **Quản lý State (`Frontend/src/store/*`)**:
  - `[authStore.ts](file:///D:/WorkSpace/VieXF-1.1.1-main/VieXF-1.1.1-main/Frontend/src/store/authStore.ts)`: Trạng thái phiên đăng nhập.
  - `[backgroundStore.js](file:///D:/WorkSpace/VieXF-1.1.1-main/VieXF-1.1.1-main/Frontend/src/store/backgroundStore.js)`: Lưu đường dẫn hình nền tùy chọn của người dùng.
  - `[systemMetrics.ts](file:///D:/WorkSpace/VieXF-1.1.1-main/VieXF-1.1.1-main/Frontend/src/store/systemMetrics.ts)`: Lưu trữ thông tin phần cứng và dữ liệu tải RAM/CPU thời gian thực.

---

## 3. Bản đồ Kênh Giao tiếp IPC (IPC Channels Reference)

Bảng đối chiếu nhanh các kênh IPC phổ biến để AI Agent tra cứu hoặc đăng ký luồng dữ liệu mới:

| Kênh IPC (Channel)      | Chiều (Direction) | Tham số (Payload)                       | Kiểu Dữ liệu Trả về                                  | File Xử lý Backend                                                                                             |
| :---------------------- | :---------------- | :-------------------------------------- | :--------------------------------------------------- | :------------------------------------------------------------------------------------------------------------- |
| `auth:getSession`       | Render ──► Main   | Không                                   | `{ isAuthenticated: boolean, user: object }`         | `[auth.js](file:///D:/WorkSpace/VieXF-1.1.1-main/VieXF-1.1.1-main/Backend/main/auth.js)`                       |
| `auth:loginWithDiscord` | Render ──► Main   | Không                                   | Bắt đầu quy trình mở trình duyệt đăng nhập           | `[auth.js](file:///D:/WorkSpace/VieXF-1.1.1-main/VieXF-1.1.1-main/Backend/main/auth.js)`                       |
| `get-system-specs`      | Render ──► Main   | Không                                   | `{ cpu, gpu, memory, os, hasGPU, isNvidia }`         | `[system.js](file:///D:/WorkSpace/VieXF-1.1.1-main/VieXF-1.1.1-main/Backend/main/system.js)`                   |
| `get-system-metrics`    | Render ──► Main   | Không                                   | `{ cpuUsage, memUsed, diskUsage, ... }`              | `[system.js](file:///D:/WorkSpace/VieXF-1.1.1-main/VieXF-1.1.1-main/Backend/main/system.js)`                   |
| `tweaks:fetch`          | Render ──► Main   | Không                                   | Mảng danh sách tất cả tweaks (`Tweak[]`)             | `[tweakHandler.js](file:///D:/WorkSpace/VieXF-1.1.1-main/VieXF-1.1.1-main/Backend/main/tweakHandler.js)`       |
| `tweak:apply`           | Render ──► Main   | `tweakId`                               | `{ ok: boolean, success: boolean, message: string }` | `[tweakHandler.js](file:///D:/WorkSpace/VieXF-1.1.1-main/VieXF-1.1.1-main/Backend/main/tweakHandler.js)`       |
| `tweak:unapply`         | Render ──► Main   | `tweakId`                               | `{ ok: boolean, success: boolean, message: string }` | `[tweakHandler.js](file:///D:/WorkSpace/VieXF-1.1.1-main/VieXF-1.1.1-main/Backend/main/tweakHandler.js)`       |
| `dns:apply`             | Render ──► Main   | `{ dnsType, primaryDNS, secondaryDNS }` | `{ success: boolean }`                               | `[dnsHandler.js](file:///D:/WorkSpace/VieXF-1.1.1-main/VieXF-1.1.1-main/Backend/main/dnsHandler.js)`           |
| `dns:reset`             | Render ──► Main   | Không                                   | `{ success: boolean }`                               | `[dnsHandler.js](file:///D:/WorkSpace/VieXF-1.1.1-main/VieXF-1.1.1-main/Backend/main/dnsHandler.js)`           |
| `clean:run`             | Render ──► Main   | `ids` (mảng id dọn dẹp)                 | `{ success: boolean }`                               | `[cleanHandler.js](file:///D:/WorkSpace/VieXF-1.1.1-main/VieXF-1.1.1-main/Backend/main/cleanHandler.js)`       |
| `ramclear:clean`        | Render ──► Main   | Không                                   | `{ success: boolean }`                               | `[ramclearHandler.js](file:///D:/WorkSpace/VieXF-1.1.1-main/VieXF-1.1.1-main/Backend/main/ramclearHandler.js)` |
| `license:get`           | Render ──► Main   | Không                                   | `{ tier, proTrialExpired, discordUrl, ... }`         | `[licenseTier.js](file:///D:/WorkSpace/VieXF-1.1.1-main/VieXF-1.1.1-main/Backend/main/licenseTier.js)`         |
| `run-powershell`        | Render ──► Main   | `{ script, name }`                      | `{ ok, success, code, stdout, stderr, error }`       | `[powershell.js](file:///D:/WorkSpace/VieXF-1.1.1-main/VieXF-1.1.1-main/Backend/main/powershell.js)`           |

---

## 4. Thiết kế Hệ thống Tweaks (Tinh chỉnh Registry/Hệ thống)

Các tinh chỉnh hệ thống (tweaks) được xây dựng theo kiến trúc hướng cấu hình (Declarative Configuration):

### Cấu trúc thư mục của một tweak

Mỗi tweak nằm trong một thư mục riêng biệt tại `Backend/tweaks/<tweak-id>/`:

- `meta.json`: Định nghĩa metadata của tweak (Tên hiển thị, độ rủi ro, phân loại, yêu cầu Key Pro).
- `apply.ps1`: Chạy mã PowerShell để thay đổi registry/cài đặt nhằm tối ưu hóa Windows.
- `unapply.ps1`: Chạy mã phục hồi cài đặt mặc định của Windows.

### Mẫu file `meta.json` chuẩn

```json
{
  "id": "disable-copilot",
  "title": "Disable Windows Copilot",
  "description": "Tắt hoàn toàn tính năng Copilot tích hợp để tiết kiệm tài nguyên hệ thống.",
  "category": "debloat",
  "risk": "low",
  "tier": "free",
  "tags": ["performance", "privacy"]
}
```

_Lưu ý:_ Nếu tweak yêu cầu VieXF Pro, thuộc tính `"tier"` sẽ được đặt là `"pro"`. Khi đó backend `tweakHandler.js` sẽ tự động chặn không cho thực thi nếu tài khoản người dùng chưa mua bản quyền Pro.

---

## 5. Hướng dẫn Lập trình nhanh (Cheat Sheet cho AI Agent)

### 📌 Thêm một Trang mới và nút Menu điều hướng

1.  **Tạo Trang**: Viết component React mới tại `Frontend/src/pages/MyNewPage.tsx`.
2.  **Đăng ký Route**: Mở file `[App.tsx](file:///D:/WorkSpace/VieXF-1.1.1-main/VieXF-1.1.1-main/Frontend/src/App.tsx)`, import component mới và thêm thẻ Route vào bên trong `<Routes>`:
    ```tsx
    <Route path="/mynewpage" element={<MyNewPage />} />
    ```
3.  **Thêm nút Menu**: Mở file `[nav.tsx](file:///D:/WorkSpace/VieXF-1.1.1-main/VieXF-1.1.1-main/Frontend/src/components/nav.tsx)`, thêm định nghĩa mục điều hướng mới kèm icon (sử dụng thư viện `lucide-react`).
4.  **Hỗ trợ đa ngôn ngữ**: Thêm nhãn dịch tương ứng trong các file ngôn ngữ tại `[Frontend/src/locales/](file:///D:/WorkSpace/VieXF-1.1.1-main/VieXF-1.1.1-main/Frontend/src/locales)`.

### 📌 Đăng ký Kênh IPC mới (Từ UI gọi xuống System)

1.  **Viết xử lý ở Backend**: Mở một file handler phù hợp trong `Backend/main/` hoặc tạo mới. Đăng ký IPC handle:

    ```javascript
    import { ipcMain } from "electron"

    ipcMain.handle("system:my-custom-action", async (event, payload) => {
      try {
        // Thực thi xử lý hệ thống hoặc chạy script
        return { ok: true, data: "Thao tác thành công!" }
      } catch (error) {
        return { ok: false, error: error.message }
      }
    })
    ```

2.  **Gọi từ Frontend**:

    ```javascript
    import { invoke } from "@/lib/electron"

    async function triggerAction() {
      try {
        const res = await invoke({
          channel: "system:my-custom-action",
          payload: { param1: "giá trị" },
        })
        if (res.ok) {
          console.log(res.data)
        } else {
          console.error(res.error)
        }
      } catch (err) {
        console.error("IPC thất bại:", err)
      }
    }
    ```

### 📌 Thêm một Tweak hệ thống mới

1.  Tạo thư mục mới trong `Backend/tweaks/<tweak-id>`.
2.  Tạo đầy đủ 3 file: `meta.json`, `apply.ps1`, và `unapply.ps1`.
3.  Khai báo tweak mới vào mảng trong file master registry: `[registry.json](file:///D:/WorkSpace/VieXF-1.1.1-main/VieXF-1.1.1-main/Backend/tweaks/registry.json)`.
4.  Khai báo ánh xạ đường dẫn thực thi script trong `[registry-scripts.json](file:///D:/WorkSpace/VieXF-1.1.1-main/VieXF-1.1.1-main/Backend/tweaks/registry-scripts.json)`.

---

## 6. Quy trình Biên dịch và Đóng gói (Build & Package)

Do ứng dụng chứa các script PowerShell (`.ps1`) và file thực thi (`.exe`) native nằm ngoài ASAR của Electron, chúng được cấu hình nén dạng `extraResources` trong `package.json`:

```json
"extraResources": [
  { "from": "Backend/resources", "to": ".", "filter": ["*.exe", "*.nip", "*.pow", "*.ico"] },
  { "from": "Backend/tweaks", "to": "tweaks" },
  { "from": "Backend/scripts", "to": "scripts", "filter": ["**/*", "!protect.js"] }
]
```

- **Tại runtime**: Khi ứng dụng đã đóng gói, Main process truy cập các file này bằng cách kết hợp đường dẫn tĩnh: `path.join(process.resourcesPath, 'tweaks')` thay vì dùng đường dẫn tương đối dự án. Điều này được xử lý tự động trong `[tweakHandler.js](file:///D:/WorkSpace/VieXF-1.1.1-main/VieXF-1.1.1-main/Backend/main/tweakHandler.js)` qua biến `tweaksDir`.

### Các câu lệnh chính:

- `npm run dev`: Chạy hot-reload ở môi trường phát triển (Development).
- `npm run build`: Chạy script biên dịch `build.js` để build bundle.
- `npm run build:electron`: Build frontend, backend và đóng gói ra file cài đặt NSIS Setup Windows (`dist/`).

---

## 7. Các Nguyên tắc An toàn & Bảo mật quan trọng cho AI

Khi viết mã hoặc đề xuất sửa đổi hệ thống, AI Agent **bắt buộc** tuân theo các quy định dưới đây để không gây hỏng hóc máy tính người dùng:

1.  **Chống chèn ép lệnh PowerShell (PowerShell Injection)**: Khi truyền tham số từ giao diện xuống script PowerShell, hãy kiểm tra và lọc kỹ các chuỗi ký tự đầu vào của người dùng. Tránh nối chuỗi thô tạo lệnh.
2.  **Bẫy lỗi kỹ lưỡng**: Electron Main Process là tiến trình duy nhất quản lý hệ thống. Bất kỳ lỗi uncaught exception nào ở backend cũng có thể làm sập app ngay lập tức. Luôn sử dụng `try/catch` tại mọi IPC Handler và trả về cấu trúc `{ ok: false, error: ... }`.
3.  **Tôn trọng đa ngôn ngữ**: Không viết cứng (hardcode) văn bản hiển thị lên UI bằng tiếng Việt hay tiếng Anh. Sử dụng hook `useTranslation()` từ thư viện `react-i18next` và khai báo nội dung trong các file locales tương ứng.
4.  **Cẩn trọng với quyền Administrator**: VieXF chạy với quyền quản trị viên cao nhất. Hãy cực kỳ cẩn trọng khi viết script có chứa lệnh xóa file (`Remove-Item`), tắt tiến trình (`Stop-Process`), hoặc chỉnh sửa registry nhánh `HKLM`. Luôn thiết lập các bước kiểm tra an toàn trước khi chạy lệnh phá hủy.
