Write-Host "Reverting DNS settings to automatic (DHCP)..."

$adapters = Get-NetAdapter | Where-Object { $_.Status -eq "Up" }

if ($adapters.Count -eq 0) {
    Write-Host "No active network adapters found."
    exit 1
}

foreach ($adapter in $adapters) {
    Write-Host "Resetting DNS for adapter: $($adapter.Name)"
    
    try {
        Set-DnsClientServerAddress -InterfaceIndex $adapter.ifIndex -ResetServerAddresses
        Write-Host "Reset $($adapter.Name) to automatic DNS (DHCP)"
    }
    catch {
        Write-Host "Error resetting DNS for $($adapter.Name): $($_.Exception.Message)"
    }
}

Write-Host "Flushing DNS cache..."
ipconfig /flushdns | Out-Null

Write-Host "DNS settings reverted to automatic successfully!"
Write-Host "Current DNS settings:"

Get-DnsClientServerAddress | Where-Object { $_.ServerAddresses.Count -gt 0 } | ForEach-Object {
    $adapter = Get-NetAdapter -InterfaceIndex $_.InterfaceIndex -ErrorAction SilentlyContinue
    if ($adapter) {
        $dnsList = $_.ServerAddresses | Where-Object { $_ -notmatch '^fec0' }
        if ($dnsList) {
            Write-Host "  $($adapter.Name): $($dnsList -join ', ')"
        }
    }
}
