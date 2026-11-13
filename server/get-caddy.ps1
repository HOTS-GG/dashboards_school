# Downloads Caddy into server/bin (checksum verified) and points it at the server's
# own name, so the widget can reach the server over HTTPS. The widget's automatic
# updater only accepts https:// addresses.
#
#   .\server\get-caddy.ps1 -Hostname school-schedule.chunchon.gwe.hs.kr
#
# -Hostname is the name teachers' PCs use for the server PC. With a school DNS name
# and a real certificate, Caddy gets one automatically if the server is reachable
# from the internet on 80/443; on an internal-only network it issues one from its
# own local CA, and that CA's root certificate has to be installed on every
# teacher's PC (see docs/deploy.md).
param(
    [Parameter(Mandatory)] [string] $Hostname,
    [string] $Version = '2.10.0'
)
$ErrorActionPreference = 'Stop'
$name = "caddy_${Version}_windows_amd64.zip"
$base = "https://github.com/caddyserver/caddy/releases/download/v$Version"
$bin = Join-Path $PSScriptRoot 'bin'
$zip = Join-Path $env:TEMP $name
$sums = Join-Path $env:TEMP "caddy_${Version}_checksums.txt"

New-Item -ItemType Directory -Force $bin | Out-Null
Invoke-WebRequest "$base/$name" -OutFile $zip -UseBasicParsing
Invoke-WebRequest "$base/caddy_${Version}_checksums.txt" -OutFile $sums -UseBasicParsing
$expected = (Get-Content $sums | Where-Object { $_ -match [regex]::Escape($name) }) -replace '\s.*$', ''
Remove-Item $sums
$actual = (Get-FileHash $zip -Algorithm SHA256).Hash.ToLower()
if ($actual -ne $expected) { throw "Checksum mismatch for ${name}: $actual != $expected" }

Expand-Archive $zip -DestinationPath $bin -Force
Remove-Item $zip

# The Caddyfile reads this; set it for the whole machine so the SYSTEM task sees it too.
[Environment]::SetEnvironmentVariable('SCHOOL_SERVER_HOST', $Hostname, 'Machine')
$env:SCHOOL_SERVER_HOST = $Hostname

& (Join-Path $bin 'caddy.exe') version
"SCHOOL_SERVER_HOST = $Hostname (machine environment variable)"
'Next: .\server\install-service.ps1 -WithHttps'
