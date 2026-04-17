# Vie Debloat Script

param(
    [string]$ScriptChoice = "",
    [string[]]$AppsToKeep = @()
)

$version = "1.0.3"

Add-Type -AssemblyName PresentationFramework
Add-Type -AssemblyName PresentationCore
Add-Type -AssemblyName WindowsBase

# list of apps to remove
$appDefinitions = @(
    @{ Package = "Clipchamp.Clipchamp"; FriendlyName = "Clipchamp Video Editor" },
    @{ Package = "Microsoft.3DBuilder"; FriendlyName = "3D Builder" },
    @{ Package = "Microsoft.549981C3F5F10"; FriendlyName = "Cortana" },
    @{ Package = "Microsoft.BingFinance"; FriendlyName = "Bing Finance" },
    @{ Package = "Microsoft.BingFoodAndDrink"; FriendlyName = "Bing Food & Drink" },
    @{ Package = "Microsoft.BingHealthAndFitness"; FriendlyName = "Bing Health & Fitness" },
    @{ Package = "Microsoft.BingNews"; FriendlyName = "Bing News" },
    @{ Package = "Microsoft.BingSports"; FriendlyName = "Bing Sports" },
    @{ Package = "Microsoft.BingTranslator"; FriendlyName = "Bing Translator" },
    @{ Package = "Microsoft.BingTravel"; FriendlyName = "Bing Travel" },
    @{ Package = "Microsoft.BingWeather"; FriendlyName = "Bing Weather" },
    @{ Package = "Microsoft.Copilot"; FriendlyName = "Microsoft Copilot" },
    @{ Package = "Microsoft.Getstarted"; FriendlyName = "Get Started (Tips)" },
    @{ Package = "Microsoft.Messaging"; FriendlyName = "Microsoft Messaging" },
    @{ Package = "Microsoft.Microsoft3DViewer"; FriendlyName = "3D Viewer" },
    @{ Package = "Microsoft.MicrosoftJournal"; FriendlyName = "Microsoft Journal" },
    @{ Package = "Microsoft.MicrosoftOfficeHub"; FriendlyName = "Office Hub" },
    @{ Package = "Microsoft.MicrosoftPowerBIForWindows"; FriendlyName = "Power BI" },
    @{ Package = "Microsoft.MicrosoftSolitaireCollection"; FriendlyName = "Solitaire Collection" },
    @{ Package = "Microsoft.MicrosoftStickyNotes"; FriendlyName = "Sticky Notes" },
    @{ Package = "Microsoft.MixedReality.Portal"; FriendlyName = "Mixed Reality Portal" },
    @{ Package = "Microsoft.News"; FriendlyName = "Microsoft News" },
    @{ Package = "Microsoft.Office.OneNote"; FriendlyName = "OneNote" },
    @{ Package = "Microsoft.Office.Sway"; FriendlyName = "Office Sway" },
    @{ Package = "Microsoft.OneConnect"; FriendlyName = "OneConnect" },
    @{ Package = "Microsoft.Paint"; FriendlyName = "Paint" },
    @{ Package = "Microsoft.Print3D"; FriendlyName = "Print 3D" },
    @{ Package = "Microsoft.SkypeApp"; FriendlyName = "Skype" },
    @{ Package = "Microsoft.Todos"; FriendlyName = "Microsoft To Do" },
    @{ Package = "Microsoft.WindowsAlarms"; FriendlyName = "Alarms & Clock" },
    @{ Package = "Microsoft.WindowsCamera"; FriendlyName = "Camera" },
    @{ Package = "Microsoft.WindowsFeedbackHub"; FriendlyName = "Feedback Hub" },
    @{ Package = "Microsoft.WindowsMaps"; FriendlyName = "Maps" },
    @{ Package = "Microsoft.WindowsNotepad"; FriendlyName = "Notepad" },
    @{ Package = "Microsoft.WindowsSoundRecorder"; FriendlyName = "Sound Recorder" },
    @{ Package = "Microsoft.XboxApp"; FriendlyName = "Xbox Console Companion" },
    @{ Package = "Microsoft.ZuneVideo"; FriendlyName = "Movies & TV" },
    @{ Package = "MicrosoftCorporationII.MicrosoftFamily"; FriendlyName = "Microsoft Family" },
    @{ Package = "MicrosoftTeams"; FriendlyName = "Microsoft Teams" },
    @{ Package = "MSTeams"; FriendlyName = "Teams" },
    @{ Package = "Microsoft.WindowsCalculator"; FriendlyName = "Calculator" },
    @{ Package = "Microsoft.Windows.Photos"; FriendlyName = "Photos" },
    @{ Package = "microsoft.windowscommunicationsapps"; FriendlyName = "Mail & Calendar" },
    @{ Package = "Microsoft.XboxGamingOverlay"; FriendlyName = "Xbox Game Bar" },
    @{ Package = "Microsoft.XboxIdentityProvider"; FriendlyName = "Xbox Identity Provider" },
    @{ Package = "Microsoft.XboxSpeechToTextOverlay"; FriendlyName = "Xbox Speech to Text" },
    @{ Package = "Microsoft.OneDrive"; FriendlyName = "OneDrive" },
    @{ Package = "Amazon.com.Amazon"; FriendlyName = "Amazon" },
    @{ Package = "9P1J8S7CCWWT"; FriendlyName = "Clipchamp (Store)" },
    @{ Package = "AmazonVideo.PrimeVideo"; FriendlyName = "Prime Video" },
    @{ Package = "Disney"; FriendlyName = "Disney+" },
    @{ Package = "Duolingo-LearnLanguagesforFree"; FriendlyName = "Duolingo" },
    @{ Package = "Facebook"; FriendlyName = "Facebook" },
    @{ Package = "FarmVille2CountryEscape"; FriendlyName = "FarmVille 2" },
    @{ Package = "Instagram"; FriendlyName = "Instagram" },
    @{ Package = "Netflix"; FriendlyName = "Netflix" },
    @{ Package = "PandoraMediaInc.Pandora"; FriendlyName = "Pandora" },
    @{ Package = "Spotify"; FriendlyName = "Spotify" },
    @{ Package = "Twitter"; FriendlyName = "Twitter" },
    @{ Package = "TwitterUniversal"; FriendlyName = "Twitter (Universal)" },
    @{ Package = "YouTube"; FriendlyName = "YouTube" },
    @{ Package = "Plex"; FriendlyName = "Plex" },
    @{ Package = "TikTok"; FriendlyName = "TikTok" },
    @{ Package = "TuneInRadio"; FriendlyName = "TuneIn Radio" },
    @{ Package = "king.com.BubbleWitch3Saga"; FriendlyName = "Bubble Witch 3 Saga" },
    @{ Package = "king.com.CandyCrushSaga"; FriendlyName = "Candy Crush Saga" },
    @{ Package = "king.com.CandyCrushSodaSaga"; FriendlyName = "Candy Crush Soda Saga" }
)

