# Keeps the school schedule server running on the server PC: registers PocketBase
# (and optionally the Caddy HTTPS front) as scheduled tasks that start at boot
# before anyone logs in, and opens the ports on the Windows firewall.
#
# Run in an elevated PowerShell on the server PC:
#   .\server\install-service.ps1                     # http://<server ip>:8090 only
#   .\server\install-service.ps1 -WithHttps          # also start Caddy (see get-caddy.ps1)
#   .\server\install-service.ps1 -Uninstall          # remove tasks and firewall rules
#
# The tasks run as SYSTEM, restart if the process dies, and survive reboots.
# Data stays in server\pb_data next to this script, so keep the repo folder on the
# server PC (do not run it from a network share).
param(
    [switch] $WithHttps,
    [switch] $Uninstall,
    [int] $Port = 8090
)
$ErrorActionPreference = 'Stop'

$pbTask = 'SchoolSchedule-Server'
$caddyTask = 'SchoolSchedule-Https'
$pbRule = 'School schedule server (PocketBase)'
$caddyRule = 'School schedule server (HTTPS)'

if (-not ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
        [Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw 'Run this script in an elevated PowerShell (right-click > Run as administrator).'
}

function Remove-TaskIfPresent([string] $name) {
    $existing = Get-ScheduledTask -TaskName $name -ErrorAction SilentlyContinue
    if ($existing) { Unregister-ScheduledTask -TaskName $name -Confirm:$false; "Removed task $name" }
}
function Remove-RuleIfPresent([string] $name) {
    $existing = Get-NetFirewallRule -DisplayName $name -ErrorAction SilentlyContinue
    if ($existing) { Remove-NetFirewallRule -DisplayName $name; "Removed firewall rule $name" }
}

if ($Uninstall) {
    Remove-TaskIfPresent $pbTask
    Remove-TaskIfPresent $caddyTask
    Remove-RuleIfPresent $pbRule
    Remove-RuleIfPresent $caddyRule
    'Uninstalled. The data in server\pb_data is untouched.'
    return
}

$pb = Join-Path $PSScriptRoot 'bin\pocketbase.exe'
if (-not (Test-Path $pb)) { throw "PocketBase not found: $pb (run .\server\get-pocketbase.ps1 first)" }

# Registers one always-on task: start at boot as SYSTEM, no time limit, restart on failure.
function Register-BootTask([string] $name, [string] $exe, [string] $arguments, [string] $workDir) {
    Remove-TaskIfPresent $name | Out-Null
    $action = New-ScheduledTaskAction -Execute $exe -Argument $arguments -WorkingDirectory $workDir
    $trigger = New-ScheduledTaskTrigger -AtStartup
    $principal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest
    $settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -AllowStartIfOnBatteries `
        -DontStopIfGoingOnBatteries -StartWhenAvailable -RestartInterval (New-TimeSpan -Minutes 1) -RestartCount 10
    $settings.ExecutionTimeLimit = 'PT0S'   # never kill it for running long
    $settings.DisallowStartIfOnBatteries = $false
    Register-ScheduledTask -TaskName $name -Action $action -Trigger $trigger -Principal $principal `
        -Settings $settings -Description 'School schedule widget server' | Out-Null
    Start-ScheduledTask -TaskName $name
    "Registered and started task $name"
}

$pbArgs = "serve --http 0.0.0.0:$Port --dir `"$(Join-Path $PSScriptRoot 'pb_data')`"" +
          " --migrationsDir `"$(Join-Path $PSScriptRoot 'pb_migrations')`"" +
          " --hooksDir `"$(Join-Path $PSScriptRoot 'pb_hooks')`"" +
          " --publicDir `"$(Join-Path $PSScriptRoot 'pb_public')`""
Register-BootTask $pbTask $pb $pbArgs $PSScriptRoot

Remove-RuleIfPresent $pbRule | Out-Null
New-NetFirewallRule -DisplayName $pbRule -Direction Inbound -Protocol TCP -LocalPort $Port `
    -Action Allow -Profile Domain,Private | Out-Null
"Opened TCP $Port for the domain and private networks"

if ($WithHttps) {
    $caddy = Join-Path $PSScriptRoot 'bin\caddy.exe'
    $caddyfile = Join-Path $PSScriptRoot 'Caddyfile'
    if (-not (Test-Path $caddy)) { throw "Caddy not found: $caddy (run .\server\get-caddy.ps1 first)" }
    Register-BootTask $caddyTask $caddy "run --config `"$caddyfile`"" $PSScriptRoot
    Remove-RuleIfPresent $caddyRule | Out-Null
    New-NetFirewallRule -DisplayName $caddyRule -Direction Inbound -Protocol TCP -LocalPort 443 `
        -Action Allow -Profile Domain,Private | Out-Null
    'Opened TCP 443 for the domain and private networks'
}

''
'Check: Get-ScheduledTask SchoolSchedule-* | Get-ScheduledTaskInfo'
"Then open http://$(hostname):$Port/_/ from another PC on the school network."
