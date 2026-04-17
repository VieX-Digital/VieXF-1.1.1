Write-Host "Reverting network tweaks to defaults..."

$ErrorActionPreference = 'SilentlyContinue'

netsh int tcp set heuristics enabled
netsh int tcp set supplemental template=internet congestionprovider=default
netsh int tcp set global rss=default
netsh int tcp set global ecncapability=default
netsh int tcp set global timestamps=default
netsh int tcp set global fastopen=default
netsh int tcp set global fastopenfallback=default
netsh int tcp set supplemental template=custom icw=4

# MTU: only apply to interfaces that exist
$interfaces = (Get-NetIPInterface -AddressFamily IPv4 -ErrorAction SilentlyContinue).InterfaceAlias
foreach ($name in @('Wi-Fi', 'Ethernet')) {
    if ($interfaces -contains $name) {
        netsh interface ipv4 set subinterface "`"$name`"" mtu=1500 store=persistent
    }
}

Write-Host "Network tweaks reverted to defaults."
