# One-time setup for running WITHOUT Docker.
#   powershell -ExecutionPolicy Bypass -File .\setup.ps1
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot

$backends  = 'api-gateway','user-service','enrollment-service','master-service'
$frontends = 'shell-app','admin-app','enroll-app'

Write-Host "`n=== 1/4  Installing dependencies ===" -ForegroundColor Cyan
Push-Location "$root\db"; npm install; Pop-Location
foreach ($b in $backends)  { Write-Host "  backend/$b";  Push-Location "$root\backend\$b";  npm install; Pop-Location }
foreach ($f in $frontends) { Write-Host "  frontend/$f"; Push-Location "$root\frontend\$f"; npm install; Pop-Location }

Write-Host "`n=== 2/4  Creating database + tables ===" -ForegroundColor Cyan
Push-Location "$root\db"; node migrate.js; Pop-Location

Write-Host "`n=== 3/4  Seeding data ===" -ForegroundColor Cyan
Push-Location "$root\db"; node seed.js; node seed_rbac.js; Pop-Location

Write-Host "`n=== 4/4  Building frontends (needed for Module Federation) ===" -ForegroundColor Cyan
foreach ($f in $frontends) { Write-Host "  building $f"; Push-Location "$root\frontend\$f"; npm run build; Pop-Location }

Write-Host "`nSetup complete. Now run:  .\start.ps1" -ForegroundColor Green
