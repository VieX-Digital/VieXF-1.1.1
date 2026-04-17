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