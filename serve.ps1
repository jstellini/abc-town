# Tiny static web server for ABC Town (no Node/Python needed).
#
#   Right-click > "Run with PowerShell", or from a terminal:
#     powershell -ExecutionPolicy Bypass -File serve.ps1
#
# Then open the URL it prints on this PC, or on the iPad (same Wi-Fi).
# To make the iPad able to connect, run it once as Administrator – it registers
# the port for LAN use. Without admin it still works on this PC (localhost).

param([int]$Port = 8000)

$root = $PSScriptRoot
$mime = @{
  '.html'='text/html; charset=utf-8'; '.css'='text/css; charset=utf-8'; '.js'='text/javascript; charset=utf-8'
  '.png'='image/png'; '.jpg'='image/jpeg'; '.jpeg'='image/jpeg'; '.gif'='image/gif'; '.svg'='image/svg+xml'
  '.json'='application/json'; '.ico'='image/x-icon'; '.webmanifest'='application/manifest+json'; '.mp3'='audio/mpeg'; '.wav'='audio/wav'
}

$listener = New-Object System.Net.HttpListener
$lan = $true
try {
  $listener.Prefixes.Add("http://+:$Port/")
  $listener.Start()
} catch {
  $lan = $false
  $listener = New-Object System.Net.HttpListener
  $listener.Prefixes.Add("http://localhost:$Port/")
  $listener.Start()
}

Write-Host ""
Write-Host "  ABC Town is running!" -ForegroundColor Green
Write-Host "  On this PC:   http://localhost:$Port/"
if ($lan) {
  $ips = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' } | Select-Object -ExpandProperty IPAddress
  foreach ($ip in $ips) { Write-Host "  On the iPad:  http://$ip`:$Port/" -ForegroundColor Cyan }
  Write-Host "  (If the iPad can't connect, allow the port through Windows Firewall when prompted.)"
} else {
  Write-Host "  iPad access needs a one-off admin run: right-click PowerShell > Run as administrator, then run this script again." -ForegroundColor Yellow
}
Write-Host "  Press Ctrl+C to stop."
Write-Host ""

while ($listener.IsListening) {
  try {
    $ctx = $listener.GetContext()
    $path = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath)
    if ($path -eq '/') { $path = '/index.html' }
    $file = Join-Path $root ($path -replace '/', '\')
    $res = $ctx.Response
    if ((Test-Path $file -PathType Leaf) -and ([IO.Path]::GetFullPath($file)).StartsWith($root)) {
      $ext = [IO.Path]::GetExtension($file).ToLower()
      $res.ContentType = if ($mime[$ext]) { $mime[$ext] } else { 'application/octet-stream' }
      $res.Headers['Cache-Control'] = 'no-cache'
      $bytes = [IO.File]::ReadAllBytes($file)
      $res.ContentLength64 = $bytes.Length
      $res.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      $res.StatusCode = 404
      $bytes = [Text.Encoding]::UTF8.GetBytes("Not found: $path")
      $res.OutputStream.Write($bytes, 0, $bytes.Length)
    }
    $res.Close()
  } catch { }
}
