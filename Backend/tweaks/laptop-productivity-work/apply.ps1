<#
.SYNOPSIS
    Applies safe productivity optimizations for Laptops.
    Focus: Battery life, thermal management, stability.
    Excludes: Heavy debloat, disabling critical services (Print/Update/Defender).
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
    $LogFile = Join-Path $logRoot ("LaptopProductivity-" + (Get-Date -Format 'yyyyMMdd') + ".log")
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
    Write-Log "Starting Laptop Productivity Optimization..."

    # 1. Restore Point
    Write-Log "Creating Restore Point..."
    try {
        Checkpoint-Computer -Description 'VieX Laptop Productivity' -RestorePointType 'MODIFY_SETTINGS' -ErrorAction SilentlyContinue
    }
    catch {
        Write-Log "Could not create restore point (might be disabled)." 'WARN'
    }

    # 2. Power Plan: Balanced (Standard)
    # We enforce Balanced to ensure CPU scales down properly on battery
    Write-Log "Setting Power Plan to Balanced..."
    & powercfg /setactive scheme_balanced

    # 3. Disable Game Bar & Xbox (Not needed for work)
    Write-Log "Disabling Game Bar & Xbox features..."
    # Registry: HKCU:\Software\Microsoft\Windows\CurrentVersion\GameDVR
    Set-RegistryValueSafe -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\GameDVR" -Name "AppCaptureEnabled" -Type DWord -Value 0
    Set-RegistryValueSafe -Path "HKCU:\System\GameConfigStore" -Name "GameDVR_Enabled" -Type DWord -Value 0
    
    # safe services disable
    $xboxServices = @("XblAuthManager", "XblGameSave", "XboxNetApiSvc", "XboxGipSvc")
    foreach ($svc in $xboxServices) {
        if (Get-Service $svc -ErrorAction SilentlyContinue) {
            Set-Service -Name $svc -StartupType Disabled -ErrorAction SilentlyContinue
            if ((Get-Service $svc).Status -eq 'Running') { Stop-Service $svc -Force -ErrorAction SilentlyContinue }
            Write-Log "Disabled service: $svc"
        }
    }

    # 4. Safe Debloat (Consumer Junk Only)
    # Removing: Solitaire, Tips, Feedback Hub, Skype, BingWeather, MixedReality
    # KEEPING: Safe/Productivity apps (Calculator, Photos, StickyNotes, Alarms, SnipSketch)
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
        "*Microsoft.YourPhone*"
    )
    foreach ($pattern in $bloat) {
        Get-AppxPackage -Name $pattern -AllUsers | Remove-AppxPackage -AllUsers -ErrorAction SilentlyContinue
        Write-Log "Removed AppX: $pattern"
    }

    # 5. Productivity / Privacy Tweaks
    # Disable "Get tips, tricks, and suggestions as you use Windows"
    Set-RegistryValueSafe -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\ContentDeliveryManager" -Name "SubscribedContent-338389Enabled" -Type DWord -Value 0
    
    # Disable "Suggested apps in Start Menu"
    Set-RegistryValueSafe -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\ContentDeliveryManager" -Name "SystemPaneSuggestionsEnabled" -Type DWord -Value 0

    # Enable Hibernation (Important for Laptops)
    Write-Log "Enabling Hibernation..."
    & powercfg /hibernate on

    # 6. PDF / Print / Update
    # Ensuring these are ENABLED (just in case)
    Write-Log "Ensuring Print Spooler is enabled..."
    Set-Service -Name "Spooler" -StartupType Automatic -ErrorAction SilentlyContinue
    Start-Service "Spooler" -ErrorAction SilentlyContinue

    Write-Log "Optimization Complete. Restart recommended."
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
