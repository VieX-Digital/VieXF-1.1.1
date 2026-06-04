Write-Host "Applying NVIDIA optimization settings..."

$ErrorActionPreference = 'SilentlyContinue'

# Function to check for NVIDIA GPU presence
function Test-NvidiaGpuPresence {
    $nvidiaGpu = Get-PnpDevice -Class Display -Status OK | Where-Object { $_.FriendlyName -like "*NVIDIA*" }
    if ($nvidiaGpu) {
        return $true
    } else {
        return $false
    }
}

if (-not (Test-NvidiaGpuPresence)) {
    Write-Host "NVIDIA GPU not found"
    exit 1
}

# Function to set NVIDIA registry keys
function Set-NvidiaRegistryKey {
    param (
        [string]$Path,
        [string]$Name,
        [string]$Value,
        [string]$Type = "DWord"
    )
    $fullPath = 'HKLM:\SYSTEM\CurrentControlSet\Control\Video\'
    Get-ChildItem -Path $fullPath -Recurse -ErrorAction SilentlyContinue | Where-Object { $_.PSIsContainer -and $_.Name -match "0000$" } | ForEach-Object {
        $driverPath = Join-Path $_.PSPath "0000"
        if (-not (Test-Path $driverPath)) {
            New-Item -Path $driverPath -Force | Out-Null
        }
        Set-ItemProperty -Path $driverPath -Name $Name -Value $Value -Type $Type -ErrorAction SilentlyContinue
        Write-Host "  Set $($Name) to $($Value) in $($driverPath)"
    }
}

# 1. Power Management Mode: Prefer Maximum Performance (Value: 1)
Set-NvidiaRegistryKey -Name "PowerMizerEnable" -Value "1"
Set-NvidiaRegistryKey -Name "PowerMizerDefault" -Value "1"
Set-NvidiaRegistryKey -Name "PowerMizerLevel" -Value "1"
Set-NvidiaRegistryKey -Name "PowerMizerLevelAC" -Value "1"
Set-NvidiaRegistryKey -Name "PowerMizerLevelDC" -Value "1"

# 2. Texture Filtering Quality: High Performance (Value: 20)
Set-NvidiaRegistryKey -Name "TextureFilterQuality" -Value "20"

# 3. Low Latency Mode: Ultra (Value: 3)
Set-NvidiaRegistryKey -Name "LowLatencyMode" -Value "3"

# 4. Shader Cache: On (Value: 1)
Set-NvidiaRegistryKey -Name "ShaderCache" -Value "1"

# 5. Threaded Optimization: On (Value: 1)
Set-NvidiaRegistryKey -Name "ThreadedOptimization" -Value "1"

# 6. Vertical Sync (V-Sync): Off (Value: 0)
Set-NvidiaRegistryKey -Name "VSync" -Value "0"

Write-Host "NVIDIA optimization settings applied successfully."

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
