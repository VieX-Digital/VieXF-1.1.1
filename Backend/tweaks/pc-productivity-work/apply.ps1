<#
.SYNOPSIS
    Applies safe productivity optimizations for Desktop PCs.
    Focus: Performance, Responsiveness, Stability.
    Excludes: Dangerous tweaks, removing critical services.
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

#region Logging / Elevation
function Test-IsAdmin {
    $id = [Security.Principal.WindowsIdentity]::GetCurrent()
    $p = New-Object Security.Principal.WindowsPrincipal($id)
    return $p.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Write-Log {
    param(
        [Parameter(Mandatory)] [string] $Message,
        [ValidateSet('INFO', 'WARN', 'ERROR')] [string] $Level = 'INFO'
    )
    $ts = Get-Date -Format 'yyyy-MM-dd HH:mm:ss.fff'
    $line = "[$ts][$Level] $Message"
    $logRoot = Join-Path $env:SystemDrive 'VieX Logs'
    if (-not (Test-Path $logRoot)) { New-Item -Path $logRoot -ItemType Directory -Force | Out-Null }
    $LogFile = Join-Path $logRoot ("PCProductivity-" + (Get-Date -Format 'yyyyMMdd') + ".log")
    $line | Out-File -FilePath $LogFile -Append -Encoding UTF8
    Write-Host $line
}

if (-not (Test-IsAdmin)) {
    Write-Host "[ERROR] Please run this script as Administrator." -ForegroundColor Red
    exit 1
}
#endregion

#region Helpers
function Disable-ScheduledTaskSafe {
    param([Parameter(Mandatory)][string]$TaskName)
    try {
        $t = Get-ScheduledTask -TaskName $TaskName -ErrorAction Stop
        if ($t.State -ne 'Disabled') {
            Disable-ScheduledTask -InputObject $t | Out-Null
            Write-Log "Disabled scheduled task: $TaskName"
        }
    }
    catch {
        Write-Log "Task not found/error: $TaskName" 'WARN'
    }
}

function Set-RegistryValueSafe {
    param(
        [Parameter(Mandatory)] [string] $Path,
        [Parameter(Mandatory)] [string] $Name,
        [Parameter(Mandatory)] [string] $Type,
        [Parameter(Mandatory)] $Value
    )
    try {
        if (-not (Test-Path $Path)) {
            New-Item -Path $Path -Force | Out-Null
        }
        Set-ItemProperty -Path $Path -Name $Name -Type $Type -Value $Value -Force | Out-Null
        Write-Log "Registry Set: $Path \ $Name = $Value"
    }
    catch {
        Write-Log "Registry Set failed: $Path \ $Name" 'WARN'
    }
}
#endregion

try {
    Write-Log "Starting PC Productivity Optimization..."

    # 1. Restore Point
    Write-Log "Creating Restore Point..."
    try {
        Checkpoint-Computer -Description 'VieX PC Productivity' -RestorePointType 'MODIFY_SETTINGS' -ErrorAction SilentlyContinue
    }
    catch {
        Write-Log "Could not create restore point (might be disabled)." 'WARN'
    }

    # 2. Power Plan: High Performance
    Write-Log "Setting Power Plan to High Performance..."
    # High Performance GUID
    & powercfg /setactive 8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c 

    # 3. Disable Power Saving features (USB, PCI)
    Write-Log "Disabling USB Selective Suspend & PCI Link State Power Management..."
    # AC Setting Index: 0x00000000 (Disable) for USB
    & powercfg /SETACVALUEINDEX SCHEME_CURRENT 2a737441-1930-4402-8d77-b2beb10e8616 48e6b7a6-50f5-4782-a5d4-53bb8f07e226 0
    # AC Setting Index for PCI Express: 0 (Off)
    & powercfg /SETACVALUEINDEX SCHEME_CURRENT 501a4d13-42af-401f-99d3-3b1658ea20b3 ee12f906-d277-404b-b6da-e5fa1a576df5 0
    & powercfg /setactive scheme_current

    # 4. Disable Xbox / Game Bar (Bloat for work PC)
    Write-Log "Disabling Game Bar & Xbox features..."
    Set-RegistryValueSafe -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\GameDVR" -Name "AppCaptureEnabled" -Type DWord -Value 0
    Set-RegistryValueSafe -Path "HKCU:\System\GameConfigStore" -Name "GameDVR_Enabled" -Type DWord -Value 0

    $xboxServices = @("XblAuthManager", "XblGameSave", "XboxNetApiSvc", "XboxGipSvc")
    foreach ($svc in $xboxServices) {
        if (Get-Service $svc -ErrorAction SilentlyContinue) {
            Set-Service -Name $svc -StartupType Disabled -ErrorAction SilentlyContinue
            if ((Get-Service $svc).Status -eq 'Running') { Stop-Service $svc -Force -ErrorAction SilentlyContinue }
            Write-Log "Disabled service: $svc"
        }
    }

    # 5. Safe Debloat (Consumer Junk)
    Write-Log "Removing non-essential consumer apps..."
    $bloat = @(
        "*Microsoft.MicrosoftSolitaireCollection*",
        "*Microsoft.Getstarted*",
        "*Microsoft.WindowsFeedbackHub*",
        "*Microsoft.SkypeApp*",
        "*Microsoft.BingWeather*",
        "*Microsoft.BingNews*",
        "*Microsoft.ZuneMusic*",
        "*Microsoft.ZuneVideo*",
        "*Microsoft.MixedReality.Portal*",
        "*Microsoft.XboxApp*",
        "*Microsoft.YourPhone*", 
        "*Microsoft.People*",
        "*Microsoft.WindowsMaps*"
    )
    foreach ($pattern in $bloat) {
        Get-AppxPackage -Name $pattern -AllUsers | Remove-AppxPackage -AllUsers -ErrorAction SilentlyContinue
        Write-Log "Removed AppX: $pattern"
    }

    # 6. Privacy / Telemetry (Safe)
    Write-Log "Applying Safe Privacy Tweaks..."
    Set-RegistryValueSafe -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\DataCollection" -Name "AllowTelemetry" -Type DWord -Value 1 # 1 = Basic/Security only
    Set-RegistryValueSafe -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\AdvertisingInfo" -Name "Enabled" -Type DWord -Value 0

    # 7. Disable Hibernate (Desktop generally doesn't need it, saves space)
    Write-Log "Disabling Hibernation (Free up C: space)..."
    & powercfg /hibernate off

    Write-Log "PC Productivity Optimization Complete. Restart recommended."
}
catch {
    Write-Log "FATAL ERROR: $($_.Exception.Message)" 'ERROR'
    throw
}


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
