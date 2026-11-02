# Run on a Russian connection WITH VPN OFF. No API keys or passwords are sent.
# Usage from repository root:
#   powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\check-russia-connectivity.ps1
$ErrorActionPreference = "Continue"
$targets = @(
  @("Frontend HTML", "https://petcare-frontend-rosy.vercel.app/"),
  @("Backend health", "https://petcare-api-brown.vercel.app/health"),
  @("Public products", "https://petcare-api-brown.vercel.app/api/store/products"),
  @("Protected pets (401 is expected)", "https://petcare-api-brown.vercel.app/api/me/pets"),
  @("Firebase Auth API (HTTP 404/403 is reachable)", "https://identitytoolkit.googleapis.com/"),
  @("Firebase session token API (HTTP 404/403 is reachable)", "https://securetoken.googleapis.com/"),
  @("Firebase App Check API (HTTP 404/403 is reachable)", "https://firebaseappcheck.googleapis.com/"),
  @("reCAPTCHA Enterprise script", "https://www.google.com/recaptcha/enterprise.js"),
  @("2GIS catalog (HTTP 403/404 is reachable)", "https://catalog.api.2gis.com/3.0/items")
)

Write-Host "PetCare connectivity check (run WITHOUT VPN)" -ForegroundColor Cyan
Write-Host "Network: $([DateTimeOffset]::Now.ToString('o'))"
Write-Host "HTTP 401, 403, 404 still prove the remote server was reached."
Write-Host "HTTP 000, TLS errors, curl 6/7/28/35/60 indicate transport problems."
Write-Host "Do not paste cookies, Authorization tokens, or Firebase credentials."
Write-Host ""
foreach ($target in $targets) {
  $name = $target[0]
  $url = $target[1]
  Write-Host "--- $name ---"
  $result = & curl.exe --noproxy "*" --silent --show-error --location --connect-timeout 7 --max-time 17 --output NUL --write-out "HTTP=%{http_code} REMOTE_IP=%{remote_ip} SECONDS=%{time_total}" $url 2>&1
  $status = $LASTEXITCODE
  Write-Host "exit=$status $($result -join ' ')"
  Write-Host ""
}
Write-Host "Note: a successful base page with a blocked API or Google endpoint can still produce a blank/loading UI."
