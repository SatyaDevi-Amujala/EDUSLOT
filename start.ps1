# Starts every service in its own window (no Docker).
#   powershell -ExecutionPolicy Bypass -File .\start.ps1
# Run .\setup.ps1 once first.
$root = $PSScriptRoot

function Start-Svc($title, $dir, $cmd) {
  Start-Process powershell -ArgumentList @(
    '-NoExit', '-Command',
    "`$host.UI.RawUI.WindowTitle='$title'; Set-Location -LiteralPath '$dir'; $cmd"
  )
  Write-Host "  started $title" -ForegroundColor Green
}

Write-Host "Starting backend services..." -ForegroundColor Cyan
Start-Svc 'user-service'       "$root\backend\user-service"       'node src/index.js'
Start-Svc 'enrollment-service' "$root\backend\enrollment-service" 'node src/index.js'
Start-Svc 'master-service'     "$root\backend\master-service"     'node src/index.js'
Start-Svc 'api-gateway'        "$root\backend\api-gateway"        'node src/index.js'

Start-Sleep -Seconds 2
Write-Host "Starting frontends (preview servers)..." -ForegroundColor Cyan
Start-Svc 'shell-app'  "$root\frontend\shell-app"  'npm run preview'
Start-Svc 'admin-app'  "$root\frontend\admin-app"  'npm run preview'
Start-Svc 'enroll-app' "$root\frontend\enroll-app" 'npm run preview'

Write-Host "`nAll started. Open http://localhost:5000" -ForegroundColor Yellow
Write-Host "Login: admin@example.com / password123"
