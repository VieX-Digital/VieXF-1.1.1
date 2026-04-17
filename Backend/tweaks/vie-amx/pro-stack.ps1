# VieXF Pro layer: chạy sau Ultra Debloat. Backup vao C:\VieXF\Backup roi tat service aggresive.
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$script:SkipSvcHostSplit = $false

$Brand = 'VieXF'
$Root = Join-Path $env:SystemDrive $Brand
$BackupRoot = Join-Path $Root 'Backup'
$LogFile = Join-Path $Root 'VieXF-Optimize.log'

function Write-Log {
    param(
        [Parameter(Mandatory)] [string]$Message,
        [ValidateSet('INFO', 'WARN', 'ERROR', 'OK')] [string]$Level = 'INFO'
    )
    $line = "[{0}] [{1}] {2}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Level, $Message
    Add-Content -Path $LogFile -Value $line -Encoding UTF8
    switch ($Level) {
        'INFO' { Write-Host $line -ForegroundColor Cyan }
        'WARN' { Write-Host $line -ForegroundColor Yellow }
        'ERROR' { Write-Host $line -ForegroundColor Red }
        'OK' { Write-Host $line -ForegroundColor Green }
    }
}

function Assert-Admin {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($identity)
    if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        throw 'Hãy chạy PowerShell bằng quyền Administrator.'
    }
}

function Ensure-Path {
    param([Parameter(Mandatory)][string]$Path)
    if (-not (Test-Path -LiteralPath $Path)) {
        New-Item -ItemType Directory -Path $Path -Force | Out-Null
    }
}

function Export-RegistrySafely {
    param(
        [Parameter(Mandatory)][string]$Key,
        [Parameter(Mandatory)][string]$Destination
    )
    $null = & reg.exe export $Key $Destination /y 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Log "Đã backup registry: $Key -> $Destination" 'OK'
    }
    else {
        Write-Log "Không backup được registry: $Key" 'WARN'
    }
}

function Backup-Bcd {
    $bcdPath = Join-Path $BackupRoot 'BCD-Backup.bcd'
    $null = & bcdedit /export $bcdPath 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Log "Đã backup BCD -> $bcdPath" 'OK'
    }
    else {
        Write-Log 'Không thể backup BCD. Bỏ qua phần backup BCD.' 'WARN'
    }
}

function Backup-PowerSchemes {
    $outFile = Join-Path $BackupRoot 'powercfg-list-before.txt'
    $list = & powercfg /list 2>&1
    $list | Out-File -FilePath $outFile -Encoding UTF8
    Write-Log "Đã lưu danh sách power plan hiện tại -> $outFile" 'OK'
}

function Initialize-Backup {
    Ensure-Path -Path $Root
    Ensure-Path -Path $BackupRoot
    if (-not (Test-Path -LiteralPath $LogFile)) {
        New-Item -Path $LogFile -ItemType File -Force | Out-Null
    }

    Export-RegistrySafely -Key 'HKLM\SYSTEM\CurrentControlSet\Services' -Destination (Join-Path $BackupRoot 'ServicesBackup.reg')
    Export-RegistrySafely -Key 'HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile' -Destination (Join-Path $BackupRoot 'SystemProfile.reg')
    Export-RegistrySafely -Key 'HKLM\SYSTEM\CurrentControlSet\Control\GraphicsDrivers' -Destination (Join-Path $BackupRoot 'GraphicsDrivers.reg')
    Export-RegistrySafely -Key 'HKLM\SYSTEM\CurrentControlSet\Control\PriorityControl' -Destination (Join-Path $BackupRoot 'PriorityControl.reg')
    Export-RegistrySafely -Key 'HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System' -Destination (Join-Path $BackupRoot 'Policies-System.reg')
    Export-RegistrySafely -Key 'HKLM\SYSTEM\CurrentControlSet\Control' -Destination (Join-Path $BackupRoot 'Control.reg')
    Backup-Bcd
    Backup-PowerSchemes
}

