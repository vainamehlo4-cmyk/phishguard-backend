# Check network connectivity and ports

Write-Host "=== LOCAL MACHINE IP ADDRESSES ===" -ForegroundColor Cyan
ipconfig | Select-String "IPv4" | ForEach-Object { Write-Host $_ }

Write-Host "`n=== CHECKING IF PORTS ARE LISTENING ===" -ForegroundColor Cyan
$ports = @(4000, 5173)
foreach ($port in $ports) {
  $listening = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
  if ($listening) {
    Write-Host "✅ Port $port is LISTENING" -ForegroundColor Green
    Write-Host "   Process: $($listening.OwningProcess)" -ForegroundColor Green
  } else {
    Write-Host "❌ Port $port is NOT listening" -ForegroundColor Red
  }
}

Write-Host "`n=== TESTING LOCALHOST ACCESS ===" -ForegroundColor Cyan
$urls = @("http://localhost:4000/api/healthz", "http://localhost:5173")
foreach ($url in $urls) {
  try {
    $response = Invoke-WebRequest -Uri $url -TimeoutSec 2 -ErrorAction Stop
    Write-Host "✅ $url - OK (HTTP $($response.StatusCode))" -ForegroundColor Green
  } catch {
    Write-Host "❌ $url - FAILED ($($_.Exception.Message))" -ForegroundColor Red
  }
}

Write-Host "`n=== FIREWALL STATUS ===" -ForegroundColor Cyan
$fwStatus = Get-NetFirewallProfile -ErrorAction SilentlyContinue | Where-Object { $_.Enabled -eq $true }
if ($fwStatus) {
  Write-Host "⚠️  Windows Firewall is ENABLED" -ForegroundColor Yellow
  Write-Host "   You may need to allow ports 4000 and 5173 through the firewall"
  Write-Host "   Run as Admin: netsh advfirewall firewall add rule name='PhishGuard Backend' dir=in action=allow protocol=tcp localport=4000"
  Write-Host "   Run as Admin: netsh advfirewall firewall add rule name='PhishGuard Frontend' dir=in action=allow protocol=tcp localport=5173"
} else {
  Write-Host "✅ Windows Firewall is DISABLED" -ForegroundColor Green
}

Write-Host "`n=== INSTRUCTIONS ===" -ForegroundColor Cyan
Write-Host "1. Copy your IPv4 address from above (e.g., 192.168.1.42)"
Write-Host "2. From another device on same network, try:"
Write-Host "   - Backend: http://192.168.x.x:4000/api/healthz"
Write-Host "   - Frontend: http://192.168.x.x:5173"
Write-Host "3. If still not working, check firewall rules above"
