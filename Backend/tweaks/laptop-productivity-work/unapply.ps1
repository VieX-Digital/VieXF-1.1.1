<#
.SYNOPSIS
    Reverts Laptop Productivity optimizations.
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
    Write-Host "Reverting Laptop Productivity Tweaks..."

    # Re-enable Game Bar (Default behavior)
    reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\GameDVR" /v "AppCaptureEnabled" /t REG_DWORD /d 1 /f | Out-Null
    reg add "HKCU\System\GameConfigStore" /v "GameDVR_Enabled" /t REG_DWORD /d 1 /f | Out-Null

    # Re-enable Xbox Services (Set to Manual usually)
    $xboxServices = @("XblAuthManager", "XblGameSave", "XboxNetApiSvc", "XboxGipSvc")
    foreach ($svc in $xboxServices) {
        if (Get-Service $svc -ErrorAction SilentlyContinue) {
            Set-Service -Name $svc -StartupType Manual -ErrorAction SilentlyContinue
            Write-Host "Restored service: $svc (Manual)"
        }
    }

    # Re-enable Suggestions
    reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\ContentDeliveryManager" /v "SubscribedContent-338389Enabled" /t REG_DWORD /d 1 /f | Out-Null
    reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\ContentDeliveryManager" /v "SystemPaneSuggestionsEnabled" /t REG_DWORD /d 1 /f | Out-Null

    Write-Host "Revert complete. Note: Removed AppX packages cannot be easily restored without reinstalling from Store."
    Write-Host "Please restart your computer."
}
catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
