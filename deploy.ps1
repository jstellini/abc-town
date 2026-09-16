# Deploy ABC Town to Netlify (site: abctown.netlify.app).
#
#   powershell -ExecutionPolicy Bypass -File deploy.ps1
#
# Needs a Netlify personal access token, read from (first found):
#   1. the NETLIFY_AUTH_TOKEN environment variable
#   2. the file  %USERPROFILE%\.netlify-token  (one line, just the token)
# Create one at https://app.netlify.com/user/applications#personal-access-tokens

param([string]$Site = "abctown.netlify.app")

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot

# --- token ---
$token = $env:NETLIFY_AUTH_TOKEN
$tokenFile = Join-Path $env:USERPROFILE ".netlify-token"
if (-not $token -and (Test-Path $tokenFile)) { $token = (Get-Content $tokenFile -Raw).Trim() }
if (-not $token) { Write-Host "No Netlify token. Set NETLIFY_AUTH_TOKEN or create $tokenFile" -ForegroundColor Red; exit 1 }

# --- build the upload folder: only what the game needs at runtime ---
$deploy = Join-Path $root "deploy"
$zip = Join-Path $root "abc-town-site.zip"
if (Test-Path $deploy) { Remove-Item -Recurse -Force $deploy }
if (Test-Path $zip) { Remove-Item -Force $zip }
foreach ($d in 'css', 'js', 'assets\characters', 'assets\voice') { New-Item -ItemType Directory -Force (Join-Path $deploy $d) | Out-Null }
Copy-Item (Join-Path $root 'index.html') $deploy
Copy-Item (Join-Path $root 'css\*') (Join-Path $deploy 'css')
Copy-Item (Join-Path $root 'js\*') (Join-Path $deploy 'js')
Copy-Item (Join-Path $root 'assets\characters\*.svg') (Join-Path $deploy 'assets\characters')
Copy-Item (Join-Path $root 'assets\voice\*') (Join-Path $deploy 'assets\voice')
# Build the zip by hand: Compress-Archive writes backslash entry names, which Netlify reads as flat filenames.
Add-Type -AssemblyName System.IO.Compression, System.IO.Compression.FileSystem
$archive = [System.IO.Compression.ZipFile]::Open($zip, [System.IO.Compression.ZipArchiveMode]::Create)
foreach ($f in Get-ChildItem $deploy -Recurse -File) {
  $name = $f.FullName.Substring($deploy.Length + 1).Replace('\', '/')
  [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive, $f.FullName, $name) | Out-Null
}
$archive.Dispose()
$files = (Get-ChildItem $deploy -Recurse -File).Count
$mb = [Math]::Round((Get-Item $zip).Length / 1MB, 1)
Write-Host "Built deploy folder: $files files, $mb MB zipped"

# --- upload ---
Write-Host "Uploading to $Site ..."
$headers = @{ Authorization = "Bearer $token"; 'Content-Type' = 'application/zip' }
$res = Invoke-RestMethod -Method Post -Uri "https://api.netlify.com/api/v1/sites/$Site/deploys" -Headers $headers -InFile $zip

# --- wait until it's live ---
$id = $res.id
for ($i = 0; $i -lt 60; $i++) {
  Start-Sleep -Seconds 3
  $d = Invoke-RestMethod -Uri "https://api.netlify.com/api/v1/deploys/$id" -Headers @{ Authorization = "Bearer $token" }
  if ($d.state -eq 'ready') { Write-Host "Live at $($d.ssl_url)  (deploy $id)" -ForegroundColor Green; exit 0 }
  if ($d.state -eq 'error') { Write-Host "Deploy failed: $($d.error_message)" -ForegroundColor Red; exit 1 }
}
Write-Host "Uploaded (deploy $id) but still processing - check the Deploys tab." -ForegroundColor Yellow
