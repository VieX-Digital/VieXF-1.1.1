[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$script:Context = $null
$script:State = $null
$script:Summary = [ordered]@{
    ServicesRestored = 0
    TasksRestored = 0
    StartupEntriesRestored = 0
    RegistryValuesRestored = 0
    AppxRestoreAttempts = 0
}

function Test-IsAdmin {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($identity)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Write-Log {
    param(
        [Parameter(Mandatory)][string]$Message,
        [ValidateSet('INFO', 'WARN', 'ERROR', 'OK')][string]$Level = 'INFO'
    )

    $timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss.fff'
    $line = "[{0}] [{1}] {2}" -f $timestamp, $Level, $Message
    switch ($Level) {
        'INFO' { Write-Host $line -ForegroundColor Cyan }
        'WARN' { Write-Host $line -ForegroundColor Yellow }
        'ERROR' { Write-Host $line -ForegroundColor Red }
        'OK' { Write-Host $line -ForegroundColor Green }
    }
}

function Ensure-Directory {
    param([Parameter(Mandatory)][string]$Path)
    if (-not (Test-Path -LiteralPath $Path)) {
        New-Item -ItemType Directory -Path $Path -Force | Out-Null
    }
}

function Initialize-Context {
    $userDataPath = Join-Path $env:APPDATA 'vie-xf'
    $tweakDataPath = Join-Path $userDataPath 'tweak-data\ultra-debloat'

    $logRoot = Join-Path $tweakDataPath 'logs'
    $backupRoot = Join-Path $tweakDataPath 'backups'
    Ensure-Directory -Path $logRoot
    Ensure-Directory -Path $backupRoot
    $timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
    $script:Context = [ordered]@{
        LogRoot = $logRoot
        BackupRoot = $backupRoot
        StatePath = Join-Path $backupRoot 'ultra-debloat-state.json'
        TranscriptPath = Join-Path $logRoot ("rollback-{0}.log" -f $timestamp)
    }
}

function Ensure-Admin {
    if (-not (Test-IsAdmin)) {
        throw 'Please run this script as Administrator.'
    }
}

function Start-Logging {
    try {
        Start-Transcript -LiteralPath $script:Context.TranscriptPath -Force | Out-Null
    }
    catch {
        Write-Log "Transcript could not be started: $($_.Exception.Message)" 'WARN'
    }
}

function Stop-Logging {
    try {
        Stop-Transcript | Out-Null
    }
    catch {
    }
}

function Load-State {
    $oldBackupRoot = Join-Path $PSScriptRoot 'backups'
    $oldStatePath = Join-Path $oldBackupRoot 'ultra-debloat-state.json'
    
    if (-not (Test-Path -LiteralPath $script:Context.StatePath)) {
        if (Test-Path -LiteralPath $oldStatePath) {
            Write-Log "State file found in old path. Utilizing old state file: $oldStatePath" 'INFO'
            $script:Context.StatePath = $oldStatePath
        } else {
            Write-Log "State file not found. Assuming already rolled back or deleted." 'WARN'
            exit 0
        }
    }

    $script:State = Get-Content -LiteralPath $script:Context.StatePath -Raw | ConvertFrom-Json
}

function Save-State {
    $script:State | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath $script:Context.StatePath -Encoding UTF8
}

function Invoke-TrackedStep {
    param(
        [Parameter(Mandatory)][string]$Name,
        [Parameter(Mandatory)][scriptblock]$ScriptBlock
    )
    try {
        & $ScriptBlock
    }
    catch {
        Write-Log ("{0} failed: {1}" -f $Name, $_.Exception.Message) 'WARN'
    }
}

function Ensure-RegistryPath {
    param([Parameter(Mandatory)][string]$Path)
    if (-not (Test-Path -LiteralPath $Path)) {
        New-Item -Path $Path -Force | Out-Null
    }
}

function Restore-RegistryValues {
    foreach ($record in $script:State.registry.values) {
        Invoke-TrackedStep -Name "Registry restore [$($record.path)::$($record.name)]" -ScriptBlock {
            if ($record.existed) {
                Ensure-RegistryPath -Path $record.path
                $value = $record.value
                $type = $record.kind
                if ($record.valueBase64) {
                    $value = [Convert]::FromBase64String([string]$record.valueBase64)
                    $type = 'Binary'
                }
                New-ItemProperty -Path $record.path -Name $record.name -PropertyType $type -Value $value -Force | Out-Null
            }
            else {
                if (Test-Path -LiteralPath $record.path) {
                    Remove-ItemProperty -LiteralPath $record.path -Name $record.name -Force -ErrorAction SilentlyContinue
                }
            }
            $script:Summary.RegistryValuesRestored++
            Write-Log "Registry restored: $($record.path) :: $($record.name)" 'OK'
        }
    }
}

function Restore-StartupEntries {
    foreach ($record in $script:State.startup.runValues) {
        Invoke-TrackedStep -Name "Run restore [$($record.path)::$($record.name)]" -ScriptBlock {
            Ensure-RegistryPath -Path $record.path
            New-ItemProperty -Path $record.path -Name $record.name -PropertyType $record.kind -Value $record.value -Force | Out-Null
            $script:Summary.StartupEntriesRestored++
            Write-Log "Startup Run restored: $($record.name)" 'OK'
        }
    }

    foreach ($record in $script:State.startup.startupApproved) {
        Invoke-TrackedStep -Name "StartupApproved restore [$($record.path)::$($record.name)]" -ScriptBlock {
            Ensure-RegistryPath -Path $record.path
            $bytes = [Convert]::FromBase64String([string]$record.valueBase64)
            New-ItemProperty -Path $record.path -Name $record.name -PropertyType Binary -Value $bytes -Force | Out-Null
            $script:Summary.StartupEntriesRestored++
            Write-Log "StartupApproved restored: $($record.name)" 'OK'
        }
    }

    foreach ($record in $script:State.startup.startupFolder) {
        Invoke-TrackedStep -Name "Startup folder restore [$($record.originalPath)]" -ScriptBlock {
            if (Test-Path -LiteralPath $record.backupPath) {
                $parent = Split-Path -Path $record.originalPath -Parent
                if (-not (Test-Path -LiteralPath $parent)) {
                    New-Item -ItemType Directory -Path $parent -Force | Out-Null
                }
                Move-Item -LiteralPath $record.backupPath -Destination $record.originalPath -Force
                $script:Summary.StartupEntriesRestored++
                Write-Log "Startup folder item restored: $($record.originalPath)" 'OK'
            }
        }
    }

    foreach ($record in $script:State.startup.scheduledTasks) {
        Invoke-TrackedStep -Name "Scheduled startup task restore [$($record.taskPath)$($record.taskName)]" -ScriptBlock {
            if ($record.originallyEnabled) {
                Enable-ScheduledTask -TaskPath $record.taskPath -TaskName $record.taskName | Out-Null
                $script:Summary.StartupEntriesRestored++
                Write-Log "Scheduled startup task restored: $($record.taskPath)$($record.taskName)" 'OK'
            }
        }
    }
}

function Set-ServiceStartupMode {
    param(
        [Parameter(Mandatory)][string]$Name,
        [Parameter(Mandatory)][ValidateSet('Automatic', 'Manual', 'Disabled')][string]$StartupType
    )
    $startArg = switch ($StartupType) {
        'Automatic' { 'auto' }
        'Manual' { 'demand' }
        'Disabled' { 'disabled' }
    }
    & sc.exe config $Name start= $startArg | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "sc.exe config failed for service [$Name]"
    }
}

function Restore-Services {
    foreach ($record in $script:State.services) {
        Invoke-TrackedStep -Name "Service restore [$($record.name)]" -ScriptBlock {
            Set-ServiceStartupMode -Name $record.name -StartupType $record.originalStartupType
            $serviceReg = "HKLM:\SYSTEM\CurrentControlSet\Services\$($record.name)"
            if (Test-Path -LiteralPath $serviceReg) {
                if ($record.originalStartupType -eq 'Automatic') {
                    New-ItemProperty -Path $serviceReg -Name 'DelayedAutostart' -PropertyType DWord -Value ([int][bool]$record.originalDelayedAutoStart) -Force | Out-Null
                }
                else {
                    New-ItemProperty -Path $serviceReg -Name 'DelayedAutostart' -PropertyType DWord -Value 0 -Force | Out-Null
                }
            }
            $script:Summary.ServicesRestored++
            Write-Log "Service restored: $($record.name) -> $($record.originalStartupType)" 'OK'
        }
    }
}

function Restore-ScheduledTasks {
    foreach ($record in $script:State.tasks) {
        Invoke-TrackedStep -Name "Scheduled task restore [$($record.taskPath)$($record.taskName)]" -ScriptBlock {
            if ($record.originallyEnabled) {
                Enable-ScheduledTask -TaskPath $record.taskPath -TaskName $record.taskName | Out-Null
                $script:Summary.TasksRestored++
                Write-Log "Scheduled task restored: $($record.taskPath)$($record.taskName)" 'OK'
            }
        }
    }
}

function Restore-PowerConfiguration {
    Invoke-TrackedStep -Name 'Power settings restore' -ScriptBlock {
        if ($script:State.power.appliedScheme) {
            foreach ($record in $script:State.power.settings) {
                powercfg /setacvalueindex $script:State.power.appliedScheme $record.subGroup $record.setting $record.oldAcValue | Out-Null
            }
            powercfg /setactive $script:State.power.appliedScheme | Out-Null
        }

        if ($null -ne $script:State.power.hibernateEnabled) {
            if ([int]$script:State.power.hibernateEnabled -gt 0) {
                powercfg /hibernate on | Out-Null
            }
            else {
                powercfg /hibernate off | Out-Null
            }
        }

        if ($script:State.power.previousActiveScheme) {
            powercfg /setactive $script:State.power.previousActiveScheme | Out-Null
        }
        Write-Log 'Power configuration restored.' 'OK'
    }
}

function Restore-Bcd {
    Invoke-TrackedStep -Name 'BCD restore' -ScriptBlock {
        if ($script:State.bcd.changed) {
            bcdedit /deletevalue '{current}' disabledynamictick | Out-Null
            Write-Log 'BCD restored: disabledynamictick removed.' 'OK'
        }
        if ($script:State.bcd.useplatformtickChanged -eq $true) {
            bcdedit /deletevalue '{current}' useplatformtick | Out-Null
            Write-Log 'BCD restored: useplatformtick removed.' 'OK'
        }
        if ($script:State.bcd.bootMenuPolicyChanged -eq $true) {
            bcdedit /deletevalue '{current}' bootmenupolicy | Out-Null
            Write-Log 'BCD restored: bootmenupolicy removed.' 'OK'
        }
    }
}

function Restore-AppxPackages {
    foreach ($record in $script:State.appx.removed) {
        Invoke-TrackedStep -Name "AppX restore [$($record.packageFullName)]" -ScriptBlock {
            $script:Summary.AppxRestoreAttempts++
            if ($record.manifestPath -and (Test-Path -LiteralPath $record.manifestPath)) {
                Add-AppxPackage -DisableDevelopmentMode -Register $record.manifestPath -ErrorAction Stop
                Write-Log "AppX re-registered: $($record.packageFullName)" 'OK'
            }
            else {
                Write-Log "AppX requires Store/manual reinstall: $($record.packageFullName)" 'WARN'
            }
        }
    }

    foreach ($record in $script:State.appx.provisionedRemoved) {
        Write-Log "Provisioned package may require manual reinstall: $($record.packageName)" 'WARN'
    }
}

function Print-Summary {
    Write-Host ''
    Write-Host '========== VieXF Ultra Debloat Rollback ==========' -ForegroundColor White
    Write-Host ("Services restored: {0}" -f $script:Summary.ServicesRestored) -ForegroundColor White
    Write-Host ("Tasks restored: {0}" -f $script:Summary.TasksRestored) -ForegroundColor White
    Write-Host ("Startup entries restored: {0}" -f $script:Summary.StartupEntriesRestored) -ForegroundColor White
    Write-Host ("Registry values restored: {0}" -f $script:Summary.RegistryValuesRestored) -ForegroundColor White
    Write-Host ("AppX restore attempts: {0}" -f $script:Summary.AppxRestoreAttempts) -ForegroundColor White
    Write-Host ("Logs: {0}" -f $script:Context.LogRoot) -ForegroundColor White
    Write-Host ("Backups: {0}" -f $script:Context.BackupRoot) -ForegroundColor White
    Write-Host 'Some removed inbox apps may still require Microsoft Store or manual reinstall if the original manifest is no longer present.' -ForegroundColor Yellow
    Write-Host '==================================================' -ForegroundColor White
}

try {
    Ensure-Admin
    Initialize-Context
    Start-Logging
    Load-State

    if ($script:State.active -ne $true) {
        Write-Log 'State file indicates rollback already completed. Reapplying saved state is harmless but usually unnecessary.' 'WARN'
    }

    Restore-AppxPackages
    Restore-ScheduledTasks
    Restore-StartupEntries
    Restore-Services
    Restore-RegistryValues
    Restore-PowerConfiguration
    Restore-Bcd
    $script:State.active = $false
    $script:State.rolledBackAt = (Get-Date).ToString('o')
    Save-State
    Write-Log 'Rollback completed.' 'OK'
    Print-Summary
    exit 0
}
catch {
    Write-Log ("Fatal error: {0}" -f $_.Exception.Message) 'ERROR'
    throw
}
finally {
    Stop-Logging
}
