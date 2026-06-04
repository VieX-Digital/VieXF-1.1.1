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
        Write-Host "Registry Set: $Path \ $Name = $Value"
    }
    catch {
        Write-Host "Registry Set failed: $Path \ $Name"
    }
}

try {
    Write-Host "Reverting PC Productivity Tweaks..."

    # 1. Reset Power Plan to Balanced
    Write-Host "Resetting Power Plan to Balanced..."
    & powercfg /setactive scheme_balanced

    # 2. Re-enable Game Bar
    Set-RegistryValueSafe -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\GameDVR" -Name "AppCaptureEnabled" -Type DWord -Value 1
    Set-RegistryValueSafe -Path "HKCU:\System\GameConfigStore" -Name "GameDVR_Enabled" -Type DWord -Value 1

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
    Set-RegistryValueSafe -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\DataCollection" -Name "AllowTelemetry" -Type DWord -Value 3 # 3 = Full
    Set-RegistryValueSafe -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\AdvertisingInfo" -Name "Enabled" -Type DWord -Value 1

    Write-Host "Revert complete. Note: Removed AppX packages cannot be restored without reinstalling from Store."
    Write-Host "Please restart your computer."
}
catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
