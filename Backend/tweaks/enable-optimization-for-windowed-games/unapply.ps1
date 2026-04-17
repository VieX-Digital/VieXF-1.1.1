$regPath = "HKCU:\Software\Microsoft\DirectX\UserGpuPreferences"
$keyName = "DirectXUserGlobalSettings"

If (Test-Path "$regPath\$keyName") {
    Remove-ItemProperty -Path $regPath -Name $keyName -ErrorAction SilentlyContinue
    Write-Host "DirectX game optimization removed."
}
else {
    Write-Host "Registry key does not exist, nothing to remove."
}
