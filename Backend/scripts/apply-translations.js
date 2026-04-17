const fs = require('fs');
const path = require('path');

const tweaksDir = path.join(__dirname, '../tweaks');

const translations = {
    "align-taskbar-left": {
        title: { en: "Align Taskbar Left", vi: "Căn thanh taskbar sang trái" },
        desc: { en: "Aligns the taskbar to the left side.", vi: "Căn thanh taskbar về phía bên trái màn hình." }
    },
    "debloat-windows": {
        title: { en: "Debloat Windows", vi: "Gỡ bỏ phần mềm rác" },
        desc: { en: "Removes built-in bloatware apps.", vi: "Gỡ bỏ các ứng dụng cài sẵn không cần thiết." }
    },
    "detailed-bsod": {
        title: { en: "Detailed BSOD", vi: "Màn hình xanh chi tiết" },
        desc: { en: "Shows more details on BSOD screens.", vi: "Hiển thị thêm thông tin chi tiết khi gặp lỗi màn hình xanh." }
    },
    "disable-background-ms-store-apps": {
        title: { en: "Disable Background Store Apps", vi: "Tắt ứng dụng Store chạy ngầm" },
        desc: { en: "Prevents Store apps from running in background.", vi: "Ngăn các ứng dụng Microsoft Store chạy ngầm." }
    },
    "disable-copilot": {
        title: { en: "Disable Copilot", vi: "Tắt Windows Copilot" },
        desc: { en: "Disables the AI Copilot feature.", vi: "Vô hiệu hóa tính năng AI Copilot trên thanh taskbar." }
    },
    "disable-core-isolation": {
        title: { en: "Disable Core Isolation", vi: "Tắt Core Isolation (VBS)" },
        desc: { en: "Disables VBS to improve gaming performance.", vi: "Tắt tính năng bảo mật ảo hóa để tăng hiệu năng game." }
    },
    "disable-defender-rtp": {
        title: { en: "Disable Defender RTP", vi: "Tắt bảo vệ thời gian thực" },
        desc: { en: "Disables Windows Defender Real-time Protection.", vi: "Tắt tính năng bảo vệ thời gian thực của Windows Defender." }
    },
    "disable-dynamic-ticking": {
        title: { en: "Disable Dynamic Ticking", vi: "Tắt Dynamic Ticking" },
        desc: { en: "Disables dynamic ticking for stable latency.", vi: "Tắt tính năng dynamic ticking để ổn định độ trễ." }
    },
    "disable-fast-startup": {
        title: { en: "Disable Fast Startup", vi: "Tắt khởi động nhanh" },
        desc: { en: "Disables Fast Startup to free up hibernation file.", vi: "Tắt Fast Startup để sửa lỗi và giải phóng dung lượng." }
    },
    "disable-gamebar": {
        title: { en: "Disable Game Bar", vi: "Tắt Xbox Game Bar" },
        desc: { en: "Disables Xbox Game Bar overlay.", vi: "Tắt tính năng Xbox Game Bar overlay." }
    },
    "disable-hibernation": {
        title: { en: "Disable Hibernation", vi: "Tắt chế độ ngủ đông" },
        desc: { en: "Disables hibernation and deletes hiberfil.sys.", vi: "Tắt chế độ ngủ đông và xóa file hiberfil.sys." }
    },
    "disable-location-tracking": {
        title: { en: "Disable Location Tracking", vi: "Tắt định vị" },
        desc: { en: "Disables system-wide location tracking.", vi: "Tắt tính năng theo dõi vị trí toàn hệ thống." }
    },
    "disable-lockscreen-tips": {
        title: { en: "Disable Lockscreen Tips", vi: "Tắt gợi ý màn hình khóa" },
        desc: { en: "Removes fun facts and tips from lockscreen.", vi: "Xóa bỏ các gợi ý và mẹo vặt trên màn hình khóa." }
    },
    "disable-mouse-acceleration": {
        title: { en: "Disable Mouse Acceleration", vi: "Tắt gia tốc chuột" },
        desc: { en: "Disables 'Enhance pointer precision' for 1:1 aim.", vi: "Tắt tính năng 'Enhance pointer precision' để chuột chính xác hơn." }
    },
    "disable-wifi-sense": {
        title: { en: "Disable Wi-Fi Sense", vi: "Tắt Wi-Fi Sense" },
        desc: { en: "Prevents sharing Wi-Fi credentials.", vi: "Ngăn chặn chia sẻ thông tin đăng nhập Wi-Fi." }
    },
    "enable-dark-mode": {
        title: { en: "Enable Dark Mode", vi: "Bật chế độ tối" },
        desc: { en: "Forces system and apps to use Dark Mode.", vi: "Bắt buộc hệ thống và ứng dụng sử dụng chế độ tối." }
    },
    "enable-end-task-right-click": {
        title: { en: "Enable Right-Click End Task", vi: "Bật End Task ở Taskbar" },
        desc: { en: "Adds 'End Task' option to Taskbar context menu.", vi: "Thêm tùy chọn 'End Task' vào menu chuột phải thanh taskbar." }
    },
    "enable-game-mode": {
        title: { en: "Enable Game Mode", vi: "Bật Game Mode" },
        desc: { en: "Ensures Windows Game Mode is ON.", vi: "Đảm bảo chế độ Game Mode được bật." }
    },
    "enable-hags": {
        title: { en: "Enable HAGS", vi: "Bật HAGS" },
        desc: { en: "Enables Hardware Accelerated GPU Scheduling.", vi: "Bật tính năng lập lịch GPU bằng phần cứng." }
    },
    "enable-optimization-for-windowed-games": {
        title: { en: "Optimize Windowed Games", vi: "Tối ưu game cửa sổ" },
        desc: { en: "Enables optimizations for windowed games.", vi: "Bật các tối ưu hóa cho game chạy ở chế độ cửa sổ." }
    },
    "menu-show-delay-zero": {
        title: { en: "Zero Menu Delay", vi: "Menu hiện tức thì" },
        desc: { en: "Reduces menu show delay to 0ms.", vi: "Giảm độ trễ hiển thị menu xuống 0ms." }
    },
    "optimize-network-settings": {
        title: { en: "Optimize Network", vi: "Tối ưu mạng" },
        desc: { en: "Optimizes TCP/IP settings for gaming.", vi: "Tối ưu hóa các thiết lập TCP/IP cho chơi game." }
    },
    "optimize-nvidia-settings": {
        title: { en: "Optimize NVIDIA", vi: "Tối ưu NVIDIA" },
        desc: { en: "Applies optimized profile for NVIDIA GPUs.", vi: "Áp dụng profile tối ưu cho card màn hình NVIDIA." }
    },
    "remove-gaming-apps": {
        title: { en: "Remove Gaming Bloat", vi: "Gỡ ứng dụng game rác" },
        desc: { en: "Removes Xbox trial apps and overlays.", vi: "Gỡ bỏ các ứng dụng dùng thử Xbox không cần thiết." }
    },
    "remove-onedrive": {
        title: { en: "Remove OneDrive", vi: "Gỡ OneDrive" },
        desc: { en: "Uninstalls OneDrive completely.", vi: "Gỡ bỏ hoàn toàn OneDrive khỏi hệ thống." }
    },
    "revert-context-menu": {
        title: { en: "Classic Context Menu", vi: "Menu chuột phải cũ" },
        desc: { en: "Restores the Windows 10 style context menu.", vi: "Khôi phục menu chuột phải kiểu Windows 10." }
    },
    "run-disk-cleanup": {
        title: { en: "Run Disk Cleanup", vi: "Dọn dẹp ổ đĩa" },
        desc: { en: "Runs native Disk Cleanup utility.", vi: "Chạy công cụ dọn dẹp ổ đĩa của Windows." }
    },
    "set-powershell7-default": {
        title: { en: "Set PowerShell 7 Default", vi: "Dùng PowerShell 7 mặc định" },
        desc: { en: "Sets PS7 as the default terminal shell.", vi: "Đặt PowerShell 7 (nếu có) làm mặc định." }
    },
    "set-services-to-manual": {
        title: { en: "Set Services to Manual", vi: "Chuyển Services sang Manual" },
        desc: { en: "Sets unnecessary services to Manual start.", vi: "Chuyển các dịch vụ không cần thiết sang khởi động thủ công." }
    },
    "set-time-utc": {
        title: { en: "Set Time to UTC", vi: "Đặt giờ UTC" },
        desc: { en: "Sets hardware clock to UTC (for dual boot).", vi: "Đặt đồng hồ phần cứng sang UTC (tốt cho dual boot)." }
    },
    "set-win32-priority-separation": {
        title: { en: "Optimize CPU Priority", vi: "Tối ưu ưu tiên CPU" },
        desc: { en: "Adjusts Win32PrioritySeparation for responsiveness.", vi: "Điều chỉnh Win32PrioritySeparation để tăng độ phản hồi." }
    },
    "show-seconds-in-system-clock": {
        title: { en: "Show Seconds in Clock", vi: "Hiện giây đồng hồ" },
        desc: { en: "Adds seconds to the system tray clock.", vi: "Hiển thị thêm số giây ở đồng hồ hệ thống." }
    },
    "ultimate-performance-plan": {
        title: { en: "Ultimate Performance Plan", vi: "Gói nguồn Ultimate" },
        desc: { en: "Enables Ultimate Performance power plan.", vi: "Kích hoạt gói nguồn Ultimate Performance." }
    },
    "vie-amx": {
         title: { en: "Vie AMX Optimization", vi: "Tối ưu Vie AMX" },
         desc: { en: "Applies Vie's custom Advanced Matrix optimizations.", vi: "Áp dụng các tối ưu hóa Advanced Matrix của Vie." }
    }
};