$allAppsToRemove = $appDefinitions | ForEach-Object { $_.Package }

# default apps to pre-check (these will be kept)
$defaultApps = @(
    "Microsoft.WindowsCalculator", 
    "Microsoft.WindowsNotepad",
    "Microsoft.Paint",
    "Microsoft.Windows.Photos",
    "Microsoft.WindowsCamera",
    "Microsoft.XboxGamingOverlay",
    "Microsoft.XboxIdentityProvider",
    "Microsoft.XboxSpeechToTextOverlay",
    "Microsoft.XboxApp"
)

function Get-FriendlyName {
    param([string]$PackageName)
    
    $def = $appDefinitions | Where-Object { $_.Package -eq $PackageName }
    if ($def) {
        return $def.FriendlyName
    }
    
    # fallback to auto-generated name
    return $PackageName -replace "MicrosoftCorporationII\.", "" -replace "Microsoft\.", "" -replace "\.", " "
}

function Show-ScriptSelectionDialog {
    [xml]$xaml = @"
<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="(Vie) Debloat Script v$version" 
        Height="220" Width="550" 
        WindowStartupLocation="CenterScreen"
        Topmost="True"
        ResizeMode="NoResize">
    <Grid Margin="15">
        <Grid.RowDefinitions>
            <RowDefinition Height="Auto"/>
            <RowDefinition Height="*"/>
            <RowDefinition Height="Auto"/>
        </Grid.RowDefinitions>
        
        <TextBlock Grid.Row="0" Text="Choose your debloat approach:" 
                   FontSize="14" FontWeight="Bold" Margin="0,0,0,15"/>
        
        <StackPanel Grid.Row="1" Margin="10,0,0,0">
            <RadioButton x:Name="RadioVie" Content="Vie Debloat Script " 
                        Margin="0,0,0,10" IsChecked="True" FontSize="12"/>
            <RadioButton x:Name="RadioRaphire" Content="=Windows 11 Debloat Script" 
                        FontSize="12"/>
        </StackPanel>
        
        <StackPanel Grid.Row="2" Orientation="Horizontal" HorizontalAlignment="Right" Margin="0,15,0,0">
            <Button x:Name="BtnOK" Content="OK" Width="80" Height="28" Margin="0,0,10,0" IsDefault="True"/>
            <Button x:Name="BtnCancel" Content="Cancel" Width="80" Height="28" IsCancel="True"/>
        </StackPanel>
    </Grid>
</Window>
"@

    $reader = New-Object System.Xml.XmlNodeReader $xaml
    $window = [Windows.Markup.XamlReader]::Load($reader)
    
    $radioVie = $window.FindName("RadioVie")
    $radioRaphire = $window.FindName("RadioRaphire")
    $btnOK = $window.FindName("BtnOK")
    $btnCancel = $window.FindName("BtnCancel")
    
    $script:dialogResult = $null
    
    $btnOK.Add_Click({
            if ($radioRaphire.IsChecked) {
                $script:dialogResult = "windows"
            }
            else {
                $script:dialogResult = "custom"
            }
            $window.Close()
        })
    
    $btnCancel.Add_Click({
            $script:dialogResult = "cancel"
            $window.Close()
        })
    
    $window.ShowDialog() | Out-Null
    return $script:dialogResult
}

