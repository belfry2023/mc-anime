$ErrorActionPreference = 'Stop'

$root     = $PSScriptRoot
$mc       = Join-Path $root 'game\.minecraft'
$java     = Join-Path $root 'jdk\jdk-17.0.21+9\bin\javaw.exe'
if ($env:MC_CONSOLE -eq '1') { $java = $java -replace 'javaw\.exe$','java.exe' }
if (-not (Test-Path $java)) { Write-Host ('[错误] 找不到自带的 Java: ' + $java) -ForegroundColor Red; Write-Host '请确认整合包解压完整，或改用 install 版安装器。' -ForegroundColor Yellow; Read-Host '按回车退出'; exit 1 }
# 临时目录：解压/缓存全部放在整合包自己的 tmp 下，不依赖任何本机绝对路径
$tmpDir = Join-Path $root 'tmp'
if (-not (Test-Path $tmpDir)) { New-Item -ItemType Directory -Path $tmpDir -Force | Out-Null }
$env:TMP  = $tmpDir
$env:TEMP = $tmpDir

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


# 安装版：昵称从同目录 username.txt 读取
# 注意：Minecraft 昵称只能是 英文字母/数字/下划线（1~16 个），且每个人必须不同，
#       否则进别人服务器会报「此名称已被占用」（两个人同名）或「Invalid characters」。
$nameFile = Join-Path $root 'username.txt'
$name = ''
if (Test-Path $nameFile) { $name = (Get-Content $nameFile -Raw).Trim() }

if ([string]::IsNullOrWhiteSpace($name)) {
    $guess = $env:USERNAME
    if ([string]::IsNullOrWhiteSpace($guess)) { $guess = 'Player' + (Get-Random -Minimum 1000 -Maximum 9999) }
    $name = $guess
    try { Set-Content -Path $nameFile -Value $name -Encoding UTF8 } catch { }
    Write-Host ('[提示] 没有 username.txt，已用电脑账户名「' + $name + '」作为昵称并写入 username.txt；想改名就编辑它（要和其他人不一样）。') -ForegroundColor Yellow
}

$clean = ($name -replace '[^A-Za-z0-9_]', '')
if ([string]::IsNullOrWhiteSpace($clean)) { $clean = 'Player' + (Get-Random -Minimum 1000 -Maximum 9999) }
if ($clean.Length -gt 16) { $clean = $clean.Substring(0, 16) }
if ($clean -ne $name) {
    Write-Host ('[提示] 昵称「' + $name + '」含非法字符（只能是英文字母/数字/下划线），已改按「' + $clean + '」启动。') -ForegroundColor Yellow
    $name = $clean
}
$mem = '6G'
if (Test-Path (Join-Path $root 'memory.txt')) { $mem = (Get-Content (Join-Path $root 'memory.txt') -Raw).Trim() }

# 规范化内存写法：'4' / '4g' / '4GB' / '4096M' 之类都收敛成 '<n>G'，避免 -Xmx4 这种非法值
$wantGB = 0
try { if ($mem -notmatch '^\s*\d+\s*[mM]') { $wantGB = [int](($mem -replace '[^0-9]', '')) } } catch { $wantGB = 0 }
if ($wantGB -lt 2 -or $wantGB -gt 64) { $wantGB = 4 }
$mem = ($wantGB.ToString() + 'G')

