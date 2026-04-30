import { ipcMain } from "electron"
import Store from "electron-store"
import log from "electron-log"
import { executePowerShell } from "./powershell"

const store = new Store()
const GAME_MODE_STATE_KEY = "gameMode:state"

const DEFAULT_STATE = {
  active: false,
  processId: null,
  processName: null,
  oldPriority: null,
  previousPowerScheme: null,
  appliedPowerScheme: null,
  enabledAt: null,
}

function readState() {
  const state = store.get(GAME_MODE_STATE_KEY)
  if (!state || typeof state !== "object") {
    return { ...DEFAULT_STATE }
  }
  return { ...DEFAULT_STATE, ...state }
}

function writeState(state) {
  store.set(GAME_MODE_STATE_KEY, { ...DEFAULT_STATE, ...state })
}

function clearState() {
  writeState({ ...DEFAULT_STATE })
}

function parsePowerShellJson(result, fallbackError) {
  if (!result?.success) {
    return { success: false, error: result?.error || fallbackError }
  }

  const lines = String(result.output || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      return JSON.parse(lines[i])
    } catch {
      // Continue scanning previous lines. PowerShell modules sometimes write banners.
    }
  }

  return { success: false, error: fallbackError }
}

function encodeStateForPowerShell(state) {
  return Buffer.from(JSON.stringify(state), "utf8").toString("base64")
}