function Show-AppSelectionDialog {
    # generate apps list with friendly names
    $apps = @()
    foreach ($appDef in $appDefinitions) {
        $apps += @{ 
            Name      = $appDef.FriendlyName
            Package   = $appDef.Package
            IsChecked = ($defaultApps -contains $appDef.Package) 
        }
    }
    
    # sort by friendly name for better UX
    $apps = $apps | Sort-Object { $_.Name }
    
    [xml]$xaml = @"
<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
    xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
    Title="(Vie) Select Apps to Keep v$version" 
    Height="650" Width="550" 
    WindowStartupLocation="CenterScreen"
    ResizeMode="NoResize">
    <Grid Margin="15">
    <Grid.RowDefinitions>
        <RowDefinition Height="Auto"/>   <!-- Title -->
        <RowDefinition Height="Auto"/>   <!-- Warning -->
        <RowDefinition Height="*"/>      <!-- List -->
        <RowDefinition Height="Auto"/>   <!-- Select/Deselect -->
        <RowDefinition Height="Auto"/>   <!-- OK/Cancel -->
    </Grid.RowDefinitions>
    
    <TextBlock Grid.Row="0" Text="Select the apps you want to KEEP (uncheck to remove):" 
           FontSize="14" FontWeight="Bold" Margin="0,0,0,10" TextWrapping="Wrap"/>
    <TextBlock Grid.Row="1" Text="Ensure you have a restore point before proceeding." 
           FontSize="12"  Margin="0,0,0,10"/>

    <Border Grid.Row="2" BorderBrush="#CCCCCC" BorderThickness="1" Margin="0,0,0,10">
        <ScrollViewer VerticalScrollBarVisibility="Auto" >
        <ItemsControl x:Name="AppsList" Margin="5">
            <ItemsControl.ItemTemplate>
            <DataTemplate>
                <CheckBox Content="{Binding Name}" IsChecked="{Binding IsChecked}" 
                     Margin="5,3" FontSize="11"/>
            </DataTemplate>
            </ItemsControl.ItemTemplate>
        </ItemsControl>
        </ScrollViewer>
    </Border>
    
    <StackPanel Grid.Row="3" Orientation="Horizontal" Margin="0,0,0,10">
        <Button x:Name="BtnSelectAll" Content="Select All" Width="100" Height="28" Margin="0,0,10,0"/>
        <Button x:Name="BtnDeselectAll" Content="Deselect All" Width="100" Height="28"/>
    </StackPanel>
    
    <StackPanel Grid.Row="4" Orientation="Horizontal" HorizontalAlignment="Right">
        <Button x:Name="BtnOK" Content="OK" Width="80" Height="28" Margin="0,0,10,0" IsDefault="True"/>
        <Button x:Name="BtnCancel" Content="Cancel" Width="80" Height="28" IsCancel="True"/>
    </StackPanel>
    </Grid>
</Window>
"@

    $reader = New-Object System.Xml.XmlNodeReader $xaml
    $window = [Windows.Markup.XamlReader]::Load($reader)
    
    $appsList = $window.FindName("AppsList")
    $btnSelectAll = $window.FindName("BtnSelectAll")
    $btnDeselectAll = $window.FindName("BtnDeselectAll")
    $btnOK = $window.FindName("BtnOK")
    $btnCancel = $window.FindName("BtnCancel")
    
    # create observable collection for data binding
    $observableApps = New-Object System.Collections.ObjectModel.ObservableCollection[Object]
    foreach ($app in $apps) {
        $observableApps.Add((New-Object PSObject -Property $app))
    }
    $appsList.ItemsSource = $observableApps
    
    $script:dialogResult = $null
    
    $btnSelectAll.Add_Click({
            foreach ($item in $observableApps) {
                $item.IsChecked = $true
            }
            $appsList.Items.Refresh()
        })
    
    $btnDeselectAll.Add_Click({
            foreach ($item in $observableApps) {
                $item.IsChecked = $false
            }
            $appsList.Items.Refresh()
        })
    
    $btnOK.Add_Click({
            $script:dialogResult = @()
            foreach ($item in $observableApps) {
                if ($item.IsChecked) {
                    $script:dialogResult += $item.Package
                }
            }
            $window.Close()
        })
    
    $btnCancel.Add_Click({
            $script:dialogResult = $null
            $window.Close()
            
        })
    
    $window.ShowDialog() | Out-Null
    return $script:dialogResult
}

