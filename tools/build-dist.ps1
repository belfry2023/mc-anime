# 打包 mc-anime 客户端安装包 与 服务器一键包
#
# 用法：
#   powershell -NoProfile -ExecutionPolicy Bypass -File tools\build-dist.ps1
#   powershell ... -File tools\build-dist.ps1 -Mode Server
#   powershell ... -File tools\build-dist.ps1 -Zip        # 额外把客户端 payload 压成 zip（慢、体积约 1.9GB）
#   powershell ... -File tools\build-dist.ps1 -IncludeSaves  # 把 saves 也打进去（+1.2GB）

param(
    [ValidateSet('Client', 'Server', 'All')][string]$Mode = 'All',
    [switch]$Zip,
    [switch]$IncludeSaves,
    [string]$Out = 'dist'
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$mc = Join-Path $root 'game\.minecraft'
$distRoot = Join-Path $root $Out

function Copy-Tree {
    param([string]$Src, [string]$Dst)
    if (-not (Test-Path $Src)) { Write-Host "  跳过（不存在）：$Src" -ForegroundColor DarkGray; return }
    Write-Host "  复制 $Src" -ForegroundColor Gray
    $null = New-Item -ItemType Directory -Force -Path $Dst
    $rc = Start-Process -FilePath 'robocopy.exe' -ArgumentList @($Src, $Dst, '/E', '/NFL', '/NDL', '/NJH', '/NJS', '/R:1', '/W:1', '/XF', 'mc-anime-jenny.zip') -Wait -PassThru -NoNewWindow
    if ($rc.ExitCode -ge 8) { throw "robocopy 失败：$Src (exit $($rc.ExitCode))" }
}

function Save-Utf8Bom {
    param([string]$Path)
    $text = Get-Content -Path $Path -Raw -Encoding UTF8
    $enc = New-Object System.Text.UTF8Encoding($true)
    [System.IO.File]::WriteAllText($Path, $text, $enc)
}

function New-Launcher {
    param([string]$Dst)
    $src = Join-Path $root 'launch-game.ps1'
    $text = Get-Content $src -Raw -Encoding UTF8

    $text = $text -replace [regex]::Escape("`$root     = 'C:\Users\belfry\workspaceRE\mc-anime'"), "`$root     = `$PSScriptRoot"

    $inject = @(
        '',
        '# 安装版：昵称 / 内存从同目录的 username.txt、memory.txt 读取',
        "`$name = 'Player'",
        "if (Test-Path (Join-Path `$root 'username.txt')) { `$name = (Get-Content (Join-Path `$root 'username.txt') -Raw).Trim() }",
        "`$mem = '6G'",
        "if (Test-Path (Join-Path `$root 'memory.txt')) { `$mem = (Get-Content (Join-Path `$root 'memory.txt') -Raw).Trim() }",
        ''
    ) -join "`r`n"

    $anchor = '$vanilla = Get-Content'
    $text = $text.Replace($anchor, $inject + $anchor)
    $text = $text.Replace("'auth_player_name'    = 'Belfry'", "'auth_player_name'    = `$name")
    $text = $text.Replace("`$cmdArgs.Add('-Xmx4G')", "`$cmdArgs.Add('-Xmx' + `$mem)")
    Set-Content -Path $Dst -Value $text -Encoding UTF8
}

function Build-Client {
    Write-Host ''
    Write-Host '=== 打包客户端安装包 ===' -ForegroundColor Cyan
    $clientDir = Join-Path $distRoot 'mc-anime-client'
    $payload = Join-Path $clientDir 'payload'
    if (Test-Path $clientDir) { Write-Host '  清理旧目录...' -ForegroundColor DarkGray; Remove-Item -Recurse -Force $clientDir }
    $null = New-Item -ItemType Directory -Force -Path $payload

    Write-Host '复制游戏文件...' -ForegroundColor Green
    Copy-Tree (Join-Path $root 'jdk') (Join-Path $payload 'jdk')
    foreach ($d in @('mods', 'config', 'kubejs', 'customnpcs', 'tlm_custom_pack', 'tacz', 'millenaire', 'millenaire-custom', 'defaultconfigs', 'sexmod', 'versions', 'natives', 'libraries', 'assets')) {
        Copy-Tree (Join-Path $mc $d) (Join-Path (Join-Path $payload 'game\.minecraft') $d)
    }
    foreach ($f in @('options.txt', 'servers.dat')) {
        $p = Join-Path $mc $f
        if (Test-Path $p) { Copy-Item $p (Join-Path (Join-Path $payload 'game\.minecraft') $f) -Force }
    }
    if ($IncludeSaves) { Copy-Tree (Join-Path $mc 'saves') (Join-Path $payload 'game\.minecraft\saves') }

    Write-Host '复制文档与启动脚本...' -ForegroundColor Green
    foreach ($f in @('指南.md', '游玩说明.md', '超级指南.md', '键位方案.md', 'apply-keybinds.ps1', 'keys_raw.txt')) {
        $p = Join-Path $root $f
        if (Test-Path $p) { Copy-Item $p (Join-Path $payload $f) -Force }
    }
    New-Launcher (Join-Path $payload 'launch-game.ps1')
    Save-Utf8Bom (Join-Path $payload 'launch-game.ps1')

    $startBat = @"
@echo off
cd /d "%~dp0"
start "" powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Minimized -File "%~dp0launch-game.ps1"
"@
    Set-Content -Path (Join-Path $payload '启动.bat') -Value $startBat -Encoding ASCII
    Set-Content -Path (Join-Path $payload '启动游戏.bat') -Value $startBat -Encoding ASCII

    Write-Host '复制安装程序...' -ForegroundColor Green
    foreach ($f in @('setup.ps1', 'setup.bat', 'setup.cs', 'README.txt')) {
        Copy-Item (Join-Path $root "installer\$f") (Join-Path $clientDir $f) -Force
    }

    Write-Host '编译 setup.exe...' -ForegroundColor Green
    $csc = Join-Path $env:SystemRoot 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
    if (-not (Test-Path $csc)) { $csc = Join-Path $env:SystemRoot 'Microsoft.NET\Framework\v4.0.30319\csc.exe' }
    if (Test-Path $csc) {
        & $csc /nologo /target:exe /out:"$(Join-Path $clientDir 'setup.exe')" "$(Join-Path $clientDir 'setup.cs')" | Write-Host
        if ($LASTEXITCODE -ne 0) { Write-Host '  setup.exe 编译失败，改用 setup.bat 安装（功能一样）' -ForegroundColor Yellow }
    } else {
        Write-Host '  没找到 csc.exe，改用 setup.bat 安装（功能一样）' -ForegroundColor Yellow
    }

    if ($Zip) {
        Write-Host '压缩 payload.zip（很慢，约 10~30 分钟）...' -ForegroundColor Yellow
        Compress-Archive -Path (Join-Path $payload '*') -DestinationPath (Join-Path $clientDir 'payload.zip') -CompressionLevel Fastest -Force
    }

    $size = (Get-ChildItem $clientDir -Recurse -File | Measure-Object Length -Sum).Sum / 1GB
    Write-Host ("客户端包完成：{0}  大小 {1:N2} GB" -f $clientDir, $size) -ForegroundColor Green
}

function Build-Server {
    Write-Host ''
    Write-Host '=== 打包服务器一键包 ===' -ForegroundColor Cyan
    $serverDir = Join-Path $distRoot 'mc-anime-server'
    if (Test-Path $serverDir) { Write-Host '  清理旧目录...' -ForegroundColor DarkGray; Remove-Item -Recurse -Force $serverDir }
    $null = New-Item -ItemType Directory -Force -Path $serverDir

    Write-Host '复制服务端所需文件...' -ForegroundColor Green
    Copy-Tree (Join-Path $root 'jdk') (Join-Path $serverDir 'jdk')
    foreach ($d in @('mods', 'config', 'kubejs', 'customnpcs', 'tlm_custom_pack', 'millenaire', 'millenaire-custom', 'defaultconfigs')) {
        Copy-Tree (Join-Path $mc $d) (Join-Path $serverDir $d)
    }
    $forgeJar = Get-ChildItem $root -Filter 'forge-1.20.1-47.4.29-installer.jar' -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($forgeJar) { Copy-Item $forgeJar.FullName (Join-Path $serverDir $forgeJar.Name) -Force }

    foreach ($f in @('server-install.ps1', '服务器安装.bat', '联机指南.md')) {
        Copy-Item (Join-Path $root "installer\server\$f") (Join-Path $serverDir $f) -Force
    }

    $size = (Get-ChildItem $serverDir -Recurse -File | Measure-Object Length -Sum).Sum / 1GB
    Write-Host ("服务器包完成：{0}  大小 {1:N2} GB" -f $serverDir, $size) -ForegroundColor Green
}

Write-Host "输出目录：$distRoot" -ForegroundColor Cyan
if ($Mode -eq 'Client' -or $Mode -eq 'All') { Build-Client }
if ($Mode -eq 'Server' -or $Mode -eq 'All') { Build-Server }
Write-Host ''
Write-Host '全部完成。' -ForegroundColor Green

