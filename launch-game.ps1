$ErrorActionPreference = 'Stop'

$root     = 'C:\Users\belfry\workspaceRE\mc-anime'
$mc       = Join-Path $root 'game\.minecraft'
$java     = Join-Path $root 'jdk\jdk-17.0.21+9\bin\javaw.exe'
$natives  = Join-Path $mc 'natives'
$forgeVer = '1.20.1-forge-47.4.29'

function Test-Allowed($lib) {
    if (-not $lib.rules) { return $true }
    $allow = $false
    foreach ($r in $lib.rules) {
        $ok = $true
        if ($r.os -and $r.os.name -and $r.os.name -ne 'windows') { $ok = $false }
        if ($r.features) { $ok = $false }
        if ($ok) {
            if ($r.action -eq 'disallow') { return $false }
            if ($r.action -eq 'allow') { $allow = $true }
        }
    }
    return $allow
}

function Expand-Args($list, $map) {
    $out = New-Object System.Collections.Generic.List[string]
    foreach ($a in $list) {
        if ($a -is [string]) {
            $s = $a
        } elseif ($a.value) {
            if (-not (Test-Allowed $a)) { continue }
            $s = ($a.value -join ' ')
        } else { continue }
        foreach ($k in $map.Keys) { $s = $s.Replace('${' + $k + '}', [string]$map[$k]) }
        if ($s -match '\$\{') { continue }
        $out.Add($s)
    }
    return $out
}

$vanilla = Get-Content (Join-Path $mc 'versions\1.20.1\1.20.1.json') -Raw | ConvertFrom-Json
$forge   = Get-Content (Join-Path $mc "versions\$forgeVer\$forgeVer.json") -Raw | ConvertFrom-Json
$libRoot = Join-Path $mc 'libraries'

$libs = New-Object System.Collections.Generic.List[string]
foreach ($l in $vanilla.libraries) {
    if (-not (Test-Allowed $l)) { continue }
    if ($l.downloads -and $l.downloads.artifact -and $l.downloads.artifact.path) {
        $libs.Add((Join-Path $libRoot $l.downloads.artifact.path))
    }
    if ($l.natives -and $l.natives.windows) {
        $nkey = $l.natives.windows
        $jar = $l.downloads.classifiers.$nkey.path
        if ($jar) {
            $jarPath = Join-Path $libRoot $jar
            if (Test-Path $jarPath) {
                Add-Type -AssemblyName System.IO.Compression.FileSystem
                $zip = [System.IO.Compression.ZipFile]::OpenRead($jarPath)
                foreach ($e in $zip.Entries) {
                    if ($e.Name -eq '') { continue }
                    $dest = Join-Path $natives $e.Name
                    if (-not (Test-Path $dest)) { [System.IO.Compression.ZipFileExtensions]::ExtractToFile($e, $dest, $true) }
                }
                $zip.Dispose()
            }
        }
    }
}
foreach ($l in $forge.libraries) {
    if (-not (Test-Allowed $l)) { continue }
    if ($l.downloads -and $l.downloads.artifact -and $l.downloads.artifact.path) {
        $libs.Add((Join-Path $libRoot $l.downloads.artifact.path))
    }
}

$cpEntries = @((Join-Path $mc 'libraries\net\minecraft\client\1.20.1-20230612.114412\client-1.20.1-20230612.114412-extra.jar'))
$cpEntries += $libs
$cp = $cpEntries -join ';'

$map = @{
    'auth_player_name'    = 'Belfry'
    'version_name'        = $forgeVer
    'game_directory'      = $mc
    'assets_root'         = (Join-Path $mc 'assets')
    'assets_index_name'   = '5'
    'auth_uuid'           = '00000000000000000000000000000000'
    'auth_access_token'   = '0'
    'clientid'            = ''
    'auth_xuid'           = ''
    'user_type'           = 'legacy'
    'version_type'        = 'release'
    'natives_directory'   = $natives
    'launcher_name'       = 'PCL'
    'launcher_version'    = '9.3'
    'classpath'           = $cp
    'library_directory'   = $libRoot
    'classpath_separator' = ';'
}

$jvmArgs  = @(Expand-Args $vanilla.arguments.jvm $map)
$jvmArgs += @(Expand-Args $forge.arguments.jvm $map)
$gameArgs = @(Expand-Args $vanilla.arguments.game $map)
$gameArgs += @(Expand-Args $forge.arguments.game $map)

$cmdArgs = New-Object System.Collections.Generic.List[string]
$cmdArgs.Add('-Xms1G'); $cmdArgs.Add('-Xmx4G'); $cmdArgs.Add('-XX:+UseG1GC')
$cmdArgs.Add('--add-opens=java.base/java.util=ALL-UNNAMED')
$cmdArgs.Add('--add-opens=java.base/java.util=rhino')
$cmdArgs.Add('--add-opens=java.base/java.util.concurrent=ALL-UNNAMED')
foreach ($x in $jvmArgs) { $cmdArgs.Add($x) }
$cmdArgs.Add($forge.mainClass)
foreach ($x in $gameArgs) { $cmdArgs.Add($x) }
$cmdArgs.Add('--width'); $cmdArgs.Add('1280')
$cmdArgs.Add('--height'); $cmdArgs.Add('720')

Get-CimInstance Win32_Process -Filter "Name='java.exe'" | ForEach-Object {
    $cl = $_.CommandLine
    if ($cl -and ($cl -match 'BootstrapLauncher|1\.20\.1-forge|forge.*win_args')) {
        Write-Host "stopping old java $($_.ProcessId)"
        Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
    }
}

$quoted = foreach ($a in $cmdArgs) {
    if ($a -match '\s') { '"' + $a + '"' } else { $a }
}
$argLine = $quoted -join ' '

$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = $java
$psi.Arguments = $argLine
$psi.WorkingDirectory = $mc
$psi.UseShellExecute = $true
$psi.WindowStyle = 'Normal'
$p = [System.Diagnostics.Process]::Start($psi)
Write-Host "started pid $($p.Id) args $($cmdArgs.Count)"

