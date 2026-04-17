# Diagnostic Script: Verify VieXF RAM Usage
# Run this while VieXF is open to see the real-time memory footprint.

$processes = Get-Process | Where-Object { 
    $_.MainWindowTitle -like "*VieXF*" -or 
    $_.ProcessName -like "VieXF" -or 
    $_.ProcessName -like "electron" -or 
    $_.ProcessName -like "msedgewebview2"
}

if ($processes) {
    Write-Host "`n--- VieXF Process Memory Audit ---" -ForegroundColor Cyan
    $totalMB = 0
    $processes | ForEach-Object {
        $mb = [math]::round($_.WorkingSet / 1MB, 2)
        $totalMB += $mb
        Write-Host ("Process: {0,-20} | ID: {1,6} | RAM: {2,8} MB" -f $_.ProcessName, $_.Id, $mb)
    }
    Write-Host ("`nTOTAL SYSTEM RAM USAGE: {0,8} MB" -f [math]::round($totalMB, 2)) -ForegroundColor Yellow
    
    if ($totalMB -lt 15) {
        Write-Host "STATUS: SUCCESS (< 15MB Target met!)" -ForegroundColor Green
    } else {
        Write-Host "STATUS: WARNING (> 15MB. Ensure 'setwork.exe' is running in the background.)" -ForegroundColor Red
    }
} else {
    Write-Host "No VieXF or related processes found. Make sure the app is running." -ForegroundColor Gray
}
Write-Host "----------------------------------`n"
