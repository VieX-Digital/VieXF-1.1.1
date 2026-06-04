Write-Host "Applying network tweaks..."

# TCP/IP tweaks - applies in order, continues even if one fails
$ErrorActionPreference = 'SilentlyContinue'

netsh int tcp set heuristics disabled
netsh int tcp set supplemental template=internet congestionprovider=ctcp
netsh int tcp set global rss=enabled
netsh int tcp set global ecncapability=enabled
netsh int tcp set global timestamps=disabled
netsh int tcp set global fastopen=enabled
netsh int tcp set global fastopenfallback=enabled
netsh int tcp set supplemental template=custom icw=10

# MTU: only apply to interfaces that exist (names vary: "Ethernet 2", "Wi-Fi", locale-specific)
$interfaces = (Get-NetIPInterface -AddressFamily IPv4 -ErrorAction SilentlyContinue).InterfaceAlias
foreach ($name in @('Wi-Fi', 'Ethernet')) {
    if ($interfaces -contains $name) {
        netsh interface ipv4 set subinterface "`"$name`"" mtu=1500 store=persistent
    }
}

Write-Host "Network tweaks applied successfully."


# ==========================================
# WIRED WALLPAPER SETTINGS (GEN Z TECH BRO STYLE)
# ==========================================
try {
    $wallpaperPath = "D:\WorkSpace\VieXF-1.1.1-main\VieXF-1.1.1-main\Frontend\Wallpaper\ChatGPT Image 16_30_55 11 thg 5, 2026.png"

    # 1. Thiet lap registry cho wallpaper & style (Style 10 = Fill, tu dong responsive bat ke man to nho)
    $desktopPath = "HKCU:\Control Panel\Desktop"
    Set-ItemProperty -Path $desktopPath -Name "Wallpaper" -Value $wallpaperPath -Force | Out-Null
    Set-ItemProperty -Path $desktopPath -Name "WallpaperStyle" -Value "10" -Force | Out-Null
    Set-ItemProperty -Path $desktopPath -Name "TileWallpaper" -Value "0" -Force | Out-Null

    # 2. Lock cung khong cho user doi wallpaper lung tung
    $activeDesktopPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Policies\ActiveDesktop"
    if (-not (Test-Path $activeDesktopPath)) {
        New-Item -Path $activeDesktopPath -Force | Out-Null
    }
    Set-ItemProperty -Path $activeDesktopPath -Name "NoChangingWallPaper" -Value 1 -Type DWord -Force | Out-Null

    $systemPoliciesPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Policies\System"
    if (-not (Test-Path $systemPoliciesPath)) {
        New-Item -Path $systemPoliciesPath -Force | Out-Null
    }
    Set-ItemProperty -Path $systemPoliciesPath -Name "Wallpaper" -Value $wallpaperPath -Type String -Force | Out-Null
    Set-ItemProperty -Path $systemPoliciesPath -Name "WallpaperStyle" -Value "10" -Type String -Force | Out-Null

    # 3. Force API he thong nap lai wallpaper ngay lap tuc cho muot
    $code = @'
    using System;
    using System.Runtime.InteropServices;
    public class Wallpaper {
        [DllImport("user32.dll", CharSet = CharSet.Auto)]
        public static extern int SystemParametersInfo(int uAction, int uParam, string lpvParam, int fuWinIni);
    }
'@
    Add-Type -TypeDefinition $code -ErrorAction SilentlyContinue
    [Wallpaper]::SystemParametersInfo(20, 0, $wallpaperPath, 3) | Out-Null
} catch {
    # Keep silent to prevent application crash
}
# ==========================================
