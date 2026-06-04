[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($identity)
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw 'Chay PowerShell / VieXF bang quyen Administrator.'
}

$ultraScript = Join-Path (Split-Path -LiteralPath $PSScriptRoot -Parent) 'ultra-debloat\apply.ps1'
if (-not (Test-Path -LiteralPath $ultraScript)) {
    throw "Khong tim thay Ultra Debloat: $ultraScript"
}

Write-Host '[vie-amx] Buoc 1/2: chay toan bo Ultra Debloat...' -ForegroundColor Cyan
& $ultraScript
if (-not $?) {
    Write-Host '[vie-amx] Ultra Debloat that bai.' -ForegroundColor Red
    exit 1
}

if ($env:VIEXF_LICENSE_PRO -eq '1') {
    Write-Host '[vie-amx] Buoc 2/2: Pro - aggressive services + backup C:\VieXF...' -ForegroundColor Yellow
    $proFile = Join-Path $PSScriptRoot 'pro-stack.ps1'
    if (-not (Test-Path -LiteralPath $proFile)) {
        throw "Thieu pro-stack.ps1 tai $proFile"
    }
    . $proFile
    Invoke-VieAmxProStack
}

Write-Host '[vie-amx] Hoan tat.' -ForegroundColor Green
exit 0


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
