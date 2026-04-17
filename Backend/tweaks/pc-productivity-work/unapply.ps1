<#
.SYNOPSIS
    Reverts PC Productivity optimizations.
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Test-IsAdmin {
    $id = [Security.Principal.WindowsIdentity]::GetCurrent()
    $p = New-Object Security.Principal.WindowsPrincipal($id)
    return $p.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

if (-not (Test-IsAdmin)) {
    Write-Host "[ERROR] Please run this script as Administrator." -ForegroundColor Red
    exit 1
}

try {
    Write-Host "Reverting PC Productivity Tweaks..."

    # 1. Reset Power Plan to Balanced
    Write-Host "Resetting Power Plan to Balanced..."
    & powercfg /setactive scheme_balanced

    # 2. Re-enable Game Bar
    reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\GameDVR" /v "AppCaptureEnabled" /t REG_DWORD /d 1 /f | Out-Null
    reg add "HKCU\System\GameConfigStore" /v "GameDVR_Enabled" /t REG_DWORD /d 1 /f | Out-Null

    # 3. Re-enable Xbox Services
    $xboxServices = @("XblAuthManager", "XblGameSave", "XboxNetApiSvc", "XboxGipSvc")
    foreach ($svc in $xboxServices) {
        if (Get-Service $svc -ErrorAction SilentlyContinue) {
            Set-Service -Name $svc -StartupType Manual -ErrorAction SilentlyContinue
            Write-Host "Restored service: $svc (Manual)"
        }
    }

    # 4. Re-enable Hibernate
    Write-Host "Re-enabling Hibernation..."
    & powercfg /hibernate on

    # 5. Re-enable Telemetry (Default)
    reg add "HKLM\SOFTWARE\Policies\Microsoft\Windows\DataCollection" /v "AllowTelemetry" /t REG_DWORD /d 3 /f | Out-Null # 3 = Full
    reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\AdvertisingInfo" /v "Enabled" /t REG_DWORD /d 1 /f | Out-Null

    Write-Host "Revert complete. Note: Removed AppX packages cannot be restored without reinstalling from Store."
    Write-Host "Please restart your computer."
}
catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
