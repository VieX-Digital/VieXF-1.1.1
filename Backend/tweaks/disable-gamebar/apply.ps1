try {
    winget uninstall 9nzkpstsnw4p --silent --accept-source-agreements 
        Get-AppxPackage Microsoft.XboxGamingOverlay | Remove-AppxPackage -ErrorAction Stop
      
        Write-Output 'Successfully removed Xbox Gaming Overlay via AppxPackage'
    }
    catch {
        Write-Output 'AppxPackage removal failed, trying to remove via winget'
        try {
            winget uninstall 9nzkpstsnw4p --silent --accept-source-agreements 
            Write-Output 'Successfully removed Xbox Gaming Overlay via winget'
        }
        catch {
            Write-Output 'Winget uninstall failed'
        }
    }