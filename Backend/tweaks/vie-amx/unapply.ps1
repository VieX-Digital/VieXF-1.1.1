[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$ultraRollback = Join-Path (Split-Path -LiteralPath $PSScriptRoot -Parent) 'ultra-debloat\rollback.ps1'
if (-not (Test-Path -LiteralPath $ultraRollback)) {
    throw "Khong tim thay ultra-debloat rollback: $ultraRollback"
}

Write-Host '[vie-amx] Rollback Ultra Debloat (state trong thu muc ultra-debloat)...' -ForegroundColor Cyan
& $ultraRollback
if (-not $?) {
    exit 1
}

# Phuc hoi lop Pro (registry / BCD / power) neu da backup tai C:\VieXF
$Brand = 'VieXF'
$Root = Join-Path $env:SystemDrive $Brand
$BackupRoot = Join-Path $Root 'Backup'
$LogFile = Join-Path $Root 'VieXF-Rollback.log'

function Write-Log {
    param(
        [Parameter(Mandatory)] [string]$Message,
        [ValidateSet('INFO', 'WARN', 'ERROR', 'OK')] [string]$Level = 'INFO'
    )
    $line = "[{0}] [{1}] {2}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Level, $Message
    if (Test-Path -LiteralPath (Split-Path -Parent $LogFile)) {
        Add-Content -Path $LogFile -Value $line -Encoding UTF8 -ErrorAction SilentlyContinue
    }
    switch ($Level) {
        'INFO' { Write-Host $line -ForegroundColor Cyan }
        'WARN' { Write-Host $line -ForegroundColor Yellow }
        'ERROR' { Write-Host $line -ForegroundColor Red }
        'OK' { Write-Host $line -ForegroundColor Green }
    }
}

function Import-RegIfExists {
    param([Parameter(Mandatory)][string]$FilePath)
    if (Test-Path -LiteralPath $FilePath) {
        $null = & reg.exe import $FilePath 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Log "Da import: $FilePath" 'OK'
        }
        else {
            Write-Log "Import loi: $FilePath" 'WARN'
        }
    }
}

if (Test-Path -LiteralPath $BackupRoot) {
    Write-Host '[vie-amx] Khoi phuc backup Pro (C:\VieXF\Backup) neu co...' -ForegroundColor Yellow
    Import-RegIfExists -FilePath (Join-Path $BackupRoot 'ServicesBackup.reg')
    Import-RegIfExists -FilePath (Join-Path $BackupRoot 'SystemProfile.reg')
    Import-RegIfExists -FilePath (Join-Path $BackupRoot 'GraphicsDrivers.reg')
    Import-RegIfExists -FilePath (Join-Path $BackupRoot 'PriorityControl.reg')
    Import-RegIfExists -FilePath (Join-Path $BackupRoot 'Policies-System.reg')
    Import-RegIfExists -FilePath (Join-Path $BackupRoot 'Control.reg')

    $bcdFile = Join-Path $BackupRoot 'BCD-Backup.bcd'
    if (Test-Path -LiteralPath $bcdFile) {
        $null = & bcdedit /import $bcdFile 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Log 'Da phuc hoi BCD tu backup Pro.' 'OK'
        }
    }

    $null = & powercfg /setactive SCHEME_BALANCED 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Log 'Da dat power plan Balanced.' 'OK'
    }
}
else {
    Write-Host '[vie-amx] Khong co C:\VieXF\Backup — bo qua rollback lop Pro.' -ForegroundColor DarkGray
}

Write-Host '[vie-amx] Unapply hoan tat. Nen restart may.' -ForegroundColor Green
exit 0
