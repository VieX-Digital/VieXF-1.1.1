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
    reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\GameDVR" /v "AppCaptureEnabled" /t REG_DWORD /d 0 /f | Out-Null
    reg add "HKCU\System\GameConfigStore" /v "GameDVR_Enabled" /t REG_DWORD /d 0 /f | Out-Null

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
    reg add "HKLM\SOFTWARE\Policies\Microsoft\Windows\DataCollection" /v "AllowTelemetry" /t REG_DWORD /d 1 /f | Out-Null # 1 = Basic/Security only
    reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\AdvertisingInfo" /v "Enabled" /t REG_DWORD /d 0 /f | Out-Null

    # 7. Disable Hibernate (Desktop generally doesn't need it, saves space)
    Write-Log "Disabling Hibernation (Free up C: space)..."
    & powercfg /hibernate off

    Write-Log "PC Productivity Optimization Complete. Restart recommended."
}
catch {
    Write-Log "FATAL ERROR: $($_.Exception.Message)" 'ERROR'
    throw
}