const enableGameModeScript = `
$ErrorActionPreference = 'Stop'

function Emit-Json {
    param([Parameter(Mandatory)]$Payload)
    $Payload | ConvertTo-Json -Compress -Depth 8
    exit 0
}

function Get-GuidFromText {
    param([object[]]$Lines)
    foreach ($line in $Lines) {
        if ([string]$line -match '([A-Fa-f0-9-]{36})') {
            return $matches[1]
        }
    }
    return $null
}

function Find-SchemeByName {
    param(
        [object[]]$Lines,
        [string[]]$Patterns
    )

    foreach ($line in $Lines) {
        $text = [string]$line
        $match = [regex]::Match($text, '([A-Fa-f0-9-]{36})')
        if (-not $match.Success) {
            continue
        }

        foreach ($pattern in $Patterns) {
            if ($text -like "*$pattern*") {
                return $match.Groups[1].Value
            }
        }
    }

    return $null
}

function Get-ActiveScheme {
    $output = @(powercfg /getactivescheme 2>&1)
    if ($LASTEXITCODE -ne 0) {
        throw "Unable to query active power scheme: $($output -join ' ')"
    }

    $guid = Get-GuidFromText -Lines $output
    if (-not $guid) {
        throw 'Unable to parse active power scheme.'
    }
    return $guid
}

function Set-MaxPowerPlan {
    $ultimateGuid = 'e9a42b02-d5df-448d-aa00-03f14749eb61'
    $warnings = @()
    $previous = Get-ActiveScheme

    $schemes = @(powercfg /list 2>&1)
    $target = Find-SchemeByName -Lines $schemes -Patterns @('Ultimate Performance', 'Ultimate', 'Toi da')

    if (-not $target) {
        $duplicate = @(powercfg /duplicatescheme $ultimateGuid 2>&1)
        if ($LASTEXITCODE -eq 0) {
            $target = Get-GuidFromText -Lines $duplicate
        }
        else {
            $warnings += "Unable to duplicate Ultimate Performance: $($duplicate -join ' ')"
        }
    }

    if (-not $target) {
        $schemes = @(powercfg /list 2>&1)
        $target = Find-SchemeByName -Lines $schemes -Patterns @('High performance', 'High Performance', 'Hieu nang cao')
    }

    if (-not $target) {
        $target = $previous
        $warnings += 'Max performance power schemes are unavailable. Applying supported settings to the current power scheme.'
    }

    $setActive = @(powercfg /setactive $target 2>&1)
    if ($LASTEXITCODE -ne 0) {
        throw "Unable to activate max power plan [$target]: $($setActive -join ' ')"
    }

    $settings = @(
        @{ SubGroup = 'SUB_PROCESSOR'; Setting = 'PROCTHROTTLEMIN'; Value = 100 },
        @{ SubGroup = 'SUB_PROCESSOR'; Setting = 'PROCTHROTTLEMAX'; Value = 100 },
        @{ SubGroup = 'SUB_PROCESSOR'; Setting = 'PERFBOOSTMODE'; Value = 2 },
        @{ SubGroup = 'SUB_PROCESSOR'; Setting = 'IDLEDISABLE'; Value = 1 },
        @{ SubGroup = 'SUB_PROCESSOR'; Setting = 'CPMINCORES'; Value = 100 },
        @{ SubGroup = 'SUB_PROCESSOR'; Setting = 'CPMAXCORES'; Value = 100 },
        @{ SubGroup = 'SUB_PCIEXPRESS'; Setting = 'ASPM'; Value = 0 },
        @{ SubGroup = 'SUB_USB'; Setting = 'USBSELECTSUSPEND'; Value = 0 },
        @{ SubGroup = 'SUB_DISK'; Setting = 'DISKIDLE'; Value = 0 }
    )

    foreach ($setting in $settings) {
        $out = @(powercfg /setacvalueindex $target $setting.SubGroup $setting.Setting $setting.Value 2>&1)
        if ($LASTEXITCODE -ne 0) {
            $warnings += "Skipped $($setting.SubGroup)/$($setting.Setting): $($out -join ' ')"
        }
    }

    $refresh = @(powercfg /setactive $target 2>&1)
    if ($LASTEXITCODE -ne 0) {
        $warnings += "Unable to refresh active power scheme: $($refresh -join ' ')"
    }

    return [pscustomobject]@{
        previousPowerScheme = $previous
        appliedPowerScheme = $target
        warnings = $warnings
    }
}

function Find-GameProcess {
    # v1.3.2: Lower thresholds and add MainWindowTitle-based Layer 1 detection
    # to fix game detection on machines where CPU sampling fails.
    $sampleMs = 2000
    $minimumCpuPercent = 0.3
    $minimumWorkingSetMb = 50
    $logicalProcessors = [Math]::Max([Environment]::ProcessorCount, 1)
    $excludedNames = @(
        'Idle', 'System', 'Registry', 'smss', 'csrss', 'wininit', 'services', 'lsass',
        'svchost', 'fontdrvhost', 'dwm', 'explorer', 'SearchHost', 'StartMenuExperienceHost',
        'ShellExperienceHost', 'RuntimeBroker', 'SecurityHealthSystray', 'MsMpEng',
        'audiodg', 'conhost', 'powershell', 'pwsh', 'cmd', 'WindowsTerminal',
        'node', 'electron', 'VieXF', 'Code', 'devenv', 'Discord', 'steamwebhelper',
        # v1.3.2: Exclude browsers to avoid false positives
        'chrome', 'msedge', 'firefox', 'opera', 'brave', 'vivaldi', 'iexplore',
        'msedgewebview2', 'GoogleUpdate', 'BraveUpdate', 'OperaUpdate',
        # Exclude common launchers
        'steam', 'EpicGamesLauncher', 'GalaxyClient', 'Origin', 'Uplay',
        'Spotify', 'slack', 'Telegram', 'Notion', 'Obsidian'
    )

    # ===== LAYER 1: MainWindowTitle-based detection =====
    # Catch games at idle/menu that do not spike CPU.
    # Look for any process with a visible window + high memory that is not excluded.
    $windowCandidates = @()
    foreach ($proc in Get-Process -ErrorAction SilentlyContinue) {
        if ($excludedNames -contains $proc.ProcessName) { continue }
        try {
            $title = [string]$proc.MainWindowTitle
            if ([string]::IsNullOrWhiteSpace($title)) { continue }
            $wsMb = [Math]::Round($proc.WorkingSet64 / 1MB, 1)
            if ($wsMb -lt $minimumWorkingSetMb) { continue }

            $windowCandidates += [pscustomobject]@{
                Id = [int]$proc.Id
                Name = [string]$proc.ProcessName
                CpuPercent = 0.0
                WorkingSetMb = $wsMb
                MainWindowTitle = $title
            }
        } catch { }
    }

    # If we found exactly one large windowed process, it is very likely the game.
    # If multiple, proceed to Layer 2 (CPU sampling) to pick the heaviest.
    if ($windowCandidates.Count -eq 1) {
        return $windowCandidates[0]
    }

    # ===== LAYER 2: CPU sampling (original method with lower thresholds) =====
    $first = @{}
    Get-Process -ErrorAction SilentlyContinue | ForEach-Object {
        if ($excludedNames -notcontains $_.ProcessName) {
            try {
                $first[[int]$_.Id] = [double]$_.TotalProcessorTime.TotalMilliseconds
            }
            catch {
            }
        }
    }

    Start-Sleep -Milliseconds $sampleMs

    $candidates = @()
    foreach ($proc in Get-Process -ErrorAction SilentlyContinue) {
        if (-not $first.ContainsKey([int]$proc.Id)) {
            continue
        }
        if ($excludedNames -contains $proc.ProcessName) {
            continue
        }

        try {
            $deltaMs = [double]$proc.TotalProcessorTime.TotalMilliseconds - [double]$first[[int]$proc.Id]
            if ($deltaMs -lt 0) {
                continue
            }

            $cpuPercent = (($deltaMs / $sampleMs) * 100.0) / $logicalProcessors
            $workingSetMb = [Math]::Round($proc.WorkingSet64 / 1MB, 1)
            if ($cpuPercent -lt $minimumCpuPercent -and $workingSetMb -lt $minimumWorkingSetMb) {
                continue
            }

            $candidates += [pscustomobject]@{
                Id = [int]$proc.Id
                Name = [string]$proc.ProcessName
                CpuPercent = [Math]::Round($cpuPercent, 2)
                WorkingSetMb = $workingSetMb
                MainWindowTitle = [string]$proc.MainWindowTitle
            }
        }
        catch {
        }
    }

    # Prefer candidates that also appeared in Layer 1 (have a window title)
    $withWindow = $candidates | Where-Object { $_.MainWindowTitle -and $_.MainWindowTitle.Length -gt 0 }
    if ($withWindow) {
        return $withWindow | Sort-Object WorkingSetMb, CpuPercent -Descending | Select-Object -First 1
    }

    return $candidates | Sort-Object CpuPercent, WorkingSetMb -Descending | Select-Object -First 1
}

try {
    $power = $null
    $game = Find-GameProcess
    if (-not $game) {
        Emit-Json @{
            success = $false
            reason = 'no_game'
            error = 'Chua thay game nao dang chay. Vao game truoc roi bat Game Mode.'
        }
    }

    $targetProcess = Get-Process -Id $game.Id -ErrorAction Stop
    $oldPriority = 'Normal'
    try {
        $oldPriority = [string]$targetProcess.PriorityClass
    }
    catch {
    }

    $power = Set-MaxPowerPlan
    $targetProcess.PriorityClass = 'High'

    Emit-Json @{
        success = $true
        active = $true
        processId = [int]$game.Id
        processName = [string]$game.Name
        cpuPercent = [double]$game.CpuPercent
        workingSetMb = [double]$game.WorkingSetMb
        oldPriority = $oldPriority
        newPriority = 'High'
        previousPowerScheme = $power.previousPowerScheme
        appliedPowerScheme = $power.appliedPowerScheme
        warnings = $power.warnings
    }
}
catch {
    if ($power -and $power.previousPowerScheme -and ([string]$power.previousPowerScheme -match '^[A-Fa-f0-9-]{36}$')) {
        powercfg /setactive ([string]$power.previousPowerScheme) | Out-Null
    }

    Emit-Json @{
        success = $false
        error = $_.Exception.Message
    }
}
`

