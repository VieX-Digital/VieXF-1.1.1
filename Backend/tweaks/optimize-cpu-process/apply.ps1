Write-Host "Applying CPU process optimizations..."

$ErrorActionPreference = 'SilentlyContinue'

# 1. Disable SysMain (Superfetch) - reduces CPU/disk from background prefetching (especially on SSD)
try {
    Set-Service -Name "SysMain" -StartupType Disabled -ErrorAction Stop
    Stop-Service -Name "SysMain" -Force -ErrorAction SilentlyContinue
    Write-Host "SysMain (Superfetch) disabled."
} catch {
    Write-Warning "SysMain not found or could not be disabled: $_"
}

# 2. Registry: Memory Management - reduce I/O and keep kernel in RAM
$memPath = "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management"
if (-not (Test-Path $memPath)) {
    New-Item -Path $memPath -Force | Out-Null
}

Set-ItemProperty -Path $memPath -Name "NtfsDisableLastAccessUpdate" -Type DWord -Value 1 -ErrorAction SilentlyContinue
Set-ItemProperty -Path $memPath -Name "DisablePagingExecutive" -Type DWord -Value 1 -ErrorAction SilentlyContinue

# 3. Registry: Processor Scheduling - prioritize foreground programs more aggressively
$priorityPath = "HKLM:\SYSTEM\CurrentControlSet\Control\PriorityControl"
if (-not (Test-Path $priorityPath)) {
    New-Item -Path $priorityPath -Force | Out-Null
}
# Value 26 (hex 1a) gives foreground apps a 6x boost and longer quantum. Default is 2.
Set-ItemProperty -Path $priorityPath -Name "Win32PrioritySeparation" -Type DWord -Value 26 -ErrorAction SilentlyContinue

# 4. Registry: Disable Power Throttling - ensure background processes get full CPU power
$powerThrottlingPath = "HKLM:\SYSTEM\CurrentControlSet\Control\Power\PowerThrottling"
if (-not (Test-Path $powerThrottlingPath)) {
    New-Item -Path $powerThrottlingPath -Force | Out-Null
}
Set-ItemProperty -Path $powerThrottlingPath -Name "PowerThrottlingOff" -Type DWord -Value 1 -ErrorAction SilentlyContinue

Write-Host "Registry tweaks applied."
Write-Host "CPU process optimizations applied successfully."

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
