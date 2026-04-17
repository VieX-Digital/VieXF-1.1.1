$TweakDir = 'D:\WorkSpace\VieXF-1.1.1-main\VieXF-1.1.1-main\Backend\tweaks'
Get-ChildItem -Path $TweakDir -Filter *.ps1 -Recurse | ForEach-Object {
    $errors = $null
    $tokens = $null
    $ast = [System.Management.Automation.Language.Parser]::ParseFile($_.FullName, [ref]$tokens, [ref]$errors)
    if ($errors) {
        "FAIL: $($_.FullName)"
        foreach ($err in $errors) {
            "  -> Line $($err.Extent.StartLineNumber): $($err.Message)"
        }
    }
}
