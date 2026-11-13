# Backs up the schedule server: asks PocketBase for a consistent backup (safe while
# it is running), copies it to a second location, and keeps only the newest few.
#
# First, save the superuser password once for the account that runs the task
# (encrypted with Windows DPAPI, readable only by that account on that PC):
#   .\server\backup.ps1 -SaveCredential -Email <superuser email>
#
# Then run it by hand, or register a daily 23:00 task (elevated PowerShell):
#   .\server\backup.ps1 -CopyTo D:\backup\school-schedule
#   .\server\backup.ps1 -Register -CopyTo \nas\backup\school-schedule
#
# Keep -CopyTo on another disk or machine: a backup on the same disk dies with it.
param(
    [string] $ServerUrl = 'http://127.0.0.1:8090',
    [string] $CopyTo,
    [int] $Keep = 7,
    [string] $Email,
    [switch] $SaveCredential,
    [switch] $Register,
    [string] $At = '23:00'
)
$ErrorActionPreference = 'Stop'
$credFile = Join-Path $PSScriptRoot 'pb_data\backup-credential.xml'   # pb_data is git-ignored

if ($SaveCredential) {
    if (-not $Email) { throw 'Pass -Email <superuser email> with -SaveCredential.' }
    $password = Read-Host "Password for $Email" -AsSecureString
    New-Item -ItemType Directory -Force (Split-Path $credFile) | Out-Null
    [pscustomobject]@{ Email = $Email; Password = (ConvertFrom-SecureString $password) } |
        Export-Clixml $credFile
    "Saved to $credFile (only the Windows account that saved it can read it)."
    "If the daily task runs as SYSTEM, save it again from an elevated SYSTEM shell, or run the task as this account."
    return
}

if ($Register) {
    if (-not ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
            [Security.Principal.WindowsBuiltInRole]::Administrator)) {
        throw 'Registering the task needs an elevated PowerShell.'
    }
    if (-not $CopyTo) { throw 'Pass -CopyTo <folder> so the task knows where to copy backups.' }
    $name = 'SchoolSchedule-Backup'
    $self = $PSCommandPath
    $arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$self`" -ServerUrl `"$ServerUrl`" -CopyTo `"$CopyTo`" -Keep $Keep"
    if (Get-ScheduledTask -TaskName $name -ErrorAction SilentlyContinue) {
        Unregister-ScheduledTask -TaskName $name -Confirm:$false
    }
    $action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $arguments -WorkingDirectory $PSScriptRoot
    $trigger = New-ScheduledTaskTrigger -Daily -At $At
    # Runs as the current account (so it can read the DPAPI credential and reach \nas shares),
    # whether or not that account is logged in.
    $principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType S4U -RunLevel Highest
    $settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew
    Register-ScheduledTask -TaskName $name -Action $action -Trigger $trigger -Principal $principal `
        -Settings $settings -Description 'Daily backup of the school schedule server' | Out-Null
    "Registered task $name (daily at $At, as $env:USERDOMAIN\$env:USERNAME)."
    'Run it once now to check: Start-ScheduledTask SchoolSchedule-Backup'
    return
}

if (-not (Test-Path $credFile)) { throw "No saved credential. Run: .\server\backup.ps1 -SaveCredential -Email <superuser email>" }
$cred = Import-Clixml $credFile
$plain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR((ConvertTo-SecureString $cred.Password)))

$base = $ServerUrl.TrimEnd('/')
$auth = Invoke-RestMethod "$base/api/collections/_superusers/auth-with-password" -Method Post `
    -ContentType 'application/json' -Body (@{ identity = $cred.Email; password = $plain } | ConvertTo-Json)
$headers = @{ Authorization = $auth.token }

$name = "school-schedule-$(Get-Date -Format 'yyyyMMdd-HHmmss').zip"
Invoke-RestMethod "$base/api/backups" -Method Post -Headers $headers `
    -ContentType 'application/json' -Body (@{ name = $name } | ConvertTo-Json) | Out-Null
"Server wrote backup $name"

$local = Join-Path $PSScriptRoot 'pb_data\backups'
$file = Join-Path $local $name
if (-not (Test-Path $file)) { throw "Backup not found on disk: $file" }

if ($CopyTo) {
    New-Item -ItemType Directory -Force $CopyTo | Out-Null
    Copy-Item $file $CopyTo -Force
    $copy = Join-Path $CopyTo $name
    if ((Get-FileHash $file).Hash -ne (Get-FileHash $copy).Hash) { throw "Copy does not match the original: $copy" }
    "Copied to $copy ($([math]::Round((Get-Item $copy).Length / 1MB, 1)) MB)"
    Get-ChildItem $CopyTo -Filter 'school-schedule-*.zip' | Sort-Object Name -Descending |
        Select-Object -Skip $Keep | ForEach-Object { Remove-Item $_.FullName; "Removed old copy $($_.Name)" }
}

# PocketBase keeps every backup it makes; drop the oldest so the server disk doesn't fill up.
Get-ChildItem $local -Filter 'school-schedule-*.zip' | Sort-Object Name -Descending |
    Select-Object -Skip $Keep | ForEach-Object { Remove-Item $_.FullName; "Removed old backup $($_.Name)" }
