# Downloads the pinned PocketBase release into server/bin and verifies its checksum.
$ErrorActionPreference = 'Stop'
$version = '0.40.6'
$name = "pocketbase_${version}_windows_amd64.zip"
$base = "https://github.com/pocketbase/pocketbase/releases/download/v$version"
$bin = Join-Path $PSScriptRoot 'bin'
$zip = Join-Path $env:TEMP $name

New-Item -ItemType Directory -Force $bin | Out-Null
$sums = Join-Path $env:TEMP 'pocketbase_checksums.txt'
Invoke-WebRequest "$base/$name" -OutFile $zip -UseBasicParsing
Invoke-WebRequest "$base/checksums.txt" -OutFile $sums -UseBasicParsing
$expected = (Get-Content $sums | Where-Object { $_ -match [regex]::Escape($name) }) -replace '\s.*$', ''
Remove-Item $sums
$actual = (Get-FileHash $zip -Algorithm SHA256).Hash.ToLower()
if ($actual -ne $expected) { throw "Checksum mismatch for ${name}: $actual != $expected" }

Expand-Archive $zip -DestinationPath $bin -Force
Remove-Item $zip
& (Join-Path $bin 'pocketbase.exe') --version
