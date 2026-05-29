# Быстрая проверка API после npm start (нужен запущенный сервер)
$base = "http://localhost:4000"

Write-Host "1) Health" -ForegroundColor Cyan
try {
  $h = Invoke-RestMethod "$base/health"
  Write-Host "   OK:" $h.ok
} catch { Write-Host "   FAIL:" $_.Exception.Message -ForegroundColor Red }

Write-Host "`n2) Register test user" -ForegroundColor Cyan
$regBody = @{
  username = "smoke_test_user"
  password = "SmokeTest9"
  firstName = "Smoke"
  lastName = "Test"
  birthDate = "2000-05-15"
  gender = "male"
} | ConvertTo-Json -Compress

try {
  $reg = Invoke-RestMethod "$base/api/auth/register" -Method POST -ContentType "application/json" -Body $regBody
  $global:token = $reg.token
  Write-Host "   OK: user registered, token received"
} catch {
  Write-Host "   FAIL (maybe user exists):" $_.Exception.Message -ForegroundColor Yellow
  $loginBody = @{ username = "smoke_test_user"; password = "SmokeTest9" } | ConvertTo-Json
  $login = Invoke-RestMethod "$base/api/auth/login" -Method POST -ContentType "application/json" -Body $loginBody
  $global:token = $login.token
  Write-Host "   OK: login OK"
}

if ($global:token) {
  $headers = @{ Authorization = "Bearer $global:token" }

  Write-Host "`n3) Training plans (auth)" -ForegroundColor Cyan
  $plans = Invoke-RestMethod "$base/api/training/plans" -Headers $headers
  Write-Host "   Plans count:" $plans.plans.Count

  Write-Host "`n4) Training analytics (auth)" -ForegroundColor Cyan
  $analytics = Invoke-RestMethod "$base/api/training/analytics" -Headers $headers
  Write-Host "   Exercises in analytics:" $analytics.exercises.Count

  Write-Host "`n5) Training stats (auth)" -ForegroundColor Cyan
  $stats = Invoke-RestMethod "$base/api/training/stats" -Headers $headers
  Write-Host "   Stats:" ($stats.stats | ConvertTo-Json -Compress)
}

Write-Host "`nDone." -ForegroundColor Green