function getDisableGameModeScript(state) {
  const encodedState = encodeStateForPowerShell(state)
  return `
$ErrorActionPreference = 'Stop'

function Emit-Json {
    param([Parameter(Mandatory)]$Payload)
    $Payload | ConvertTo-Json -Compress -Depth 8
    exit 0
}

try {
    $stateJson = [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${encodedState}'))
    $state = $stateJson | ConvertFrom-Json
    $warnings = @()

    if ($state.processId) {
        $proc = Get-Process -Id ([int]$state.processId) -ErrorAction SilentlyContinue
        if ($proc -and $state.oldPriority) {
            try {
                $proc.PriorityClass = [string]$state.oldPriority
            }
            catch {
                $warnings += "Unable to restore process priority: $($_.Exception.Message)"
            }
        }
    }

    if ($state.previousPowerScheme -and ([string]$state.previousPowerScheme -match '^[A-Fa-f0-9-]{36}$')) {
        $restore = @(powercfg /setactive ([string]$state.previousPowerScheme) 2>&1)
        if ($LASTEXITCODE -ne 0) {
            $warnings += "Unable to restore previous power scheme: $($restore -join ' ')"
        }
    }

    Emit-Json @{
        success = $true
        active = $false
        warnings = $warnings
    }
}
catch {
    Emit-Json @{
        success = $false
        error = $_.Exception.Message
    }
}
`
}

