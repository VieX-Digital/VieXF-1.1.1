$rollbackScript = Join-Path $PSScriptRoot 'rollback.ps1'
if (-not (Test-Path -LiteralPath $rollbackScript)) {
    throw "Rollback script not found: $rollbackScript"
}

& $rollbackScript
exit $LASTEXITCODE
