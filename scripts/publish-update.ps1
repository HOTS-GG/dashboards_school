# Builds the signed widget installer and publishes it as an automatic update
# on the school server (server/pb_public/updates/, served at <server>/updates/).
#
#   .\scripts\publish-update.ps1 -ServerUrl http://192.168.0.10:8090 [-Notes "변경 내용"]
#
# Bump "version" in desktop/src-tauri/tauri.conf.json first; widgets only update
# to a higher version. The signing key lives outside the repo
# (%USERPROFILE%\.tauri\school-schedule.key) — back it up: without it, installed
# widgets can't receive updates.
param(
    [Parameter(Mandatory)] [string] $ServerUrl,
    [string] $Notes = "",
    [string] $KeyPath = (Join-Path $env:USERPROFILE '.tauri\school-schedule.key')
)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$desktop = Join-Path $root 'desktop'
if (-not (Test-Path $KeyPath)) { throw "Signing key not found: $KeyPath" }

$env:TAURI_SIGNING_PRIVATE_KEY = Get-Content $KeyPath -Raw
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = ''
Push-Location $desktop
# Through cmd: Windows PowerShell 5.1 would turn the build's progress output on stderr into errors.
try { cmd /c "npm run tauri build 2>&1"; if ($LASTEXITCODE) { throw "build failed" } } finally { Pop-Location }

$conf = Get-Content (Join-Path $desktop 'src-tauri\tauri.conf.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$nsis = Join-Path $desktop 'src-tauri\target\release\bundle\nsis'
$installer = Get-ChildItem $nsis -Filter "*_$($conf.version)_x64-setup.exe" | Select-Object -First 1
if (-not $installer) { throw "Installer for version $($conf.version) not found in $nsis" }
$signature = Get-Content "$($installer.FullName).sig" -Raw

$out = Join-Path $root 'server\pb_public\updates'
New-Item -ItemType Directory -Force $out | Out-Null
Copy-Item $installer.FullName $out -Force
$manifest = [ordered]@{
    version   = $conf.version
    notes     = $Notes
    pub_date  = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
    platforms = @{
        'windows-x86_64' = @{
            signature = $signature.Trim()
            url       = "$($ServerUrl.TrimEnd('/'))/updates/$($installer.Name)"
        }
    }
}
$json = $manifest | ConvertTo-Json -Depth 5
[System.IO.File]::WriteAllText((Join-Path $out 'latest.json'), $json, (New-Object System.Text.UTF8Encoding $false))
"Published $($installer.Name) as version $($conf.version) -> $out"