function getProcessAliveScript(processId) {
  return `
$ErrorActionPreference = 'Stop'
function Emit-Json {
    param([Parameter(Mandatory)]$Payload)
    $Payload | ConvertTo-Json -Compress -Depth 4
    exit 0
}
try {
    $proc = Get-Process -Id ${Number(processId) || 0} -ErrorAction SilentlyContinue
    Emit-Json @{
        success = $true
        alive = [bool]$proc
        processName = if ($proc) { [string]$proc.ProcessName } else { $null }
    }
}
catch {
    Emit-Json @{
        success = $false
        alive = $false
        error = $_.Exception.Message
    }
}
`
}

async function enableGameMode() {
  const current = readState()
  if (current.active) {
    return { success: true, ...current }
  }

  const result = await executePowerShell(null, {
    script: enableGameModeScript,
    name: "game-mode-enable",
  })
  const parsed = parsePowerShellJson(result, "Unable to enable Game Mode.")

  if (!parsed.success) {
    return {
      success: false,
      active: false,
      error: parsed.error || "Unable to enable Game Mode.",
      reason: parsed.reason,
    }
  }

  const nextState = {
    active: true,
    processId: parsed.processId,
    processName: parsed.processName,
    oldPriority: parsed.oldPriority,
    previousPowerScheme: parsed.previousPowerScheme,
    appliedPowerScheme: parsed.appliedPowerScheme,
    enabledAt: Date.now(),
  }

  writeState(nextState)
  log.info("[game-mode] enabled", nextState)
  return {
    success: true,
    ...nextState,
    cpuPercent: parsed.cpuPercent,
    workingSetMb: parsed.workingSetMb,
    warnings: parsed.warnings || [],
  }
}

async function disableGameMode() {
  const current = readState()
  if (!current.active) {
    clearState()
    return { success: true, active: false }
  }

  const result = await executePowerShell(null, {
    script: getDisableGameModeScript(current),
    name: "game-mode-disable",
  })
  const parsed = parsePowerShellJson(result, "Unable to disable Game Mode.")

  if (!parsed.success) {
    return {
      success: false,
      active: true,
      error: parsed.error || "Unable to disable Game Mode.",
    }
  }

  clearState()
  log.info("[game-mode] disabled")
  return {
    success: true,
    active: false,
    warnings: parsed.warnings || [],
  }
}

async function getGameModeStatus() {
  const current = readState()
  if (!current.active || !current.processId) {
    return { success: true, active: false }
  }

  const result = await executePowerShell(null, {
    script: getProcessAliveScript(current.processId),
    name: "game-mode-status",
  })
  const parsed = parsePowerShellJson(result, "Unable to check Game Mode status.")

  if (parsed.success && parsed.alive) {
    return { success: true, ...current, processName: parsed.processName || current.processName }
  }

  await disableGameMode()
  return { success: true, active: false }
}

export function setupGameModeHandlers() {
  ipcMain.removeHandler("game-mode:status")
  ipcMain.removeHandler("game-mode:enable")
  ipcMain.removeHandler("game-mode:disable")

  ipcMain.handle("game-mode:status", async () => getGameModeStatus())
  ipcMain.handle("game-mode:enable", async () => enableGameMode())
  ipcMain.handle("game-mode:disable", async () => disableGameMode())
}

export default {
  setupGameModeHandlers,
}