function Remove-SelectedApps {
    param([string[]]$AppsToKeep)

    Write-Host "Starting Vie debloat..." -ForegroundColor Green

    $appsToRemove = $allAppsToRemove | Where-Object { $_ -notin $AppsToKeep }

    # display friendly names in console output
    $keptNames = $AppsToKeep | ForEach-Object { Get-FriendlyName $_ }
    Write-Host "Apps that will be kept: $($keptNames -join ', ')" -ForegroundColor Yellow
    Write-Host "Apps that will be removed: $($appsToRemove.Count)" -ForegroundColor Red
    
    foreach ($app in $appsToRemove) {
        try {
            $friendlyName = Get-FriendlyName $app
            Write-Host "Checking for $friendlyName ($app)..." -ForegroundColor Yellow

            $pkg = Get-AppxPackage -Name *$app* -ErrorAction SilentlyContinue
            if ($pkg) {
                $pkg | ForEach-Object {
                    Write-Host "Removing Appx package $($_.Name)..." -ForegroundColor Yellow
                    Remove-AppxPackage -Package $_.PackageFullName -ErrorAction SilentlyContinue
                }
                Write-Host "Removed $friendlyName" -ForegroundColor Green
            }
            else {
                Write-Host "$friendlyName is not installed" -ForegroundColor Gray
            }

            $prov = Get-AppxProvisionedPackage -Online | Where-Object DisplayName -like "*$app*"
            if ($prov) {
                $prov | ForEach-Object {
                    Write-Host "Removing provisioned package $($_.DisplayName)..." -ForegroundColor Yellow
                    Remove-AppxProvisionedPackage -Online -PackageName $_.PackageName -ErrorAction SilentlyContinue
                }
            }
        }
        catch {
            Write-Host "Could not remove $friendlyName : $_" -ForegroundColor Red
        }
    }

    Write-Host "Vie debloat completed!" -ForegroundColor Green
}

