Write-Host "Reverting CPU process optimizations..."

$ErrorActionPreference = 'SilentlyContinue'

# 1. Re-enable SysMain (Superfetch)
try {
    Set-Service -Name "SysMain" -StartupType Automatic -ErrorAction Stop
    Start-Service -Name "SysMain" -ErrorAction SilentlyContinue
    Write-Host "SysMain (Superfetch) re-enabled."
} catch {
    Write-Warning "SysMain could not be re-enabled: $_"
}

# 2. Registry: restore defaults
$memPath = "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management"
if (Test-Path $memPath) {
    Set-ItemProperty -Path $memPath -Name "NtfsDisableLastAccessUpdate" -Type DWord -Value 0 -ErrorAction SilentlyContinue
    Set-ItemProperty -Path $memPath -Name "DisablePagingExecutive" -Type DWord -Value 0 -ErrorAction SilentlyContinue
}

# 3. Registry: Processor Scheduling - revert to default
$priorityPath = "HKLM:\SYSTEM\CurrentControlSet\Control\PriorityControl"
if (Test-Path $priorityPath) {
    Set-ItemProperty -Path $priorityPath -Name "Win32PrioritySeparation" -Type DWord -Value 2 -ErrorAction SilentlyContinue
}

# 4. Registry: Re-enable Power Throttling - remove the key
$powerThrottlingPath = "HKLM:\SYSTEM\CurrentControlSet\Control\Power\PowerThrottling"
if (Test-Path $powerThrottlingPath) {
    Remove-ItemProperty -Path $powerThrottlingPath -Name "PowerThrottlingOff" -ErrorAction SilentlyContinue
}

Write-Host "CPU process optimizations reverted to defaults."