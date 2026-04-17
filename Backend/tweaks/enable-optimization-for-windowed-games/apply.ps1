
$regPath = "HKCU:\Software\Microsoft\DirectX\UserGpuPreferences"
$keyName = "DirectXUserGlobalSettings"
$value = "SwapEffectUpgradeEnable=1;"

If (-not (Test-Path $regPath)) {
    New-Item -Path $regPath -Force | Out-Null
}

Set-ItemProperty -Path $regPath -Name $keyName -Value $value

Write-Host "DirectX game optimization applied."
