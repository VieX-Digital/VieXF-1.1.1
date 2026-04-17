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

function Invoke-RegExe {
    param(
        [Parameter(Mandatory)] [ValidateSet('add', 'delete')] [string] $Action,
        [Parameter(Mandatory)] [string] $Key,
        [Parameter(Mandatory)] [string] $Rest
    )
    try {
        $regArgs = @($Action, $Key) + ($Rest -split ' ')
        & reg.exe $Action $Key $Rest.Split(' ') | Out-Null
        Write-Log "Registry ${Action}: $Key"
    }
    catch {
        Write-Log "Registry failed: $Key" 'WARN'
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
    # Registry: HKCU\Software\Microsoft\Windows\CurrentVersion\GameDVR
    reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\GameDVR" /v "AppCaptureEnabled" /t REG_DWORD /d 0 /f | Out-Null
    reg add "HKCU\System\GameConfigStore" /v "GameDVR_Enabled" /t REG_DWORD /d 0 /f | Out-Null
    
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
    reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\ContentDeliveryManager" /v "SubscribedContent-338389Enabled" /t REG_DWORD /d 0 /f | Out-Null
    
    # Disable "Suggested apps in Start Menu"
    reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\ContentDeliveryManager" /v "SystemPaneSuggestionsEnabled" /t REG_DWORD /d 0 /f | Out-Null

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
