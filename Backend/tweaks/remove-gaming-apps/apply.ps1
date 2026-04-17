$appsList = 'Microsoft.GamingApp', 'Microsoft.XboxGameOverlay', 'Microsoft.XboxGamingOverlay'

foreach ($app in $appsList) {
    Get-AppxPackage -Name $app -AllUsers | Remove-AppxPackage
    Get-AppxProvisionedPackage -Online | Where-Object DisplayName -EQ $app | Remove-AppxProvisionedPackage -Online
}
