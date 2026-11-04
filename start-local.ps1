<#
  Windows port of start-local.sh. Place in the repository root and run:
    powershell -ExecutionPolicy Bypass -File .\start-local.ps1
  Options:
    -SkipDb   skip creating the database/user (use after the first run)
  Ctrl+C stops every service this script started.
#>
param([switch]$SkipDb)

$ErrorActionPreference = 'Stop'
$Root    = $PSScriptRoot
$EnvFile = Join-Path $Root 'dealer-platform\.env.local'
$LogDir  = Join-Path $Root 'log-sum'
$Procs   = @()
$env:Path += ";C:\Program Files\MySQL\MySQL Server 8.4\bin"
$env:INTERNAL_TOKEN = "dev-internal-token"


function Say($m)  { Write-Host "`n[DealerOps] $m" -ForegroundColor Cyan }
function Warn($m) { Write-Host "[DealerOps] $m" -ForegroundColor Yellow }
function Die($m)  { Write-Host "[DealerOps] $m" -ForegroundColor Red; exit 1 }

foreach ($tool in 'dotnet','node','npm','mysql') {
  if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) { Die "$tool not found on PATH. Install it and reopen the terminal." }
}

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

# First run: create the git-ignored local env file from the example
if (-not (Test-Path $EnvFile)) {
  Say 'First run, creating dealer-platform\.env.local'
  Copy-Item (Join-Path $Root 'dealer-platform\env.example') $EnvFile
}

# Load KEY=VALUE lines from .env.local into this process
Get-Content $EnvFile | ForEach-Object {
  $line = $_.Trim()
  if ($line -and -not $line.StartsWith('#') -and $line -match '^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$') {
    $val = $Matches[2].Trim().Trim('"').Trim("'")
    [Environment]::SetEnvironmentVariable($Matches[1], $val, 'Process')
  }
}

function Default($name, $value) {
  if (-not [Environment]::GetEnvironmentVariable($name, 'Process')) {
    [Environment]::SetEnvironmentVariable($name, $value, 'Process')
  }
}

# env.example may contain a JDBC URL; the .NET services need an ADO.NET connection string
if (-not $env:MYSQL_URL -or $env:MYSQL_URL -like 'jdbc:*') {
  $env:MYSQL_URL = 'Server=127.0.0.1;Port=3306;Database=dealer_core;User=dealer;Password=dealer_dev_only'
}
Default 'ADMIN_USERNAME' 'admin'
Default 'ADMIN_PASSWORD' 'admin123'
Default 'ADMIN_EMAIL'    'admin@example.com'
Default 'AIMANAGER_API_KEY' ''
Default 'DEV_JWT_SECRET' 'dealer-dev-jwt-secret-change-me'
Default 'INTERNAL_TOKEN' 'dealer-internal'
Default 'CORS_ALLOWED_ORIGIN' 'http://localhost:5174'

$env:ASPNETCORE_ENVIRONMENT = 'Development'
$env:CORE_URL     = 'http://127.0.0.1:8081'
$env:AI_URL       = 'http://127.0.0.1:8082'
$env:GATEWAY_PORT = '8080'
$env:AI_PORT      = '8082'
$env:LOG_DIR      = $LogDir
$env:JWT_MODE     = 'dev'

function Test-MySql {
  & mysqladmin ping -h 127.0.0.1 -P 3306 --silent 2>$null | Out-Null
  return ($LASTEXITCODE -eq 0)
}

Say 'Checking MySQL...'
if (-not (Test-MySql)) {
  # Try the common Windows service names
  foreach ($svc in 'MySQL84','MySQL80','MySQL') {
    if (Get-Service $svc -ErrorAction SilentlyContinue) {
      Warn "MySQL not running, starting service $svc"
      try { Start-Service $svc } catch { Warn "Could not start $svc (run PowerShell as Administrator once, or start it in services.msc)" }
      break
    }
  }
  1..30 | ForEach-Object { if (-not (Test-MySql)) { Start-Sleep 1 } }
}
if (-not (Test-MySql)) { Die 'MySQL is not running. Start it and retry.' }

