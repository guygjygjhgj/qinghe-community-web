param([switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
$projectRoot = $PSScriptRoot
$localDir = Join-Path $projectRoot '.local'
$url = 'http://127.0.0.1:4180/'
$env:PORT = '4180'
New-Item -ItemType Directory -Path $localDir -Force | Out-Null

function Test-LocalSite {
    try {
        $response = Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 2
        return ($response.StatusCode -eq 200 -and $response.Content.Contains('native-layers.css'))
    } catch { return $false }
}

if (-not (Test-LocalSite)) {
    $nodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue
    if ($nodeCommand) { $nodePath = $nodeCommand.Source }
    else {
        $nodePath = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
        if (-not (Test-Path -LiteralPath $nodePath)) {
            throw 'Node.js 20 or newer is required. Install Node.js, then run this launcher again.'
        }
    }
    $serverPath = Join-Path $projectRoot 'server.cjs'
    $server = Start-Process -FilePath $nodePath -ArgumentList @(('"' + $serverPath + '"')) -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $localDir 'server.log') -RedirectStandardError (Join-Path $localDir 'server-error.log')
    Set-Content -LiteralPath (Join-Path $localDir 'server.pid') -Value $server.Id -Encoding ASCII
    $ready = $false
    for ($attempt = 0; $attempt -lt 20; $attempt++) {
        if (Test-LocalSite) { $ready = $true; break }
        if ($server.HasExited) { break }
        Start-Sleep -Milliseconds 250
    }
    if (-not $ready) {
        $details = Get-Content -LiteralPath (Join-Path $localDir 'server-error.log') -Raw -ErrorAction SilentlyContinue
        throw "Could not start the local site. $details"
    }
}
Write-Host "Local site is running: $url"
if (-not $NoBrowser) { Start-Process $url }