async function apply() {
    console.log("Applying translations...");
    const files = fs.readdirSync(tweaksDir, { withFileTypes: true });

    for (const dir of files) {
        if (!dir.isDirectory()) continue;
        const metaPath = path.join(tweaksDir, dir.name, 'meta.json');
        
        if (!fs.existsSync(metaPath)) continue;

        try {
            const content = fs.readFileSync(metaPath, 'utf8');
            let meta = JSON.parse(content);
            const lib = translations[dir.name];

            if (!lib) {
                console.log(`[SKIP] No translation found for ${dir.name}`);
                continue;
            }

            // Update title
            meta.title = {
                vi: lib.title.vi,
                en: lib.title.en
            };
            
            // Update description
            meta.description = {
                vi: lib.desc.vi,
                en: lib.desc.en
            };
            
            // Update deepDescription (copy desc if missing for now, or just en version of desc)
            if (meta.deepDescription) {
                 // If it's already an object, respect it, otherwise convert
                 const deepVi = typeof meta.deepDescription === 'object' ? meta.deepDescription.vi : meta.deepDescription;
                 
                 // Simple logic: Use description EN as deep desc EN if specific one not provided
                 // Or we could have added deep to the lib map. For now, simply enabling en.
                 meta.deepDescription = {
                     vi: deepVi,
                     en: lib.desc.en // Fallback to normal desc for deep EN
                 };
            }

            fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf8');
            console.log(`[OK] ${dir.name}`);
            
        } catch (err) {
            console.error(`[ERR] ${dir.name}: ${err.message}`);
        }
    }
}

apply();
