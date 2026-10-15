$ErrorActionPreference = 'Stop'
$pidFile = Join-Path $PSScriptRoot '.local\server.pid'
if (-not (Test-Path -LiteralPath $pidFile)) { Write-Host 'No saved local server process.'; exit 0 }
$serverId = [int](Get-Content -LiteralPath $pidFile -Raw)
$process = Get-CimInstance Win32_Process -Filter "ProcessId = $serverId"
$expectedScript = Join-Path $PSScriptRoot 'server.cjs'
if ($process -and $process.Name -eq 'node.exe' -and $process.CommandLine.Contains($expectedScript)) {
    Stop-Process -Id $serverId
    Write-Host 'Local site stopped.'
} elseif ($process) {
    throw 'The saved process ID belongs to a different program. Nothing was stopped.'
} else { Write-Host 'Local site is already stopped.' }
Remove-Item -LiteralPath $pidFile
