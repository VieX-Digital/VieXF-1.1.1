Write-Host "Applying network tweaks..."

# TCP/IP tweaks - applies in order, continues even if one fails
$ErrorActionPreference = 'SilentlyContinue'

netsh int tcp set heuristics disabled
netsh int tcp set supplemental template=internet congestionprovider=ctcp
netsh int tcp set global rss=enabled
netsh int tcp set global ecncapability=enabled
netsh int tcp set global timestamps=disabled
netsh int tcp set global fastopen=enabled
netsh int tcp set global fastopenfallback=enabled
netsh int tcp set supplemental template=custom icw=10

# MTU: only apply to interfaces that exist (names vary: "Ethernet 2", "Wi-Fi", locale-specific)
$interfaces = (Get-NetIPInterface -AddressFamily IPv4 -ErrorAction SilentlyContinue).InterfaceAlias
foreach ($name in @('Wi-Fi', 'Ethernet')) {
    if ($interfaces -contains $name) {
        netsh interface ipv4 set subinterface "`"$name`"" mtu=1500 store=persistent
    }
}

Write-Host "Network tweaks applied successfully."