if (-not $SkipDb) {
  Say 'Creating database and user (needs the MySQL root password)'
  $secure = Read-Host 'MySQL root password (leave empty if none)' -AsSecureString
  $rootPw = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure))
  $sql = @"
CREATE DATABASE IF NOT EXISTS dealer_core CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE USER IF NOT EXISTS 'dealer'@'localhost' IDENTIFIED BY 'dealer_dev_only';
CREATE USER IF NOT EXISTS 'dealer'@'127.0.0.1' IDENTIFIED BY 'dealer_dev_only';
GRANT ALL PRIVILEGES ON dealer_core.* TO 'dealer'@'localhost';
GRANT ALL PRIVILEGES ON dealer_core.* TO 'dealer'@'127.0.0.1';
FLUSH PRIVILEGES;
"@
  $args = @('-h','127.0.0.1','-P','3306','-u','root','-e',$sql)
  if ($rootPw) { $args = @("--password=$rootPw") + $args }
  & mysql @args
  if ($LASTEXITCODE -ne 0) { Die 'Database setup failed (wrong root password?).' }
}

$webDir = Join-Path $Root 'frontend\react'
if (-not (Test-Path (Join-Path $webDir 'node_modules'))) {
  Say 'Installing frontend dependencies (first run)...'
  Push-Location $webDir; npm install; Pop-Location
}

function Start-Svc($name, $file, $argList, $workDir) {
  Say "Starting $name..."
  $p = Start-Process -FilePath $file -ArgumentList $argList -WorkingDirectory $workDir `
        -RedirectStandardOutput (Join-Path $LogDir "$name.log") `
        -RedirectStandardError  (Join-Path $LogDir "$name.err.log") `
        -NoNewWindow -PassThru
  $script:Procs += $p
}

function Stop-All {
  if ($Procs.Count) {
    Say 'Stopping services started by this script...'
    foreach ($p in $Procs) { & taskkill /PID $p.Id /T /F 2>$null | Out-Null }
  }
}

try {
  foreach ($svc in @(
    @('dealer-core',    'backend\dotnet\DealerOps.Core\DealerOps.Core.csproj'),
    @('ai-service',     'backend\dotnet\DealerOps.AiService\DealerOps.AiService.csproj'),
    @('dealer-gateway', 'backend\dotnet\DealerOps.Gateway\DealerOps.Gateway.csproj'))) {
    Start-Svc $svc[0] 'dotnet' @('run','--project',$svc[1],'--no-launch-profile') $Root
  }
  Start-Svc 'dealer-web' 'npm.cmd' @('run','dev','--','--host','127.0.0.1') $webDir

  Say 'Waiting for services...'
  foreach ($url in 'http://127.0.0.1:8081/actuator/health','http://127.0.0.1:8082/actuator/health','http://127.0.0.1:8080/actuator/health') {
    # core and ai-service answer 404 without the internal header; the gateway answers 404 with it
    $headers = @{}
    if ($url -notlike '*:8080/*') { $headers['X-Dealer-Internal'] = $env:INTERNAL_TOKEN }
    $ready = $false
    for ($i = 0; $i -lt 90 -and -not $ready; $i++) {
      try { Invoke-WebRequest -Uri $url -Headers $headers -UseBasicParsing -TimeoutSec 2 | Out-Null; $ready = $true }
      catch { Start-Sleep 1 }
    }
    if (-not $ready) { Warn "No response from $url (see $LogDir)" }
  }

  if (-not $env:AIMANAGER_API_KEY) {
    Warn 'AI key not set: AI requests return AI_KEY_MISSING. Put AIMANAGER_API_KEY in dealer-platform\.env.local and rerun.'
  }
  Say 'Done. Open http://localhost:5174'
  Say "Login: $($env:ADMIN_USERNAME) / $($env:ADMIN_PASSWORD)"
  Say 'Press Ctrl+C to stop everything.'

  while ($true) { Start-Sleep 2 }
}
finally {
  Stop-All
}