function Try-CreateRestorePoint {
    Enable-ComputerRestore -Drive "$($env:SystemDrive)\" | Out-Null
    Checkpoint-Computer -Description "$Brand Restore Point" -RestorePointType 'MODIFY_SETTINGS' | Out-Null
    Write-Log 'Đã tạo restore point.' 'OK'
}

function Set-RegDword {
    param(
        [Parameter(Mandatory)][string]$Path,
        [Parameter(Mandatory)][string]$Name,
        [Parameter(Mandatory)][UInt32]$Value
    )
    try {
        if (-not (Test-Path -LiteralPath $Path)) {
            New-Item -Path $Path -Force -ErrorAction Stop | Out-Null
        }
        New-ItemProperty -Path $Path -Name $Name -PropertyType DWord -Value $Value -Force -ErrorAction Stop | Out-Null
        Write-Log "Registry DWORD: $Path :: $Name = $Value" 'OK'
    }
    catch {
        Write-Log "Không thể set registry $Path :: $Name : $($_.Exception.Message)" 'WARN'
    }
}

function Set-ServiceStartup {
    param(
        [Parameter(Mandatory)][string]$Name,
        [Parameter(Mandatory)][ValidateSet('Automatic', 'Manual', 'Disabled')][string]$StartupType
    )
    try {
        $svc = Get-Service -Name $Name -ErrorAction Stop
        Set-Service -Name $Name -StartupType $StartupType -ErrorAction Stop
        if ($StartupType -eq 'Disabled' -and $svc.Status -eq 'Running') {
            try { Stop-Service -Name $Name -Force -ErrorAction Stop } catch {}
        }
        Write-Log "Service: $Name -> $StartupType" 'OK'
    }
    catch {
        Write-Log "Service không tồn tại hoặc không chỉnh được: $Name" 'WARN'
    }
}

