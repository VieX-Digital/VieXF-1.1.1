[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$script:Config = [ordered]@{
    TweakName = 'VieXF Ultra Debloat'
    StateVersion = 2
    SecurityBlockedTerms = @(
        'Defender',
        'SecurityHealth',
        'Firewall',
        'MpsSvc',
        'BFE',
        'SmartScreen',
        'WindowsUpdate',
        'wuauserv',
        'WaaSMedicSvc',
        'UsoSvc',
        'EnableLUA',
        'UAC',
        'BitLocker',
        'BDESVC',
        'CredentialGuard',
        'LsaCfgFlags',
        'DeviceGuard',
        'CoreIsolation',
        'ELAM',
        'WdFilter',
        'WinDefend',
        'WdNisSvc'
    )
    ProtectedServices = @(
        'WlanSvc',
        'bthserv',
        'BthServ',
        'BTAGService',
        'BthAvctpSvc',
        'DeviceAssociationService',
        'DeviceAssociationBrokerSvc_*',
        'DevicesFlowUserSvc_*',
        'DevicePickerUserSvc_*',
        'DsmSvc',
        'ShellHWDetection',
        'ProfSvc',
        'UserManager',
        'KeyIso',
        'VaultSvc',
        'NgcSvc',
        'NgcCtnrSvc',
        'LanmanWorkstation',
        'Dhcp',
        'Dnscache',
        'NlaSvc',
        'netprofm',
        'gpsvc',
        'EventLog',
        'MpsSvc',
        'BFE',
        'CryptSvc',
        'BrokerInfrastructure',
        'CoreMessagingRegistrar'
    )
    ProtectedAppx = @(
        'Microsoft.WindowsStore',
        'Microsoft.DesktopAppInstaller',
        'Microsoft.StorePurchaseApp',
        'Microsoft.SecHealthUI',
        'Microsoft.Windows.ShellExperienceHost',
        'Microsoft.LockApp',
        'Microsoft.AAD.BrokerPlugin',
        'Microsoft.AccountsControl',
        'Microsoft.UI.Xaml',
        'Microsoft.VCLibs',
        'Microsoft.NET.Native',
        'Microsoft.Windows.StartMenuExperienceHost',
        'MicrosoftWindows.Client.WebExperience'
    )
    AppxRemovalList = @(
        'Clipchamp.Clipchamp',
        'Microsoft.549981C3F5F10',
        'Microsoft.Copilot',
        'Microsoft.Getstarted',
        'Microsoft.MicrosoftOfficeHub',
        'Microsoft.Office.OneNote',
        'Microsoft.Office.Sway',
        'MicrosoftTeams',
        'MSTeams',
        'Microsoft.SkypeApp',
        'Microsoft.Todos',
        'Microsoft.News',
        'Microsoft.BingWeather',
        'Microsoft.WindowsFeedbackHub',
        'Microsoft.WindowsMaps',
        'Microsoft.WindowsSoundRecorder',
        'Microsoft.MicrosoftSolitaireCollection',
        'Microsoft.XboxApp',
        'Microsoft.XboxGamingOverlay',
        'Microsoft.XboxIdentityProvider',
        'Microsoft.XboxSpeechToTextOverlay',
        'Microsoft.OneDrive',
        'Microsoft.WindowsCamera',
        'Microsoft.WindowsAlarms',
        'Microsoft.ZuneMusic',
        'Microsoft.ZuneVideo',
        'microsoft.windowscommunicationsapps',
        'Amazon.com.Amazon',
        'AmazonVideo.PrimeVideo',
        'Disney',
        'Duolingo-LearnLanguagesforFree',
        'Facebook',
        'Instagram',
        'Netflix',
        'PandoraMediaInc.Pandora',
        'Spotify',
        'TikTok',
        'Twitter',
        'TwitterUniversal',
        'YouTube',
        'Plex',
        'king.com.CandyCrushSaga',
        'king.com.CandyCrushSodaSaga',
        'king.com.BubbleWitch3Saga',
        'Microsoft.BingSearch',
        'Microsoft.BingNews',
        'Microsoft.StartExperiencesApp',
        'MicrosoftWindows.CrossDevice'
    )
    TaskTargets = @(
        @{ TaskPath = '\Microsoft\Windows\Application Experience\'; TaskName = 'Microsoft Compatibility Appraiser' },
        @{ TaskPath = '\Microsoft\Windows\Application Experience\'; TaskName = 'ProgramDataUpdater' },
        @{ TaskPath = '\Microsoft\Windows\Autochk\'; TaskName = 'Proxy' },
        @{ TaskPath = '\Microsoft\Windows\Customer Experience Improvement Program\'; TaskName = 'Consolidator' },
        @{ TaskPath = '\Microsoft\Windows\Customer Experience Improvement Program\'; TaskName = 'KernelCeipTask' },
        @{ TaskPath = '\Microsoft\Windows\Customer Experience Improvement Program\'; TaskName = 'UsbCeip' },
        @{ TaskPath = '\Microsoft\Windows\Feedback\Siuf\'; TaskName = 'DmClient' },
        @{ TaskPath = '\Microsoft\Windows\Feedback\Siuf\'; TaskName = 'DmClientOnScenarioDownload' },
        @{ TaskPath = '\Microsoft\Windows\Maps\'; TaskName = 'MapsToastTask' },
        @{ TaskPath = '\Microsoft\Windows\Maps\'; TaskName = 'MapsUpdateTask' },
        @{ TaskPath = '\Microsoft\Windows\Power Efficiency Diagnostics\'; TaskName = 'AnalyzeSystem' },
        @{ TaskPath = '\Microsoft\Windows\PushToInstall\'; TaskName = 'LoginCheck' },
        @{ TaskPath = '\Microsoft\Windows\PushToInstall\'; TaskName = 'Registration' },
        @{ TaskPath = '\Microsoft\Windows\Shell\'; TaskName = 'FamilySafetyMonitor' },
        @{ TaskPath = '\Microsoft\Windows\Shell\'; TaskName = 'FamilySafetyRefreshTask' }
    )
    ServiceTargets = @(
        @{ Name = 'AarSvc*'; StartupType = 'Disabled' },
        @{ Name = 'AJRouter'; StartupType = 'Disabled' },
        @{ Name = 'ALG'; StartupType = 'Disabled' },
        @{ Name = 'AssignedAccessManagerSvc'; StartupType = 'Disabled' },
        @{ Name = 'autotimesvc'; StartupType = 'Disabled' },
        @{ Name = 'AxInstSV'; StartupType = 'Disabled' },
        @{ Name = 'BcastDVRUserService*'; StartupType = 'Disabled' },
        @{ Name = 'CaptureService*'; StartupType = 'Disabled' },
        @{ Name = 'cbdhsvc*'; StartupType = 'Disabled' },
        @{ Name = 'CDPUserSvc*'; StartupType = 'Disabled' },
        @{ Name = 'CDPSvc'; StartupType = 'Disabled' },
        @{ Name = 'CloudBackupRestoreSvc'; StartupType = 'Disabled' },
        @{ Name = 'cloudidsvc'; StartupType = 'Manual' },
        @{ Name = 'dcsvc'; StartupType = 'Disabled' },
        @{ Name = 'diagnosticshub.standardcollector.service'; StartupType = 'Disabled' },
        @{ Name = 'DiagTrack'; StartupType = 'Disabled' },
        @{ Name = 'diagsvc'; StartupType = 'Disabled' },
        @{ Name = 'DisplayEnhancementService'; StartupType = 'Disabled' },
        @{ Name = 'DmEnrollmentSvc'; StartupType = 'Disabled' },
        @{ Name = 'MapsBroker'; StartupType = 'Disabled' },
        @{ Name = 'dot3svc'; StartupType = 'Disabled' },
        @{ Name = 'fdPHost'; StartupType = 'Disabled' },
        @{ Name = 'FDResPub'; StartupType = 'Disabled' },
        @{ Name = 'fhsvc'; StartupType = 'Disabled' },
        @{ Name = 'FrameServer'; StartupType = 'Disabled' },
        @{ Name = 'FrameServerMonitor'; StartupType = 'Disabled' },
        @{ Name = 'GraphicsPerfSvc'; StartupType = 'Disabled' },
        @{ Name = 'HvHost'; StartupType = 'Disabled' },
        @{ Name = 'InventorySvc'; StartupType = 'Disabled' },
        @{ Name = 'IpxlatCfgSvc'; StartupType = 'Disabled' },
        @{ Name = 'lfsvc'; StartupType = 'Disabled' },
        @{ Name = 'LxpSvc'; StartupType = 'Disabled' },
        @{ Name = 'NetTcpPortSharing'; StartupType = 'Disabled' },
        @{ Name = 'OneSyncSvc*'; StartupType = 'Disabled' },
        @{ Name = 'PcaSvc'; StartupType = 'Disabled' },
        @{ Name = 'PeerDistSvc'; StartupType = 'Disabled' },
        @{ Name = 'PhoneSvc'; StartupType = 'Disabled' },
        @{ Name = 'PimIndexMaintenanceSvc*'; StartupType = 'Disabled' },
        @{ Name = 'PNRPAutoReg'; StartupType = 'Disabled' },
        @{ Name = 'PNRPsvc'; StartupType = 'Disabled' },
        @{ Name = 'QWAVE'; StartupType = 'Disabled' },
        @{ Name = 'RemoteRegistry'; StartupType = 'Disabled' },
        @{ Name = 'RetailDemo'; StartupType = 'Disabled' },
        @{ Name = 'RpcLocator'; StartupType = 'Disabled' },
        @{ Name = 'SCardSvr'; StartupType = 'Disabled' },
        @{ Name = 'ScDeviceEnum'; StartupType = 'Disabled' },
        @{ Name = 'SDRSVC'; StartupType = 'Disabled' },
        @{ Name = 'SensorDataService'; StartupType = 'Disabled' },
        @{ Name = 'SensorService'; StartupType = 'Disabled' },
        @{ Name = 'SensrSvc'; StartupType = 'Disabled' },
        @{ Name = 'SEMgrSvc'; StartupType = 'Disabled' },
        @{ Name = 'SharedRealitySvc'; StartupType = 'Disabled' },
        @{ Name = 'SmsRouter'; StartupType = 'Disabled' },
        @{ Name = 'SNMPTrap'; StartupType = 'Disabled' },
        @{ Name = 'SSDPSRV'; StartupType = 'Disabled' },
        @{ Name = 'stisvc'; StartupType = 'Disabled' },
        @{ Name = 'SysMain'; StartupType = 'Disabled' },
        @{ Name = 'TapiSrv'; StartupType = 'Disabled' },
        @{ Name = 'TieringEngineService'; StartupType = 'Disabled' },
        @{ Name = 'TroubleshootingSvc'; StartupType = 'Disabled' },
        @{ Name = 'tzautoupdate'; StartupType = 'Disabled' },
        @{ Name = 'UevAgentService'; StartupType = 'Disabled' },
        @{ Name = 'WalletService'; StartupType = 'Disabled' },
        @{ Name = 'wbengine'; StartupType = 'Disabled' },
        @{ Name = 'Wecsvc'; StartupType = 'Disabled' },
        @{ Name = 'wercplsupport'; StartupType = 'Disabled' },
        @{ Name = 'WerSvc'; StartupType = 'Disabled' },
        @{ Name = 'WFDSConMgrSvc'; StartupType = 'Disabled' },
        @{ Name = 'WiaRpc'; StartupType = 'Disabled' },
        @{ Name = 'Fax'; StartupType = 'Disabled' },
        @{ Name = 'WMPNetworkSvc'; StartupType = 'Disabled' },
        @{ Name = 'workfolderssvc'; StartupType = 'Disabled' },
        @{ Name = 'WpcMonSvc'; StartupType = 'Disabled' },
        @{ Name = 'XblAuthManager'; StartupType = 'Disabled' },
        @{ Name = 'XblGameSave'; StartupType = 'Disabled' },
        @{ Name = 'XboxNetApiSvc'; StartupType = 'Disabled' },
        @{ Name = 'dmwappushservice'; StartupType = 'Manual' }
    )
    StartupNamePatterns = @(
        'OneDrive',
        'Teams',
        'MSTeams',
        'Skype',
        'Xbox',
        'Copilot',
        'MicrosoftEdgeAutoLaunch',
        'MicrosoftEdgeUpdate',
        'GoogleUpdate',
        'BraveUpdate',
        'MozillaMaintenance'
    )
    PowerSettings = @(
        @{ SubGroup = 'SUB_PROCESSOR'; Setting = 'PROCTHROTTLEMIN'; Value = 100 },
        @{ SubGroup = 'SUB_PROCESSOR'; Setting = 'PROCTHROTTLEMAX'; Value = 100 },
        @{ SubGroup = 'SUB_PCIEXPRESS'; Setting = 'ASPM'; Value = 0 },
        @{ SubGroup = 'SUB_USB'; Setting = 'USBSELECTSUSPEND'; Value = 1 },
        @{ SubGroup = 'SUB_SLEEP'; Setting = 'STANDBYIDLE'; Value = 0 },
        @{ SubGroup = 'SUB_SLEEP'; Setting = 'HIBERNATEIDLE'; Value = 0 }
    )
    UltimateSchemeGuid = 'e9a42b02-d5df-448d-aa00-03f14749eb61'
    HighPerformanceGuid = '8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c'
}

$script:Context = $null
$script:State = $null
$script:Summary = [ordered]@{
    ServicesChanged = 0
    TasksChanged = 0
    StartupEntriesChanged = 0
    AppsRemoved = 0
    ProvisionedAppsRemoved = 0
}

function Test-IsAdmin {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($identity)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Write-Log {
    param(
        [Parameter(Mandatory)]
        [string]$Message,
        [ValidateSet('INFO', 'WARN', 'ERROR', 'OK')]
        [string]$Level = 'INFO'
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

function New-DefaultState {
    return [ordered]@{
        version = $script:Config.StateVersion
        active = $true
        createdAt = (Get-Date).ToString('o')
        lastRunAt = (Get-Date).ToString('o')
        machine = $env:COMPUTERNAME
        restorePoint = [ordered]@{
            attempted = $false
            created = $false
            message = ''
        }
        warnings = @()
        exports = @()
        metrics = [ordered]@{
            before = [ordered]@{}
            after = [ordered]@{}
        }
        services = @()
        tasks = @()
        startup = [ordered]@{
            runValues = @()
            startupApproved = @()
            startupFolder = @()
            scheduledTasks = @()
        }
        registry = [ordered]@{
            values = @()
        }
        appx = [ordered]@{
            removed = @()
            provisionedRemoved = @()
        }
        power = [ordered]@{
            previousActiveScheme = $null
            appliedScheme = $null
            createdSchemes = @()
            settings = @()
            hibernateEnabled = $null
        }
        bcd = [ordered]@{
            changed = $false
            beforePath = $null
            afterPath = $null
            rollbackCommand = 'bcdedit /deletevalue {current} disabledynamictick'
            useplatformtickChanged = $false
            bootMenuPolicyChanged = $false
        }
        gpuScaling = [ordered]@{
            vendor = 'Unknown'
            changed = $false
            mode = 'Manual'
            message = ''
            registry = @()
        }
        summary = [ordered]@{}
    }
}

function Initialize-Context {
    $scriptRoot = $PSScriptRoot
    
    $userDataPath = Join-Path $env:APPDATA 'vie-xf'
    $tweakDataPath = Join-Path $userDataPath 'tweak-data\ultra-debloat'
    
    $logRoot = Join-Path $tweakDataPath 'logs'
    $backupRoot = Join-Path $tweakDataPath 'backups'
    $registryRoot = Join-Path $backupRoot 'registry'
    $startupBackupRoot = Join-Path $backupRoot 'startup-folder'
    Ensure-Directory -Path $logRoot
    Ensure-Directory -Path $backupRoot
    Ensure-Directory -Path $registryRoot
    Ensure-Directory -Path $startupBackupRoot

    $timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
    $script:Context = [ordered]@{
        ScriptRoot = $scriptRoot
        LogRoot = $logRoot
        BackupRoot = $backupRoot
        RegistryRoot = $registryRoot
        StartupBackupRoot = $startupBackupRoot
        StatePath = Join-Path $backupRoot 'ultra-debloat-state.json'
        TranscriptPath = Join-Path $logRoot ("apply-{0}.log" -f $timestamp)
        BcdBeforePath = Join-Path $backupRoot 'bcd-before.txt'
        BcdAfterPath = Join-Path $backupRoot 'bcd-after.txt'
    }

    $oldBackupRoot = Join-Path $scriptRoot 'backups'
    $oldStatePath = Join-Path $oldBackupRoot 'ultra-debloat-state.json'
    if ((Test-Path -LiteralPath $oldStatePath) -and (-not (Test-Path -LiteralPath $script:Context.StatePath))) {
        try { Copy-Item -LiteralPath $oldStatePath -Destination $script:Context.StatePath -Force } catch { }
    }
}

function Load-OrCreateState {
    if ((Test-Path -LiteralPath $script:Context.StatePath) -and ((Get-Item -LiteralPath $script:Context.StatePath).Length -gt 0)) {
        try {
            $loaded = Get-Content -LiteralPath $script:Context.StatePath -Raw | ConvertFrom-Json
            if ($loaded.active -eq $true) {
                $script:State = $loaded
                $script:State.lastRunAt = (Get-Date).ToString('o')
                return
            }
        }
        catch {
            Write-Log "Existing state file is unreadable. A new state file will be created." 'WARN'
        }
    }

    $script:State = New-DefaultState
}

function Save-State {
    $json = $script:State | ConvertTo-Json -Depth 12
    Set-Content -LiteralPath $script:Context.StatePath -Value $json -Encoding UTF8
}

function Add-StateWarning {
    param([Parameter(Mandatory)][string]$Message)
    if (-not ($script:State.warnings -contains $Message)) {
        $script:State.warnings += $Message
        Save-State
    }
}

function Convert-RegistryPathToNative {
    param([Parameter(Mandatory)][string]$Path)
    if ($Path.StartsWith('HKLM:\')) { return $Path -replace '^HKLM:\\', 'HKLM\' }
    if ($Path.StartsWith('HKCU:\')) { return $Path -replace '^HKCU:\\', 'HKCU\' }
    if ($Path.StartsWith('HKCR:\')) { return $Path -replace '^HKCR:\\', 'HKCR\' }
    if ($Path.StartsWith('HKU:\')) { return $Path -replace '^HKU:\\', 'HKU\' }
    throw "Unsupported registry path: $Path"
}

function Get-SafeFileName {
    param([Parameter(Mandatory)][string]$Value)
    return ($Value -replace '[\\/:*?"<>| ]', '_')
}

function Export-RegistryBranchIfNeeded {
    param([Parameter(Mandatory)][string]$Path)
    $native = Convert-RegistryPathToNative -Path $Path
    foreach ($entry in $script:State.exports) {
        if ($entry.registryPath -eq $native) {
            return
        }
    }

    $destination = Join-Path $script:Context.RegistryRoot ((Get-SafeFileName -Value $native) + '.reg')
    $exported = $false
    if (Test-Path -LiteralPath $Path) {
        & reg.exe export $native $destination /y | Out-Null
        if ($LASTEXITCODE -eq 0) {
            $exported = $true
            Write-Log "Exported registry branch: $native" 'OK'
        }
        else {
            Write-Log "Registry export failed: $native" 'WARN'
        }
    }
    else {
        Write-Log "Registry branch did not exist before change: $native" 'INFO'
    }

    $script:State.exports += [pscustomobject]@{
        registryPath = $native
        exportPath = $destination
        exported = $exported
    }
    Save-State
}

function Get-RegistryValueSnapshot {
    param(
        [Parameter(Mandatory)][string]$Path,
        [Parameter(Mandatory)][string]$Name
    )

    if (-not (Test-Path -LiteralPath $Path)) {
        return [ordered]@{
            existed = $false
            kind = $null
            value = $null
            valueBase64 = $null
        }
    }

    $item = Get-Item -LiteralPath $Path
    try {
        $value = Get-ItemPropertyValue -LiteralPath $Path -Name $Name -ErrorAction Stop
        $kind = $item.GetValueKind($Name).ToString()
        $base64 = $null
        if ($value -is [byte[]]) {
            $base64 = [Convert]::ToBase64String($value)
            $value = $null
        }

        return [ordered]@{
            existed = $true
            kind = $kind
            value = $value
            valueBase64 = $base64
        }
    }
    catch {
        return [ordered]@{
            existed = $false
            kind = $null
            value = $null
            valueBase64 = $null
        }
    }
}

function Get-RegistryStateRecord {
    param(
        [Parameter(Mandatory)][string]$Path,
        [Parameter(Mandatory)][string]$Name
    )

    foreach ($record in $script:State.registry.values) {
        if ($record.path -eq $Path -and $record.name -eq $Name) {
            return $record
        }
    }

    return $null
}

function Assert-SafeRegistryPath {
    param([Parameter(Mandatory)][string]$Path)
    foreach ($term in $script:Config.SecurityBlockedTerms) {
        if ($Path -like "*$term*") {
            throw "Blocked registry mutation due to protected security term [$term]: $Path"
        }
    }
}

function Ensure-RegistryValueBackedUp {
    param(
        [Parameter(Mandatory)][string]$Path,
        [Parameter(Mandatory)][string]$Name
    )

    $existing = Get-RegistryStateRecord -Path $Path -Name $Name
    if ($null -ne $existing) {
        return $existing
    }

    Assert-SafeRegistryPath -Path $Path
    Export-RegistryBranchIfNeeded -Path $Path
    $snapshot = Get-RegistryValueSnapshot -Path $Path -Name $Name
    $record = [pscustomobject]@{
        path = $Path
        name = $Name
        existed = $snapshot.existed
        kind = $snapshot.kind
        value = $snapshot.value
        valueBase64 = $snapshot.valueBase64
    }
    $script:State.registry.values += $record
    Save-State
    return $record
}

function Ensure-RegistryPath {
    param([Parameter(Mandatory)][string]$Path)
    if (-not (Test-Path -LiteralPath $Path)) {
        New-Item -Path $Path -Force | Out-Null
    }
}

function Test-ValuesEqual {
    param(
        [Parameter(Mandatory)]$Current,
        [Parameter(Mandatory)]$Desired
    )

    if ($Current -is [byte[]] -and $Desired -is [byte[]]) {
        if ($Current.Length -ne $Desired.Length) { return $false }
        for ($i = 0; $i -lt $Current.Length; $i++) {
            if ($Current[$i] -ne $Desired[$i]) { return $false }
        }
        return $true
    }

    return "$Current" -eq "$Desired"
}

function Set-RegistryValueTracked {
    param(
        [Parameter(Mandatory)][string]$Path,
        [Parameter(Mandatory)][string]$Name,
        [Parameter(Mandatory)]$Value,
        [Parameter(Mandatory)][ValidateSet('String', 'ExpandString', 'Binary', 'DWord', 'QWord', 'MultiString')][string]$Type
    )

    $null = Ensure-RegistryValueBackedUp -Path $Path -Name $Name
    Ensure-RegistryPath -Path $Path
    $snapshot = Get-RegistryValueSnapshot -Path $Path -Name $Name
    $currentValue = if ($snapshot.valueBase64) { [Convert]::FromBase64String($snapshot.valueBase64) } else { $snapshot.value }
    if ($snapshot.existed -and (Test-ValuesEqual -Current $currentValue -Desired $Value)) {
        return $false
    }

    New-ItemProperty -Path $Path -Name $Name -PropertyType $Type -Value $Value -Force | Out-Null
    Write-Log "Registry set: $Path :: $Name" 'OK'
    return $true
}

function Test-NameMatchesPattern {
    param(
        [Parameter(Mandatory)][string]$Name,
        [Parameter(Mandatory)][string[]]$Patterns
    )
    foreach ($pattern in $Patterns) {
        if ($Name -like $pattern) {
            return $true
        }
    }
    return $false
}

function Normalize-ServiceStartMode {
    param([Parameter(Mandatory)]$Service)
    switch ($Service.StartMode) {
        'Auto' { return 'Automatic' }
        'Manual' { return 'Manual' }
        'Disabled' { return 'Disabled' }
        default { return 'Manual' }
    }
}

function Get-ServiceRecord {
    param([Parameter(Mandatory)][string]$Name)
    foreach ($record in $script:State.services) {
        if ($record.name -eq $Name) { return $record }
    }
    return $null
}

function Assert-SafeServiceChange {
    param(
        [Parameter(Mandatory)][string]$Name,
        [Parameter(Mandatory)][string]$TargetStartupType
    )

    if (Test-NameMatchesPattern -Name $Name -Patterns $script:Config.ProtectedServices) {
        throw "Refusing to change protected service [$Name]."
    }

    foreach ($term in $script:Config.SecurityBlockedTerms) {
        if ($Name -like "*$term*") {
            throw "Refusing to change security-sensitive service [$Name]."
        }
    }

    if ($TargetStartupType -notin @('Disabled', 'Manual', 'Automatic')) {
        throw "Unsupported startup type: $TargetStartupType"
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

    if ($StartupType -ne 'Automatic') {
        try {
            $serviceReg = "HKLM:\SYSTEM\CurrentControlSet\Services\$Name"
            if (Test-Path -LiteralPath $serviceReg) {
                New-ItemProperty -Path $serviceReg -Name 'DelayedAutostart' -PropertyType DWord -Value 0 -Force | Out-Null
            }
        }
        catch {
            Write-Log "Unable to clear DelayedAutostart for ${Name}: $($_.Exception.Message)" 'WARN'
        }
    }
}

function Set-ServiceTracked {
    param(
        [Parameter(Mandatory)][string]$Name,
        [Parameter(Mandatory)][ValidateSet('Automatic', 'Manual', 'Disabled')][string]$TargetStartupType
    )

    Assert-SafeServiceChange -Name $Name -TargetStartupType $TargetStartupType
    $service = Get-CimInstance -ClassName Win32_Service -Filter ("Name='{0}'" -f $Name) -ErrorAction SilentlyContinue
    if ($null -eq $service) {
        Write-Log "Service not found, skipping: $Name" 'WARN'
        return
    }

    $currentType = Normalize-ServiceStartMode -Service $service
    if ($currentType -eq $TargetStartupType) {
        return
    }

    $record = Get-ServiceRecord -Name $Name
    if ($null -eq $record) {
        $script:State.services += [pscustomobject]@{
            name = $Name
            originalStartupType = $currentType
            originalDelayedAutoStart = [bool]$service.DelayedAutoStart
        }
        Save-State
    }

    Set-ServiceStartupMode -Name $Name -StartupType $TargetStartupType
    if ($TargetStartupType -in @('Disabled', 'Manual')) {
        try {
            $svc = Get-Service -Name $Name -ErrorAction Stop
            if ($svc.Status -eq 'Running') {
                Stop-Service -Name $Name -Force -ErrorAction Stop
            }
        }
        catch {
            Write-Log "Unable to stop service $Name immediately: $($_.Exception.Message)" 'WARN'
        }
    }

    $script:Summary.ServicesChanged++
    Write-Log "Service updated: $Name -> $TargetStartupType" 'OK'
}

function Resolve-ServiceNames {
    param([Parameter(Mandatory)][string]$Pattern)

    $services = Get-CimInstance -ClassName Win32_Service -ErrorAction SilentlyContinue
    if ($null -eq $services) {
        return @()
    }

    $resolved = @()
    if ($Pattern -match '[\*\?]') {
        $resolved = @($services | Where-Object { $_.Name -like $Pattern } | Select-Object -ExpandProperty Name)
    }
    else {
        $resolved = @($services | Where-Object { $_.Name -eq $Pattern } | Select-Object -ExpandProperty Name)
        if ($resolved.Count -eq 0) {
            $resolved = @($services | Where-Object { $_.Name -like ("{0}_*" -f $Pattern) } | Select-Object -ExpandProperty Name)
        }
    }

    return @($resolved | Sort-Object -Unique)
}

function Get-TaskRecord {
    param(
        [Parameter(Mandatory)][string]$Bucket,
        [Parameter(Mandatory)][string]$TaskPath,
        [Parameter(Mandatory)][string]$TaskName
    )

    $collection = if ($Bucket -eq 'tasks') { $script:State.tasks } else { $script:State.startup.scheduledTasks }
    foreach ($record in $collection) {
        if ($record.taskPath -eq $TaskPath -and $record.taskName -eq $TaskName) {
            return $record
        }
    }
    return $null
}

function Disable-ScheduledTaskTracked {
    param(
        [Parameter(Mandatory)][string]$TaskPath,
        [Parameter(Mandatory)][string]$TaskName,
        [Parameter(Mandatory)][string]$Bucket
    )

    $task = Get-ScheduledTask -TaskPath $TaskPath -TaskName $TaskName -ErrorAction SilentlyContinue
    if ($null -eq $task) {
        Write-Log "Scheduled task not present: $TaskPath$TaskName" 'INFO'
        return
    }

    if ($task.Settings.Enabled -eq $false) {
        return
    }

    $record = Get-TaskRecord -Bucket $Bucket -TaskPath $TaskPath -TaskName $TaskName
    if ($null -eq $record) {
        $newRecord = [pscustomobject]@{
            taskPath = $TaskPath
            taskName = $TaskName
            originallyEnabled = $true
        }
        if ($Bucket -eq 'tasks') {
            $script:State.tasks += $newRecord
        }
        else {
            $script:State.startup.scheduledTasks += $newRecord
        }
        Save-State
    }

    Disable-ScheduledTask -InputObject $task | Out-Null
    if ($Bucket -eq 'tasks') {
        $script:Summary.TasksChanged++
    }
    else {
        $script:Summary.StartupEntriesChanged++
    }
    Write-Log "Disabled scheduled task: $TaskPath$TaskName" 'OK'
}

function Get-StartupRunRecord {
    param(
        [Parameter(Mandatory)][string]$Path,
        [Parameter(Mandatory)][string]$Name
    )
    foreach ($record in $script:State.startup.runValues) {
        if ($record.path -eq $Path -and $record.name -eq $Name) {
            return $record
        }
    }
    return $null
}

function Disable-StartupRunValue {
    param(
        [Parameter(Mandatory)][string]$Path,
        [Parameter(Mandatory)][string]$Name
    )

    if (-not (Test-Path -LiteralPath $Path)) {
        return
    }

    $snapshot = Get-RegistryValueSnapshot -Path $Path -Name $Name
    if (-not $snapshot.existed) {
        return
    }

    $record = Get-StartupRunRecord -Path $Path -Name $Name
    if ($null -eq $record) {
        Export-RegistryBranchIfNeeded -Path $Path
        $script:State.startup.runValues += [pscustomobject]@{
            path = $Path
            name = $Name
            kind = $snapshot.kind
            value = $snapshot.value
        }
        Save-State
    }

    Remove-ItemProperty -LiteralPath $Path -Name $Name -Force
    $script:Summary.StartupEntriesChanged++
    Write-Log "Disabled Run startup entry: $Path :: $Name" 'OK'
}

function Get-StartupApprovedRecord {
    param(
        [Parameter(Mandatory)][string]$Path,
        [Parameter(Mandatory)][string]$Name
    )
    foreach ($record in $script:State.startup.startupApproved) {
        if ($record.path -eq $Path -and $record.name -eq $Name) {
            return $record
        }
    }
    return $null
}

function Disable-StartupApprovedValue {
    param(
        [Parameter(Mandatory)][string]$Path,
        [Parameter(Mandatory)][string]$Name
    )

    if (-not (Test-Path -LiteralPath $Path)) {
        return
    }

    $snapshot = Get-RegistryValueSnapshot -Path $Path -Name $Name
    if (-not $snapshot.existed) {
        return
    }

    $bytes = [Convert]::FromBase64String($snapshot.valueBase64)
    if ($bytes.Length -gt 0 -and $bytes[0] -eq 3) {
        return
    }

    $record = Get-StartupApprovedRecord -Path $Path -Name $Name
    if ($null -eq $record) {
        Export-RegistryBranchIfNeeded -Path $Path
        $script:State.startup.startupApproved += [pscustomobject]@{
            path = $Path
            name = $Name
            valueBase64 = $snapshot.valueBase64
        }
        Save-State
    }

    if ($bytes.Length -eq 0) {
        $bytes = [byte[]](3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0)
    }
    else {
        $bytes[0] = 3
    }

    New-ItemProperty -Path $Path -Name $Name -PropertyType Binary -Value $bytes -Force | Out-Null
    $script:Summary.StartupEntriesChanged++
    Write-Log "Disabled StartupApproved entry: $Path :: $Name" 'OK'
}

function Get-StartupFolderRecord {
    param([Parameter(Mandatory)][string]$Path)
    foreach ($record in $script:State.startup.startupFolder) {
        if ($record.originalPath -eq $Path) {
            return $record
        }
    }
    return $null
}

function Disable-StartupFolderItem {
    param([Parameter(Mandatory)][string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        return
    }

    $record = Get-StartupFolderRecord -Path $Path
    if ($null -ne $record) {
        return
    }

    $leafBase = [System.IO.Path]::GetFileNameWithoutExtension($Path)
    $extension = [System.IO.Path]::GetExtension($Path)
    $destination = Join-Path $script:Context.StartupBackupRoot ((Get-SafeFileName -Value $leafBase) + '-' + [guid]::NewGuid().Guid + $extension)
    Move-Item -LiteralPath $Path -Destination $destination -Force
    $script:State.startup.startupFolder += [pscustomobject]@{
        originalPath = $Path
        backupPath = $destination
    }
    Save-State
    $script:Summary.StartupEntriesChanged++
    Write-Log "Moved startup folder item out of autorun: $Path" 'OK'
}

function Test-StartupNameTarget {
    param([Parameter(Mandatory)][string]$Name)
    foreach ($pattern in $script:Config.StartupNamePatterns) {
        if ($Name -like "*$pattern*") {
            return $true
        }
    }
    return $false
}

function Get-PowerSettingRecord {
    param(
        [Parameter(Mandatory)][string]$SubGroup,
        [Parameter(Mandatory)][string]$Setting
    )
    foreach ($record in $script:State.power.settings) {
        if ($record.subGroup -eq $SubGroup -and $record.setting -eq $Setting) {
            return $record
        }
    }
    return $null
}

function Get-ActivePowerSchemeGuid {
    $output = powercfg /getactivescheme
    foreach ($line in $output) {
        if ($line -match '([A-Fa-f0-9-]{36})') {
            return $matches[1]
        }
    }
    throw 'Unable to determine the active power scheme.'
}

function Get-PowerSettingAcValue {
    param(
        [Parameter(Mandatory)][string]$SchemeGuid,
        [Parameter(Mandatory)][string]$SubGroup,
        [Parameter(Mandatory)][string]$Setting
    )

    $output = powercfg /q $SchemeGuid $SubGroup $Setting
    foreach ($line in $output) {
        if ($line -match 'Current AC Power Setting Index:\s+0x([0-9a-fA-F]+)') {
            return [int]("0x{0}" -f $matches[1])
        }
    }
    throw "Unable to read power setting $SubGroup/$Setting."
}

function Ensure-PowerSettingBackedUp {
    param(
        [Parameter(Mandatory)][string]$SchemeGuid,
        [Parameter(Mandatory)][string]$SubGroup,
        [Parameter(Mandatory)][string]$Setting
    )

    $existing = Get-PowerSettingRecord -SubGroup $SubGroup -Setting $Setting
    if ($null -ne $existing) {
        return $existing
    }

    $currentValue = Get-PowerSettingAcValue -SchemeGuid $SchemeGuid -SubGroup $SubGroup -Setting $Setting
    $record = [pscustomobject]@{
        subGroup = $SubGroup
        setting = $Setting
        oldAcValue = $currentValue
    }
    $script:State.power.settings += $record
    Save-State
    return $record
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
        $message = "{0} failed: {1}" -f $Name, $_.Exception.Message
        Write-Log $message 'WARN'
        Add-StateWarning -Message $message
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

function Initialize-ScriptState {
    Initialize-Context
    Start-Logging
    Load-OrCreateState
    Save-State
}

function Ensure-Admin {
    if (-not (Test-IsAdmin)) {
        throw 'Please run this script as Administrator.'
    }
}

function Create-RestorePointIfPossible {
    $script:State.restorePoint.attempted = $true
    try {
        Checkpoint-Computer -Description $script:Config.TweakName -RestorePointType 'MODIFY_SETTINGS' | Out-Null
        $script:State.restorePoint.created = $true
        $script:State.restorePoint.message = 'Restore point created successfully.'
        Write-Log $script:State.restorePoint.message 'OK'
    }
    catch {
        $script:State.restorePoint.created = $false
        $script:State.restorePoint.message = "Restore point skipped: $($_.Exception.Message)"
        Write-Log $script:State.restorePoint.message 'WARN'
    }
    Save-State
}

function Capture-BeforeMetrics {
    $script:State.metrics.before = [ordered]@{
        processCount = (Get-Process | Measure-Object).Count
    }
    Save-State
}

function Capture-AfterMetrics {
    $script:State.metrics.after = [ordered]@{
        processCount = (Get-Process | Measure-Object).Count
    }
    $script:State.summary = [ordered]@{
        servicesChanged = $script:Summary.ServicesChanged
        tasksChanged = $script:Summary.TasksChanged
        startupEntriesChanged = $script:Summary.StartupEntriesChanged
        appsRemoved = $script:Summary.AppsRemoved
        provisionedAppsRemoved = $script:Summary.ProvisionedAppsRemoved
    }
    Save-State
}

function Is-ProtectedAppxName {
    param([Parameter(Mandatory)][string]$Name)
    foreach ($pattern in $script:Config.ProtectedAppx) {
        if ($Name -like "$pattern*") {
            return $true
        }
    }
    return $false
}

function Get-AppxRecord {
    param(
        [Parameter(Mandatory)][string]$CollectionName,
        [Parameter(Mandatory)][string]$Key
    )
    $collection = if ($CollectionName -eq 'removed') { $script:State.appx.removed } else { $script:State.appx.provisionedRemoved }
    foreach ($record in $collection) {
        if ($record.key -eq $Key) {
            return $record
        }
    }
    return $null
}

function Remove-ConfiguredAppxPackages {
    foreach ($packageName in $script:Config.AppxRemovalList) {
        Invoke-TrackedStep -Name "AppX removal [$packageName]" -ScriptBlock {
            $installedPackages = Get-AppxPackage -AllUsers -Name $packageName -ErrorAction SilentlyContinue
            foreach ($pkg in $installedPackages) {
                if (Is-ProtectedAppxName -Name $pkg.Name) {
                    Write-Log "Protected AppX skipped: $($pkg.Name)" 'INFO'
                    continue
                }

                $key = "installed::{0}" -f $pkg.PackageFullName
                if ($null -eq (Get-AppxRecord -CollectionName 'removed' -Key $key)) {
                    $manifest = $null
                    if ($pkg.InstallLocation) {
                        $candidate = Join-Path $pkg.InstallLocation 'AppxManifest.xml'
                        if (Test-Path -LiteralPath $candidate) {
                            $manifest = $candidate
                        }
                    }

                    $script:State.appx.removed += [pscustomobject]@{
                        key = $key
                        name = $pkg.Name
                        packageFullName = $pkg.PackageFullName
                        packageFamilyName = $pkg.PackageFamilyName
                        installLocation = $pkg.InstallLocation
                        manifestPath = $manifest
                    }
                    Save-State
                }

                try {
                    Remove-AppxPackage -Package $pkg.PackageFullName -AllUsers -ErrorAction Stop
                }
                catch {
                    Remove-AppxPackage -Package $pkg.PackageFullName -ErrorAction SilentlyContinue
                }
                $script:Summary.AppsRemoved++
                Write-Log "Removed installed AppX: $($pkg.PackageFullName)" 'OK'
            }

            $provisionedPackages = Get-AppxProvisionedPackage -Online | Where-Object { $_.DisplayName -eq $packageName }
            foreach ($prov in $provisionedPackages) {
                if (Is-ProtectedAppxName -Name $prov.DisplayName) {
                    Write-Log "Protected provisioned AppX skipped: $($prov.DisplayName)" 'INFO'
                    continue
                }

                $key = "provisioned::{0}" -f $prov.PackageName
                if ($null -eq (Get-AppxRecord -CollectionName 'provisionedRemoved' -Key $key)) {
                    $script:State.appx.provisionedRemoved += [pscustomobject]@{
                        key = $key
                        displayName = $prov.DisplayName
                        packageName = $prov.PackageName
                    }
                    Save-State
                }

                Remove-AppxProvisionedPackage -Online -PackageName $prov.PackageName -ErrorAction SilentlyContinue | Out-Null
                $script:Summary.ProvisionedAppsRemoved++
                Write-Log "Removed provisioned AppX: $($prov.PackageName)" 'OK'
            }
        }
    }
}

function Disable-ConfiguredTasks {
    foreach ($taskInfo in $script:Config.TaskTargets) {
        Invoke-TrackedStep -Name "Scheduled task [$($taskInfo.TaskPath)$($taskInfo.TaskName)]" -ScriptBlock {
            Disable-ScheduledTaskTracked -TaskPath $taskInfo.TaskPath -TaskName $taskInfo.TaskName -Bucket 'tasks'
        }
    }
}

function Apply-ServiceTweaks {
    foreach ($serviceInfo in $script:Config.ServiceTargets) {
        Invoke-TrackedStep -Name "Service [$($serviceInfo.Name)]" -ScriptBlock {
            $serviceNames = Resolve-ServiceNames -Pattern $serviceInfo.Name
            if ($serviceNames.Count -eq 0) {
                Write-Log "Service pattern not found, skipping: $($serviceInfo.Name)" 'INFO'
                return
            }

            foreach ($resolvedName in $serviceNames) {
                Set-ServiceTracked -Name $resolvedName -TargetStartupType $serviceInfo.StartupType
            }
        }
    }
}

function Apply-SystemResponsivenessAndNetworkTweaks {
    Write-Log 'Applying multimedia / scheduler / network stack tweaks (tracked, rollback-safe).' 'INFO'

    Invoke-TrackedStep -Name 'PriorityControl Win32PrioritySeparation' -ScriptBlock {
        [void](Set-RegistryValueTracked -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\PriorityControl' -Name 'Win32PrioritySeparation' -Value 38 -Type DWord)
    }

    Invoke-TrackedStep -Name 'SystemProfile responsiveness & network throttle' -ScriptBlock {
        [void](Set-RegistryValueTracked -Path 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile' -Name 'SystemResponsiveness' -Value 0 -Type DWord)
        [void](Set-RegistryValueTracked -Path 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile' -Name 'NetworkThrottlingIndex' -Value 4294967295 -Type DWord)
    }

    Invoke-TrackedStep -Name 'SystemProfile Games priority' -ScriptBlock {
        Ensure-RegistryPath -Path 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile\Tasks\Games'
        [void](Set-RegistryValueTracked -Path 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile\Tasks\Games' -Name 'GPU Priority' -Value 8 -Type DWord)
        [void](Set-RegistryValueTracked -Path 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile\Tasks\Games' -Name 'Priority' -Value 6 -Type DWord)
    }

    Invoke-TrackedStep -Name 'Memory management desktop defaults' -ScriptBlock {
        [void](Set-RegistryValueTracked -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management' -Name 'LargeSystemCache' -Value 0 -Type DWord)
        [void](Set-RegistryValueTracked -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management' -Name 'ClearPageFileAtShutdown' -Value 0 -Type DWord)
    }

    Invoke-TrackedStep -Name 'SvcHost split threshold' -ScriptBlock {
        [void](Set-RegistryValueTracked -Path 'HKLM:\SYSTEM\CurrentControlSet\Control' -Name 'SvcHostSplitThresholdInKB' -Value 4294967295 -Type DWord)
    }

    Invoke-TrackedStep -Name 'HAGS (HwSchMode)' -ScriptBlock {
        try {
            [void](Set-RegistryValueTracked -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\GraphicsDrivers' -Name 'HwSchMode' -Value 2 -Type DWord)
        }
        catch {
            Write-Log "HwSchMode not applied (driver/OS may not support HAGS): $($_.Exception.Message)" 'WARN'
        }
    }

    Invoke-TrackedStep -Name 'TCP global parameters (latency-friendly)' -ScriptBlock {
        $tcpParams = 'HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters'
        if (Test-Path -LiteralPath $tcpParams) {
            [void](Set-RegistryValueTracked -Path $tcpParams -Name 'TcpAckFrequency' -Value 1 -Type DWord)
            [void](Set-RegistryValueTracked -Path $tcpParams -Name 'TCPNoDelay' -Value 1 -Type DWord)
            [void](Set-RegistryValueTracked -Path $tcpParams -Name 'TcpDelAckTicks' -Value 0 -Type DWord)
        }
    }

    Invoke-TrackedStep -Name 'Game DVR / Game Bar capture (reduce overhead)' -ScriptBlock {
        $gdvr = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\GameDVR'
        Ensure-RegistryPath -Path $gdvr
        [void](Set-RegistryValueTracked -Path $gdvr -Name 'AppCaptureEnabled' -Value 0 -Type DWord)
        [void](Set-RegistryValueTracked -Path $gdvr -Name 'GameDVR_Enabled' -Value 0 -Type DWord)

        $gbar = 'HKCU:\Software\Microsoft\GameBar'
        Ensure-RegistryPath -Path $gbar
        [void](Set-RegistryValueTracked -Path $gbar -Name 'AutoGameModeEnabled' -Value 0 -Type DWord)
        [void](Set-RegistryValueTracked -Path $gbar -Name 'AllowAutoGameMode' -Value 0 -Type DWord)
    }
}

function Disable-BackgroundAndConsumerFeatures {
    Invoke-TrackedStep -Name 'Background apps' -ScriptBlock {
        [void](Set-RegistryValueTracked -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\BackgroundAccessApplications' -Name 'GlobalUserDisabled' -Value 1 -Type DWord)
    }

    Invoke-TrackedStep -Name 'Windows consumer features policy' -ScriptBlock {
        [void](Set-RegistryValueTracked -Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\CloudContent' -Name 'DisableWindowsConsumerFeatures' -Value 1 -Type DWord)
    }

    $contentValues = @(
        @{ Name = 'RotatingLockScreenOverlayEnabled'; Value = 0 },
        @{ Name = 'SubscribedContent-338387Enabled'; Value = 0 },
        @{ Name = 'SubscribedContent-338388Enabled'; Value = 0 },
        @{ Name = 'SubscribedContent-338389Enabled'; Value = 0 },
        @{ Name = 'SystemPaneSuggestionsEnabled'; Value = 0 },
        @{ Name = 'SoftLandingEnabled'; Value = 0 },
        @{ Name = 'PreInstalledAppsEnabled'; Value = 0 },
        @{ Name = 'PreInstalledAppsEverEnabled'; Value = 0 },
        @{ Name = 'SilentInstalledAppsEnabled'; Value = 0 },
        @{ Name = 'OemPreInstalledAppsEnabled'; Value = 0 }
    )

    foreach ($valueInfo in $contentValues) {
        Invoke-TrackedStep -Name "ContentDeliveryManager [$($valueInfo.Name)]" -ScriptBlock {
            [void](Set-RegistryValueTracked -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\ContentDeliveryManager' -Name $valueInfo.Name -Value $valueInfo.Value -Type DWord)
        }
    }

    Invoke-TrackedStep -Name 'Turn off Windows Copilot' -ScriptBlock {
        [void](Set-RegistryValueTracked -Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsCopilot' -Name 'TurnOffWindowsCopilot' -Value 1 -Type DWord)
    }

    Invoke-TrackedStep -Name 'Widgets and Copilot taskbar surfaces' -ScriptBlock {
        [void](Set-RegistryValueTracked -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced' -Name 'TaskbarDa' -Value 0 -Type DWord)
        [void](Set-RegistryValueTracked -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced' -Name 'ShowCopilotButton' -Value 0 -Type DWord)
    }

    Invoke-TrackedStep -Name 'News and interests policy' -ScriptBlock {
        [void](Set-RegistryValueTracked -Path 'HKLM:\SOFTWARE\Policies\Microsoft\Dsh' -Name 'AllowNewsAndInterests' -Value 0 -Type DWord)
    }
}

function Disable-StartupEntries {
    $runPaths = @(
        'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run',
        'HKLM:\Software\Microsoft\Windows\CurrentVersion\Run',
        'HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Run'
    )

    foreach ($runPath in $runPaths) {
        Invoke-TrackedStep -Name "Startup Run scan [$runPath]" -ScriptBlock {
            if (-not (Test-Path -LiteralPath $runPath)) {
                return
            }

            $props = (Get-ItemProperty -LiteralPath $runPath).PSObject.Properties | Where-Object { $_.Name -notmatch '^PS' }
            foreach ($prop in $props) {
                if (Test-StartupNameTarget -Name $prop.Name) {
                    Disable-StartupRunValue -Path $runPath -Name $prop.Name
                }
            }
        }
    }

    $startupApprovedPaths = @(
        'HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\Run',
        'HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\Run32',
        'HKLM:\Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\Run',
        'HKLM:\Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\Run32',
        'HKLM:\Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\StartupFolder',
        'HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\StartupFolder'
    )

    foreach ($approvedPath in $startupApprovedPaths) {
        Invoke-TrackedStep -Name "StartupApproved scan [$approvedPath]" -ScriptBlock {
            if (-not (Test-Path -LiteralPath $approvedPath)) {
                return
            }

            $props = (Get-ItemProperty -LiteralPath $approvedPath).PSObject.Properties | Where-Object { $_.Name -notmatch '^PS' }
            foreach ($prop in $props) {
                if (Test-StartupNameTarget -Name $prop.Name) {
                    Disable-StartupApprovedValue -Path $approvedPath -Name $prop.Name
                }
            }
        }
    }

    $startupFolders = @(
        [Environment]::GetFolderPath('Startup'),
        [Environment]::GetFolderPath('CommonStartup')
    ) | Where-Object { $_ }

    foreach ($folder in $startupFolders) {
        Invoke-TrackedStep -Name "Startup folder scan [$folder]" -ScriptBlock {
            if (-not (Test-Path -LiteralPath $folder)) {
                return
            }

            Get-ChildItem -LiteralPath $folder -File -ErrorAction SilentlyContinue | ForEach-Object {
                if (Test-StartupNameTarget -Name $_.Name) {
                    Disable-StartupFolderItem -Path $_.FullName
                }
            }
        }
    }

    Invoke-TrackedStep -Name 'Startup scheduled task scan' -ScriptBlock {
        $tasks = Get-ScheduledTask -ErrorAction SilentlyContinue
        foreach ($task in $tasks) {
            $descriptor = '{0}{1}' -f $task.TaskPath, $task.TaskName
            if (-not (Test-StartupNameTarget -Name $descriptor)) {
                continue
            }

            Disable-ScheduledTaskTracked -TaskPath $task.TaskPath -TaskName $task.TaskName -Bucket 'scheduledTasks'
        }
    }
}

function Configure-PowerPlan {
    Invoke-TrackedStep -Name 'Power plan selection' -ScriptBlock {
        $script:State.power.previousActiveScheme = Get-ActivePowerSchemeGuid
        Save-State

        $allSchemes = powercfg /list
        $targetScheme = $null
        foreach ($line in $allSchemes) {
            if ($line -match '([A-Fa-f0-9-]{36}).*Ultimate Performance') {
                $targetScheme = $matches[1]
                break
            }
        }

        if (-not $targetScheme) {
            powercfg /duplicatescheme $script:Config.UltimateSchemeGuid | Out-Null
            if ($LASTEXITCODE -eq 0) {
                $script:State.power.createdSchemes += $script:Config.UltimateSchemeGuid
                Save-State
                $allSchemes = powercfg /list
                foreach ($line in $allSchemes) {
                    if ($line -match '([A-Fa-f0-9-]{36}).*Ultimate Performance') {
                        $targetScheme = $matches[1]
                        break
                    }
                }
            }
        }

        if (-not $targetScheme) {
            foreach ($line in $allSchemes) {
                if ($line -match '([A-Fa-f0-9-]{36}).*High performance') {
                    $targetScheme = $matches[1]
                    break
                }
            }
        }

        if (-not $targetScheme) {
            $targetScheme = $script:Config.HighPerformanceGuid
        }

        powercfg /setactive $targetScheme | Out-Null
        $script:State.power.appliedScheme = $targetScheme
        Save-State
        Write-Log "Active power plan set to: $targetScheme" 'OK'
    }

    $activeScheme = Get-ActivePowerSchemeGuid
    foreach ($powerSetting in $script:Config.PowerSettings) {
        Invoke-TrackedStep -Name "Power setting [$($powerSetting.SubGroup)/$($powerSetting.Setting)]" -ScriptBlock {
            $null = Ensure-PowerSettingBackedUp -SchemeGuid $activeScheme -SubGroup $powerSetting.SubGroup -Setting $powerSetting.Setting
            $currentValue = Get-PowerSettingAcValue -SchemeGuid $activeScheme -SubGroup $powerSetting.SubGroup -Setting $powerSetting.Setting
            if ($currentValue -eq [int]$powerSetting.Value) {
                return
            }

            powercfg /setacvalueindex $activeScheme $powerSetting.SubGroup $powerSetting.Setting $powerSetting.Value | Out-Null
            Write-Log "Power setting updated: $($powerSetting.SubGroup)/$($powerSetting.Setting) -> $($powerSetting.Value)" 'OK'
        }
    }

    Invoke-TrackedStep -Name 'Power scheme activation refresh' -ScriptBlock {
        powercfg /setactive $activeScheme | Out-Null
    }

    Invoke-TrackedStep -Name 'Hibernate status' -ScriptBlock {
        $script:State.power.hibernateEnabled = 0
        try {
            $hibernateValue = Get-ItemPropertyValue -LiteralPath 'HKLM:\SYSTEM\CurrentControlSet\Control\Power' -Name 'HibernateEnabled' -ErrorAction Stop
            $script:State.power.hibernateEnabled = [int]$hibernateValue
        }
        catch {
        }
        Save-State
        powercfg /hibernate off | Out-Null
        Write-Log 'Hibernate disabled for desktop / AC profile.' 'OK'
    }
}

function Configure-Bcd {
    Invoke-TrackedStep -Name 'BCD export (before)' -ScriptBlock {
        (bcdedit /enum all) | Set-Content -LiteralPath $script:Context.BcdBeforePath -Encoding UTF8
        $script:State.bcd.beforePath = $script:Context.BcdBeforePath
        Save-State
    }

    Invoke-TrackedStep -Name 'BCD disabledynamictick' -ScriptBlock {
        $current = bcdedit /enum '{current}'
        $alreadySet = $false
        foreach ($line in $current) {
            if ($line -match 'disabledynamictick\s+Yes') {
                $alreadySet = $true
                break
            }
        }

        if (-not $alreadySet) {
            bcdedit /set '{current}' disabledynamictick yes | Out-Null
            $script:State.bcd.changed = $true
            Save-State
            Write-Log 'BCD updated: disabledynamictick=yes' 'OK'
        }
        else {
            Write-Log 'BCD already had disabledynamictick=yes.' 'INFO'
        }
    }

    Invoke-TrackedStep -Name 'BCD useplatformtick' -ScriptBlock {
        $enum = bcdedit /enum '{current}'
        $already = $false
        foreach ($line in $enum) {
            if ($line -match 'useplatformtick\s+Yes') {
                $already = $true
                break
            }
        }
        if (-not $already) {
            bcdedit /set '{current}' useplatformtick yes | Out-Null
            $script:State.bcd.useplatformtickChanged = $true
            Save-State
            Write-Log 'BCD updated: useplatformtick=yes' 'OK'
        }
    }

    Invoke-TrackedStep -Name 'BCD bootmenupolicy' -ScriptBlock {
        $enum = bcdedit /enum '{current}'
        $alreadyStd = $false
        foreach ($line in $enum) {
            if ($line -match 'bootmenupolicy\s+Standard') {
                $alreadyStd = $true
                break
            }
        }
        if (-not $alreadyStd) {
            bcdedit /set '{current}' bootmenupolicy Standard | Out-Null
            $script:State.bcd.bootMenuPolicyChanged = $true
            Save-State
            Write-Log 'BCD updated: bootmenupolicy=Standard' 'OK'
        }
    }

    Invoke-TrackedStep -Name 'BCD export (after)' -ScriptBlock {
        (bcdedit /enum all) | Set-Content -LiteralPath $script:Context.BcdAfterPath -Encoding UTF8
        $script:State.bcd.afterPath = $script:Context.BcdAfterPath
        Save-State
        Write-Log "BCD rollback command: $($script:State.bcd.rollbackCommand)" 'INFO'
    }
}

function Get-GpuVendor {
    $controllers = Get-CimInstance Win32_VideoController -ErrorAction SilentlyContinue
    foreach ($controller in $controllers) {
        $pnpId = [string]$controller.PNPDeviceID
        if ($pnpId -match 'VEN_10DE') {
            return [pscustomobject]@{ Vendor = 'NVIDIA'; AdapterString = $controller.Name }
        }
        if ($pnpId -match 'VEN_1002|VEN_1022') {
            return [pscustomobject]@{ Vendor = 'AMD'; AdapterString = $controller.Name }
        }
        if ($pnpId -match 'VEN_8086') {
            return [pscustomobject]@{ Vendor = 'Intel'; AdapterString = $controller.Name }
        }
    }

    return [pscustomobject]@{ Vendor = 'Unknown'; AdapterString = '' }
}

function Find-LiveVideoRegistryKeys {
    $results = @()
    $root = 'HKLM:\SYSTEM\CurrentControlSet\Control\Video'
    if (-not (Test-Path -LiteralPath $root)) {
        return $results
    }

    foreach ($adapterKey in Get-ChildItem -LiteralPath $root -ErrorAction SilentlyContinue) {
        foreach ($childName in @('0000', '0001')) {
            $candidate = Join-Path $adapterKey.PSPath $childName
            if (Test-Path -LiteralPath $candidate) {
                $results += $candidate
            }
        }
    }

    return $results
}

function Try-EnableGpuScaling {
    $gpu = Get-GpuVendor
    $script:State.gpuScaling.vendor = $gpu.Vendor
    Save-State

    $manualMessage = switch ($gpu.Vendor) {
        'NVIDIA' { 'Manual step: NVIDIA Control Panel or NVIDIA App > Display > Adjust desktop size and position > set scaling to GPU.' }
        'AMD' { 'Manual step: AMD Software Adrenalin > Display > GPU Scaling = Enabled.' }
        'Intel' { 'Manual step: Intel Graphics Command Center or Intel Arc Control > Display > Scaling.' }
        default { 'Manual step: use your GPU driver control panel to enable GPU scaling if your display pipeline supports it.' }
    }

    Invoke-TrackedStep -Name 'GPU scaling detection' -ScriptBlock {
        $candidateNames = switch ($gpu.Vendor) {
            'NVIDIA' { @('Scaling', 'GPUScaling') }
            'AMD' { @('Scaling', 'GPUScaling') }
            'Intel' { @('Scaling', 'GPUScaling') }
            default { @() }
        }

        if ($candidateNames.Count -eq 0) {
            $script:State.gpuScaling.mode = 'Manual'
            $script:State.gpuScaling.message = $manualMessage
            Save-State
            Write-Log $manualMessage 'WARN'
            return
        }

        foreach ($regPath in Find-LiveVideoRegistryKeys) {
            foreach ($valueName in $candidateNames) {
                $snapshot = Get-RegistryValueSnapshot -Path $regPath -Name $valueName
                if (-not $snapshot.existed) {
                    continue
                }

                if ($snapshot.kind -ne 'DWord') {
                    continue
                }

                $currentValue = [int]$snapshot.value
                if ($currentValue -eq 1) {
                    $script:State.gpuScaling.mode = 'Registry'
                    $script:State.gpuScaling.message = "GPU scaling already enabled via existing value [$valueName]."
                    Save-State
                    Write-Log $script:State.gpuScaling.message 'INFO'
                    return
                }

                $null = Ensure-RegistryValueBackedUp -Path $regPath -Name $valueName
                New-ItemProperty -Path $regPath -Name $valueName -PropertyType DWord -Value 1 -Force | Out-Null
                $script:State.gpuScaling.changed = $true
                $script:State.gpuScaling.mode = 'Registry'
                $script:State.gpuScaling.message = "Enabled GPU scaling via existing registry value [$valueName] under [$regPath]."
                $script:State.gpuScaling.registry += [pscustomobject]@{
                    path = $regPath
                    name = $valueName
                }
                Save-State
                Write-Log $script:State.gpuScaling.message 'OK'
                return
            }
        }

        $script:State.gpuScaling.mode = 'Manual'
        $script:State.gpuScaling.message = $manualMessage
        Save-State
        Write-Log $manualMessage 'WARN'
    }
}

function Print-Summary {
    $beforeCount = [int]$script:State.metrics.before.processCount
    $afterCount = [int]$script:State.metrics.after.processCount
    $gpuNote = $script:State.gpuScaling.message
    $restorePointNote = if ($script:State.restorePoint.created) { 'created' } else { 'skipped/unavailable' }

    Write-Host ''
    Write-Host '========== VieXF Ultra Debloat ==========' -ForegroundColor White
    Write-Host ("Processes: {0} -> {1}" -f $beforeCount, $afterCount) -ForegroundColor White
    Write-Host ("Services changed: {0}" -f $script:Summary.ServicesChanged) -ForegroundColor White
    Write-Host ("Tasks changed: {0}" -f $script:Summary.TasksChanged) -ForegroundColor White
    Write-Host ("Startup entries changed: {0}" -f $script:Summary.StartupEntriesChanged) -ForegroundColor White
    Write-Host ("Installed apps removed: {0}" -f $script:Summary.AppsRemoved) -ForegroundColor White
    Write-Host ("Provisioned apps removed: {0}" -f $script:Summary.ProvisionedAppsRemoved) -ForegroundColor White
    Write-Host ("Restore point: {0}" -f $restorePointNote) -ForegroundColor White
    Write-Host ("GPU scaling: {0}" -f $gpuNote) -ForegroundColor White
    Write-Host ("Logs: {0}" -f $script:Context.LogRoot) -ForegroundColor White
    Write-Host ("Backups: {0}" -f $script:Context.BackupRoot) -ForegroundColor White
    Write-Host 'Note: sub-50 process counts are not guaranteed across Windows versions. Largest reductions usually appear after sign-out or reboot.' -ForegroundColor Yellow
    Write-Host '=========================================' -ForegroundColor White
}

try {
    Ensure-Admin
    Initialize-ScriptState
    Write-Log 'Starting safe aggressive debloat for a desktop / AC gaming-workstation profile.' 'INFO'
    Capture-BeforeMetrics
    Create-RestorePointIfPossible
    Remove-ConfiguredAppxPackages
    Disable-ConfiguredTasks
    Apply-ServiceTweaks
    Disable-BackgroundAndConsumerFeatures
    Apply-SystemResponsivenessAndNetworkTweaks
    Disable-StartupEntries
    Configure-PowerPlan
    Configure-Bcd
    Try-EnableGpuScaling
    Capture-AfterMetrics
    Write-Log 'Ultra debloat completed successfully.' 'OK'
    Print-Summary
    exit 0
}
catch {
    Write-Log ("Fatal error: {0}" -f $_.Exception.Message) 'ERROR'
    Add-StateWarning -Message ("Fatal error: {0}" -f $_.Exception.Message)
    throw
}
finally {
    if ($null -ne $script:State) {
        $script:State.active = $true
        Save-State
    }
    Stop-Logging
}