try {
    Write-Host "Starting Vie Debloat script..." -ForegroundColor Green
    Write-Host "Script Choice: '$ScriptChoice'" -ForegroundColor Yellow
    Write-Host "Apps to Keep Count: $($AppsToKeep.Count)" -ForegroundColor Yellow
    
    # get the ui params 
    if ($ScriptChoice -eq "windows") {
        Write-Host "Running Windows 11 Debloat script..." -ForegroundColor Green
        & ([scriptblock]::Create((Invoke-RestMethod 'https://debloat.raphi.re/'))) -Silent -RemoveApps
        Write-Host "Raphire's script completed!" -ForegroundColor Green
    }
    elseif ($ScriptChoice -eq "custom") {
        if ($AppsToKeep.Count -gt 0) {
            Write-Host "Running Vie debloat with $($AppsToKeep.Count) apps to keep..." -ForegroundColor Green
            Remove-SelectedApps -AppsToKeep $AppsToKeep
        }
        else {
            Write-Host "Custom debloat selected but no apps specified. Running with defaults..." -ForegroundColor Yellow
            Remove-SelectedApps -AppsToKeep $defaultApps
        }
    }
    elseif ($ScriptChoice -eq "" -or $ScriptChoice -eq $null) {
        Write-Host "No script choice provided, entering interactive mode..." -ForegroundColor Yellow
        
        try {
            $choice = Show-ScriptSelectionDialog
            
            if ($choice -eq "cancel") {
                Write-Host "Operation cancelled by user." -ForegroundColor Yellow
                exit 0
            }
            
            if ($choice -eq "raphire") {
                Write-Host "Running Raphire's Win11Debloat script..." -ForegroundColor Green
                & ([scriptblock]::Create((Invoke-RestMethod 'https://debloat.raphi.re/'))) -Silent -RemoveApps
                Write-Host "Debloat completed!" -ForegroundColor Green
            }
            elseif ($choice -eq "custom") {
                $appsToKeep = Show-AppSelectionDialog
                
                if ($appsToKeep -eq $null) {
                    Write-Host "Operation cancelled by user." -ForegroundColor Yellow
                    exit 0
                }
                
                Remove-SelectedApps -AppsToKeep $appsToKeep
            }
        }
        catch {
            Write-Host "Interactive mode failed, falling back to Raphire's script: $_" -ForegroundColor Yellow
            & ([scriptblock]::Create((Invoke-RestMethod 'https://debloat.raphi.re/'))) -Silent -RemoveApps
        }
    }
    else {
        Write-Host "Unknown script choice '$ScriptChoice', defaulting to Raphire's script..." -ForegroundColor Yellow
        & ([scriptblock]::Create((Invoke-RestMethod 'https://debloat.raphi.re/'))) -Silent -RemoveApps
    }
    Write-Host "Debloat Script From https://getvie.net" -ForegroundColor Cyan

    if (-not (Get-Process -Name "Vie" -ErrorAction SilentlyContinue)) {
        Add-Type -AssemblyName PresentationFramework
        
        [xml]$xaml = @"
<Window 
    xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
    xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
    Title="Vie - Debloat Complete" 
    Height="150" 
    Width="400"
    WindowStartupLocation="CenterScreen">
    <Grid>
        <Grid.RowDefinitions>
            <RowDefinition Height="*"/>
            <RowDefinition Height="Auto"/>
        </Grid.RowDefinitions>
        
        <TextBlock Grid.Row="0" 
                  Text="Debloat completed successfully!" 
                  FontSize="16"
                  TextWrapping="Wrap"
                  HorizontalAlignment="Center"
                  VerticalAlignment="Center"
                  TextAlignment="Center"/>
                  
        <Button Grid.Row="1" 
               x:Name="BtnOK" 
               Content="OK" 
               Width="80" 
               Margin="15"
               HorizontalAlignment="Center"/>
    </Grid>
</Window>
"@

        $reader = New-Object System.Xml.XmlNodeReader $xaml
        $window = [Windows.Markup.XamlReader]::Load($reader)
        
        $btnOK = $window.FindName("BtnOK")
        $btnOK.Add_Click({ $window.Close() })
        
        $window.ShowDialog() | Out-Null
    }

}
catch {
    Write-Host "Error during debloat process: $_" -ForegroundColor Red
    Write-Host "Stack trace: $($_.ScriptStackTrace)" -ForegroundColor Red
    exit 1
}