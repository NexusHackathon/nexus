# NEXUS - start backend (FastAPI) + frontend (Vite), both with hot-reload.
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

# Prefer the backend virtualenv python; fall back to system python.
$py = if (Test-Path "backend\.venv\Scripts\python.exe") { "backend\.venv\Scripts\python.exe" } else { "python" }

# Simulation mode by default so it runs without the ESP32 hardware present.
if (-not $env:NEXUS_SIM) { $env:NEXUS_SIM = "sim" }

Write-Host "[nexus] backend  -> http://localhost:8800  (NEXUS_SIM=$($env:NEXUS_SIM))" -ForegroundColor Cyan
$backend = Start-Process -FilePath $py `
  -ArgumentList "-m","uvicorn","main:app","--reload","--reload-dir","backend","--app-dir","backend","--port","8800" `
  -NoNewWindow -PassThru

Write-Host "[nexus] frontend -> http://localhost:5173" -ForegroundColor Cyan
$frontend = Start-Process -FilePath "npm.cmd" `
  -ArgumentList "--prefix","frontend","run","dev" `
  -NoNewWindow -PassThru

Write-Host "[nexus] both services up. press Ctrl+C to stop." -ForegroundColor Green
try {
  Wait-Process -Id $backend.Id, $frontend.Id
} finally {
  Write-Host "`n[nexus] shutting down..." -ForegroundColor Yellow
  foreach ($p in @($backend, $frontend)) {
    if ($p -and -not $p.HasExited) { Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue }
  }
}