# 按本机物理内存自动收敛 -Xmx，避免 JVM 初始化失败（Initial heap size ... larger than maximum heap size / Could not reserve enough space）
try {
    $ramGB  = [math]::Floor((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1GB)
    $maxGB  = [math]::Max(2, [math]::Floor($ramGB * 0.6))
    if ($wantGB -gt $maxGB) {
        Write-Host ('[提示] 本机内存约 ' + $ramGB + 'G，堆内存自动从 ' + $wantGB + 'G 下调到 ' + $maxGB + 'G') -ForegroundColor Yellow
        $mem = ($maxGB.ToString() + 'G')
    }
} catch { }
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
    'auth_player_name'    = $name
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
$cmdArgs.Add('-Xms1G'); $cmdArgs.Add('-Xmx' + $mem); $cmdArgs.Add('-XX:+UseG1GC')
$cmdArgs.Add('-Djava.io.tmpdir=' + $tmpDir)
$cmdArgs.Add('--add-opens=java.base/java.util=ALL-UNNAMED')
$cmdArgs.Add('--add-opens=java.base/java.util=rhino')
$cmdArgs.Add('--add-opens=java.base/java.util.concurrent=ALL-UNNAMED')
foreach ($x in $jvmArgs) { $cmdArgs.Add($x) }
$cmdArgs.Add($forge.mainClass)
foreach ($x in $gameArgs) { $cmdArgs.Add($x) }
$cmdArgs.Add('--width'); $cmdArgs.Add('1280')
$cmdArgs.Add('--height'); $cmdArgs.Add('720')

# 同目录有 connect.txt 就自动进服（100.x.x.x:25565 这种）
$connectFile = Join-Path $root 'connect.txt'
if (Test-Path $connectFile) {
    $addr = (Get-Content $connectFile -Raw).Trim()
    if ($addr) { $cmdArgs.Add('--quickPlayMultiplayer'); $cmdArgs.Add($addr); Write-Host ('auto connect -> ' + $addr) }
}

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

# ---- 控制台诊断模式：设置环境变量 MC_CONSOLE=1 后运行，用 java.exe 并把输出写到文件 ----
if ($env:MC_CONSOLE -eq '1') {
    $outF = Join-Path $root 'run-out.txt'
    $errF = Join-Path $root 'run-err.txt'
    Remove-Item $outF, $errF -ErrorAction SilentlyContinue
    Write-Host '=== 诊断模式（java.exe）==='
    Write-Host ('java = ' + $java)
    $proc = Start-Process -FilePath $java -ArgumentList $argLine -WorkingDirectory $mc -NoNewWindow -PassThru -RedirectStandardOutput $outF -RedirectStandardError $errF
    Write-Host ('started pid ' + $proc.Id + ' args ' + $cmdArgs.Count)
    $proc | Wait-Process -Timeout 30 -ErrorAction SilentlyContinue
    if ($proc.HasExited) {
        Write-Host ('[结果] 进程已退出，退出码 ' + $proc.ExitCode) -ForegroundColor Red
        Write-Host '--- stdout (run-out.txt) 末尾 40 行 ---' -ForegroundColor Cyan
        if (Test-Path $outF) { Get-Content $outF -Tail 40 }
        Write-Host '--- stderr (run-err.txt) 末尾 60 行 ---' -ForegroundColor Cyan
        if (Test-Path $errF) { Get-Content $errF -Tail 60 }
    } else {
        Write-Host '[结果] 30 秒内没有退出（进程还活着）' -ForegroundColor Green
    }
    Read-Host '把上面的内容整段复制发我，然后按回车'
    exit 0
}

$p = [System.Diagnostics.Process]::Start($psi)
Write-Host "started pid $($p.Id) args $($cmdArgs.Count)"

Start-Sleep -Seconds 8
if ($p.HasExited) {
    Write-Host ('[错误] 游戏进程启动后立刻退出了，退出码 ' + $p.ExitCode) -ForegroundColor Red
    $log = Join-Path $mc 'logs\latest.log'
    if (Test-Path $log) { Write-Host '--- logs\latest.log 末尾 40 行 ---' -ForegroundColor Cyan; Get-Content $log -Tail 40 }
    $cr = Join-Path $mc 'crash-reports'
    if (Test-Path $cr) { $last = Get-ChildItem $cr -Filter *.txt -ErrorAction SilentlyContinue | Sort-Object LastWriteTime | Select-Object -Last 1; if ($last) { Write-Host ('--- 最新崩溃报告: ' + $last.Name + ' ---') -ForegroundColor Cyan; Get-Content $last.FullName -Tail 40 } }
    Read-Host '把上面的内容截图发给我，然后按回车退出'
} else {
    Write-Host '游戏已启动（窗口会在几秒后出现，第一次启动较慢请耐心等）' -ForegroundColor Green
    Read-Host '可以按回车关闭这个窗口（游戏继续运行）'
}