function Set-OriginalServiceProfile {
    Write-Log 'Đang áp dụng nhóm service gốc từ file .bat theo kiểu mạnh tay. Cấu hình này có thể làm hỏng Wi‑Fi, update, print, đăng nhập, log hệ thống và nhiều tính năng khác.' 'WARN'

    $originalServiceStates = @(
        @{ Name = 'AarSvc'; Type = 'Disabled' }, @{ Name = 'ADPSvc'; Type = 'Disabled' }, @{ Name = 'AJRouter'; Type = 'Disabled' },
        @{ Name = 'ALG'; Type = 'Disabled' }, @{ Name = 'AppMgmt'; Type = 'Disabled' }, @{ Name = 'AppInfo'; Type = 'Disabled' },
        @{ Name = 'AppReadiness'; Type = 'Disabled' }, @{ Name = 'AssignedAccessManagerSvc'; Type = 'Disabled' }, @{ Name = 'autotimesvc'; Type = 'Disabled' },
        @{ Name = 'AxInstSV'; Type = 'Disabled' }, @{ Name = 'BcastDVRUserService'; Type = 'Disabled' }, @{ Name = 'BDESVC'; Type = 'Disabled' },
        @{ Name = 'BITS'; Type = 'Disabled' }, @{ Name = 'BluetoothUserService'; Type = 'Disabled' }, @{ Name = 'BTAGService'; Type = 'Disabled' },
        @{ Name = 'BthAvctpSvc'; Type = 'Disabled' }, @{ Name = 'bthserv'; Type = 'Disabled' }, @{ Name = 'CaptureService'; Type = 'Disabled' },
        @{ Name = 'cbdhsvc'; Type = 'Disabled' }, @{ Name = 'CDPUserSvc'; Type = 'Disabled' }, @{ Name = 'CDPSvc'; Type = 'Disabled' },
        @{ Name = 'CertPropSvc'; Type = 'Disabled' }, @{ Name = 'CloudBackupRestoreSvc'; Type = 'Disabled' }, @{ Name = 'cloudidsvc'; Type = 'Manual' },
        @{ Name = 'COMSysApp'; Type = 'Disabled' }, @{ Name = 'ConsentUxUserSvc'; Type = 'Disabled' }, @{ Name = 'CscService'; Type = 'Disabled' },
        @{ Name = 'dcsvc'; Type = 'Disabled' }, @{ Name = 'defragsvc'; Type = 'Manual' }, @{ Name = 'DeviceAssociationService'; Type = 'Disabled' },
        @{ Name = 'DeviceInstall'; Type = 'Disabled' }, @{ Name = 'DevicePickerUserSvc'; Type = 'Disabled' }, @{ Name = 'DevicesFlowUserSvc'; Type = 'Disabled' },
        @{ Name = 'DevQueryBroker'; Type = 'Disabled' }, @{ Name = 'diagnosticshub.standardcollector.service'; Type = 'Disabled' }, @{ Name = 'DiagTrack'; Type = 'Disabled' },
        @{ Name = 'diagsvc'; Type = 'Disabled' }, @{ Name = 'DispBrokerDesktopSvc'; Type = 'Automatic' }, @{ Name = 'DisplayEnhancementService'; Type = 'Disabled' },
        @{ Name = 'DmEnrollmentSvc'; Type = 'Disabled' }, @{ Name = 'dmwappushservice'; Type = 'Disabled' }, @{ Name = 'dot3svc'; Type = 'Disabled' },
        @{ Name = 'DPS'; Type = 'Disabled' }, @{ Name = 'DsmSvc'; Type = 'Disabled' }, @{ Name = 'DsSvc'; Type = 'Disabled' }, @{ Name = 'DusmSvc'; Type = 'Disabled' },
        @{ Name = 'Eaphost'; Type = 'Disabled' }, @{ Name = 'edgeupdate'; Type = 'Disabled' }, @{ Name = 'edgeupdatem'; Type = 'Disabled' },
        @{ Name = 'EFS'; Type = 'Disabled' }, @{ Name = 'EventLog'; Type = 'Disabled' }, @{ Name = 'EventSystem'; Type = 'Manual' },
        @{ Name = 'fdPHost'; Type = 'Disabled' }, @{ Name = 'FDResPub'; Type = 'Disabled' }, @{ Name = 'fhsvc'; Type = 'Disabled' }, @{ Name = 'FontCache'; Type = 'Disabled' },
        @{ Name = 'FrameServer'; Type = 'Disabled' }, @{ Name = 'FrameServerMonitor'; Type = 'Disabled' }, @{ Name = 'GameInputSvc'; Type = 'Disabled' },
        @{ Name = 'GraphicsPerfSvc'; Type = 'Disabled' }, @{ Name = 'hpatchmon'; Type = 'Disabled' }, @{ Name = 'hidserv'; Type = 'Disabled' },
        @{ Name = 'HvHost'; Type = 'Disabled' }, @{ Name = 'icssvc'; Type = 'Disabled' }, @{ Name = 'IKEEXT'; Type = 'Disabled' }, @{ Name = 'InstallService'; Type = 'Disabled' },
        @{ Name = 'InventorySvc'; Type = 'Disabled' }, @{ Name = 'IpxlatCfgSvc'; Type = 'Disabled' }, @{ Name = 'KtmRm'; Type = 'Disabled' },
        @{ Name = 'LanmanServer'; Type = 'Disabled' }, @{ Name = 'LanmanWorkstation'; Type = 'Disabled' }, @{ Name = 'lfsvc'; Type = 'Disabled' },
        @{ Name = 'LocalKdc'; Type = 'Disabled' }, @{ Name = 'LicenseManager'; Type = 'Disabled' }, @{ Name = 'lltdsvc'; Type = 'Disabled' }, @{ Name = 'lmhosts'; Type = 'Disabled' },
        @{ Name = 'LxpSvc'; Type = 'Disabled' }, @{ Name = 'MapsBroker'; Type = 'Disabled' }, @{ Name = 'McpManagementService'; Type = 'Disabled' }, @{ Name = 'McmSvc'; Type = 'Disabled' },
        @{ Name = 'MessagingService'; Type = 'Disabled' }, @{ Name = 'MicrosoftEdgeElevationService'; Type = 'Disabled' }, @{ Name = 'midisrv'; Type = 'Disabled' },
        @{ Name = 'MSDTC'; Type = 'Disabled' }, @{ Name = 'MSiSCSI'; Type = 'Disabled' }, @{ Name = 'NaturalAuthentication'; Type = 'Disabled' },
        @{ Name = 'NcaSvc'; Type = 'Disabled' }, @{ Name = 'NcbService'; Type = 'Disabled' }, @{ Name = 'NcdAutoSetup'; Type = 'Disabled' }, @{ Name = 'Netlogon'; Type = 'Disabled' },
        @{ Name = 'Netman'; Type = 'Disabled' }, @{ Name = 'NetSetupSvc'; Type = 'Disabled' }, @{ Name = 'NetTcpPortSharing'; Type = 'Disabled' }, @{ Name = 'NlaSvc'; Type = 'Disabled' },
        @{ Name = 'NPSMSvc'; Type = 'Disabled' }, @{ Name = 'OneSyncSvc'; Type = 'Disabled' }, @{ Name = 'p2pimsvc'; Type = 'Disabled' }, @{ Name = 'p2psvc'; Type = 'Disabled' },
        @{ Name = 'P9RdrService'; Type = 'Disabled' }, @{ Name = 'PcaSvc'; Type = 'Disabled' }, @{ Name = 'PeerDistSvc'; Type = 'Disabled' }, @{ Name = 'PenService'; Type = 'Disabled' },
        @{ Name = 'perceptionsimulation'; Type = 'Disabled' }, @{ Name = 'PerfHost'; Type = 'Disabled' }, @{ Name = 'PhoneSvc'; Type = 'Disabled' },
        @{ Name = 'PimIndexMaintenanceSvc'; Type = 'Disabled' }, @{ Name = 'pla'; Type = 'Disabled' }, @{ Name = 'PNRPAutoReg'; Type = 'Disabled' }, @{ Name = 'PNRPsvc'; Type = 'Disabled' },
        @{ Name = 'PolicyAgent'; Type = 'Disabled' }, @{ Name = 'PrintDeviceConfigurationService'; Type = 'Disabled' }, @{ Name = 'PrintNotify'; Type = 'Disabled' },
        @{ Name = 'PrintScanBrokerService'; Type = 'Disabled' }, @{ Name = 'PushToInstall'; Type = 'Disabled' }, @{ Name = 'QWAVE'; Type = 'Disabled' },
        @{ Name = 'RasAuto'; Type = 'Disabled' }, @{ Name = 'RasMan'; Type = 'Disabled' }, @{ Name = 'refsdedupsvc'; Type = 'Disabled' }, @{ Name = 'RemoteAccess'; Type = 'Disabled' },
        @{ Name = 'RemoteRegistry'; Type = 'Disabled' }, @{ Name = 'RetailDemo'; Type = 'Disabled' }, @{ Name = 'RmSvc'; Type = 'Disabled' }, @{ Name = 'RpcLocator'; Type = 'Disabled' },
        @{ Name = 'SamSs'; Type = 'Disabled' }, @{ Name = 'SCardSvr'; Type = 'Disabled' }, @{ Name = 'ScDeviceEnum'; Type = 'Disabled' }, @{ Name = 'SCPolicySvc'; Type = 'Disabled' },
        @{ Name = 'SDRSVC'; Type = 'Disabled' }, @{ Name = 'seclogon'; Type = 'Disabled' }, @{ Name = 'SENS'; Type = 'Disabled' }, @{ Name = 'Sense'; Type = 'Disabled' },
        @{ Name = 'SensorDataService'; Type = 'Disabled' }, @{ Name = 'SensorService'; Type = 'Disabled' }, @{ Name = 'SensrSvc'; Type = 'Disabled' },
        @{ Name = 'SEMgrSvc'; Type = 'Disabled' }, @{ Name = 'SessionEnv'; Type = 'Disabled' }, @{ Name = 'SharedAccess'; Type = 'Disabled' }, @{ Name = 'SharedRealitySvc'; Type = 'Disabled' },
        @{ Name = 'ShellHWDetection'; Type = 'Disabled' }, @{ Name = 'shpamsvc'; Type = 'Disabled' }, @{ Name = 'SmsRouter'; Type = 'Disabled' }, @{ Name = 'smphost'; Type = 'Disabled' },
        @{ Name = 'SNMPTrap'; Type = 'Disabled' }, @{ Name = 'spectrum'; Type = 'Disabled' }, @{ Name = 'Spooler'; Type = 'Disabled' }, @{ Name = 'SSDPSRV'; Type = 'Disabled' },
        @{ Name = 'ssh-agent'; Type = 'Disabled' }, @{ Name = 'SstpSvc'; Type = 'Disabled' }, @{ Name = 'stisvc'; Type = 'Disabled' }, @{ Name = 'StorSvc'; Type = 'Disabled' },
        @{ Name = 'svsvc'; Type = 'Disabled' }, @{ Name = 'SysMain'; Type = 'Disabled' }, @{ Name = 'TapiSrv'; Type = 'Disabled' }, @{ Name = 'TermService'; Type = 'Disabled' },
        @{ Name = 'Themes'; Type = 'Disabled' }, @{ Name = 'TieringEngineService'; Type = 'Disabled' }, @{ Name = 'TokenBroker'; Type = 'Disabled' }, @{ Name = 'TrkWks'; Type = 'Disabled' },
        @{ Name = 'TroubleshootingSvc'; Type = 'Disabled' }, @{ Name = 'tzautoupdate'; Type = 'Disabled' }, @{ Name = 'UevAgentService'; Type = 'Disabled' }, @{ Name = 'uhssvc'; Type = 'Disabled' },
        @{ Name = 'UmRdpService'; Type = 'Disabled' }, @{ Name = 'UnistoreSvc'; Type = 'Disabled' }, @{ Name = 'upnphost'; Type = 'Disabled' }, @{ Name = 'UserDataSvc'; Type = 'Disabled' },
        @{ Name = 'UsoSvc'; Type = 'Disabled' }, @{ Name = 'VacSvc'; Type = 'Disabled' }, @{ Name = 'VaultSvc'; Type = 'Disabled' }, @{ Name = 'vds'; Type = 'Disabled' },
        @{ Name = 'vmicguestinterface'; Type = 'Disabled' }, @{ Name = 'vmicheartbeat'; Type = 'Disabled' }, @{ Name = 'vmickvpexchange'; Type = 'Disabled' }, @{ Name = 'vmicrdv'; Type = 'Disabled' },
        @{ Name = 'vmicshutdown'; Type = 'Disabled' }, @{ Name = 'vmictimesync'; Type = 'Disabled' }, @{ Name = 'vmicvmsession'; Type = 'Disabled' }, @{ Name = 'vmicvss'; Type = 'Disabled' },
        @{ Name = 'W32Time'; Type = 'Disabled' }, @{ Name = 'WalletService'; Type = 'Disabled' }, @{ Name = 'WarpJITSvc'; Type = 'Disabled' }, @{ Name = 'wbengine'; Type = 'Disabled' },
        @{ Name = 'WbioSrvc'; Type = 'Disabled' }, @{ Name = 'Wcmsvc'; Type = 'Disabled' }, @{ Name = 'wcncsvc'; Type = 'Disabled' }, @{ Name = 'WdiServiceHost'; Type = 'Disabled' },
        @{ Name = 'WdiSystemHost'; Type = 'Disabled' }, @{ Name = 'WebClient'; Type = 'Disabled' }, @{ Name = 'webthreatdefusersvc'; Type = 'Disabled' }, @{ Name = 'webthreatdefsvc'; Type = 'Disabled' },
        @{ Name = 'Wecsvc'; Type = 'Disabled' }, @{ Name = 'WEPHOSTSVC'; Type = 'Disabled' }, @{ Name = 'wercplsupport'; Type = 'Disabled' }, @{ Name = 'WerSvc'; Type = 'Disabled' },
        @{ Name = 'WFDSConMgrSvc'; Type = 'Disabled' }, @{ Name = 'whesvc'; Type = 'Disabled' }, @{ Name = 'WiaRpc'; Type = 'Disabled' }, @{ Name = 'WinRM'; Type = 'Disabled' },
        @{ Name = 'wisvc'; Type = 'Disabled' }, @{ Name = 'WlanSvc'; Type = 'Disabled' }, @{ Name = 'wlidsvc'; Type = 'Disabled' }, @{ Name = 'wlpasvc'; Type = 'Disabled' },
        @{ Name = 'WManSvc'; Type = 'Disabled' }, @{ Name = 'wmiApSrv'; Type = 'Disabled' }, @{ Name = 'WMPNetworkSvc'; Type = 'Disabled' }, @{ Name = 'workfolderssvc'; Type = 'Disabled' },
        @{ Name = 'WpcMonSvc'; Type = 'Disabled' }, @{ Name = 'WPDBusEnum'; Type = 'Disabled' }, @{ Name = 'WpnUserService'; Type = 'Disabled' }, @{ Name = 'WpnService'; Type = 'Disabled' },
        @{ Name = 'wuqisvc'; Type = 'Disabled' }, @{ Name = 'WSAIFabricSvc'; Type = 'Disabled' }, @{ Name = 'WSearch'; Type = 'Disabled' }, @{ Name = 'wuauserv'; Type = 'Disabled' },
        @{ Name = 'WwanSvc'; Type = 'Disabled' }, @{ Name = 'XblAuthManager'; Type = 'Disabled' }, @{ Name = 'XblGameSave'; Type = 'Disabled' }, @{ Name = 'XboxGipSvc'; Type = 'Disabled' },
        @{ Name = 'XboxNetApiSvc'; Type = 'Disabled' }
    )

    foreach ($svc in $originalServiceStates) {
        Set-ServiceStartup -Name $svc.Name -StartupType $svc.Type
    }

    $regDisable = @(
        'AppIDSvc', 'AppXSvc', 'BFE', 'ClipSVC', 'CredentialEnrollmentManagerUserSvc', 'DeviceAssociationBrokerSvc',
        'DoSvc', 'EntAppSvc', 'embeddedmode', 'PrintWorkflowUserSvc', 'SgrmBroker', 'WaaSMedicSvc', 'WinHttpAutoProxySvc'
    )
    foreach ($svcName in $regDisable) {
        Set-RegDword -Path "HKLM:\SYSTEM\CurrentControlSet\Services\$svcName" -Name 'Start' -Value 4
    }

    if (-not $script:SkipSvcHostSplit) {
        Set-RegDword -Path 'HKLM:\SYSTEM\CurrentControlSet\Control' -Name 'SvcHostSplitThresholdInKB' -Value 4294967295
    }

    # Giữ đúng ý của file gốc: AppInfo bị tắt nên UAC cũng bị tắt.
    Set-RegDword -Path 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System' -Name 'EnableLUA' -Value 0

    Write-Log 'Hoàn tất nhóm OriginalAggressive.' 'OK'
}

function Invoke-VieAmxProStack {
    $script:SkipSvcHostSplit = $false
    Assert-Admin
    Initialize-Backup
    try {
        Try-CreateRestorePoint
    }
    catch {
        Write-Log "Tạo restore point thất bại: $($_.Exception.Message)" 'WARN'
    }
    Set-OriginalServiceProfile
    Write-Log 'VieXF Pro (tren nen Ultra Debloat) hoan tat. Nen restart may.' 'OK'
}
