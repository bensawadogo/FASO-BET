# FasoBet codebase health check
# Run with: powershell -ExecutionPolicy Bypass -File scripts/check_codebase.ps1

Write-Host "=== FasoBet Codebase Check ===" -ForegroundColor Cyan

# 1. Count FastAPI app instances (must be exactly 1)
$fastapiCount = (
  Get-ChildItem -Path "api" -Filter "*.py" -Recurse |
  Select-String -Pattern "app = FastAPI\(" |
  Measure-Object
).Count
$status = if ($fastapiCount -eq 1) {"✅"} else {"❌"}
Write-Host "$status FastAPI instances: $fastapiCount (expected: 1)"

# 2. Find rogue servers in scrapers
$rogueServers = Get-ChildItem -Path "api/data_sources" -Filter "*.py" -Recurse |
  Select-String -Pattern "uvicorn\.run|app\.run\(" |
  Select-Object Filename, LineNumber, Line
if ($rogueServers.Count -eq 0) {
  Write-Host "✅ No rogue servers in scrapers"
} else {
  Write-Host "❌ Rogue servers found:"
  $rogueServers | ForEach-Object {
    Write-Host "   $($_.Filename):$($_.LineNumber) → $($_.Line.Trim())"
  }
}

# 3. Find console.log in TypeScript
$consoleLogs = (
  Get-ChildItem -Path "src" -Include "*.ts","*.tsx" -Recurse |
  Select-String -Pattern "console\." |
  Measure-Object
).Count
$status = if ($consoleLogs -eq 0) {"✅"} else {"⚠️"}
Write-Host "$status console.log found: $consoleLogs (expected: 0)"

# 4. Find direct fetch() in components
$directFetch = (
  Get-ChildItem -Path "src/components","src/app" -Include "*.tsx" -Recurse |
  Select-String -Pattern "fetch\(" |
  Measure-Object
).Count
$status = if ($directFetch -eq 0) {"✅"} else {"❌"}
Write-Host "$status Direct fetch() in components: $directFetch (expected: 0)"

# 5. Check dead href="#"
$deadLinks = (
  Get-ChildItem -Path "src" -Include "*.tsx" -Recurse |
  Select-String -Pattern 'href="#"' |
  Measure-Object
).Count
$status = if ($deadLinks -eq 0) {"✅"} else {"⚠️"}
Write-Host "$status Dead href='#': $deadLinks (expected: 0)"

# 6. Check fasobet_core importable
# Rust check removed

# 7. Check logos downloaded
$logoCount = (
  Get-ChildItem -Path "src/public/logos/teams" -Filter "*.png" |
  Measure-Object
).Count
$status = if ($logoCount -gt 0) {"✅"} else {"⚠️"}
Write-Host "$status Team logos: $logoCount files"

Write-Host ""
Write-Host "=== TypeScript Check ===" -ForegroundColor Cyan
npx tsc --noEmit 2>&1 | Select-Object -Last 3

Write-Host ""
Write-Host "=== Done ===" -ForegroundColor Green