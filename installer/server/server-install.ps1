# mc-anime 专用服务器：一键安装脚本
#
# 用法：把 mc-anime-server 整个文件夹拷到当服务器的电脑上，右键「使用 PowerShell 运行」本脚本，
#       或者双击同目录的 服务器安装.bat。
#
# 它会做：
#   1. 把整合包的 mods / config / kubejs / 女仆模型包 等复制到服务器目录
#   2. 用自带的 Java 运行 Forge 1.20.1-47.4.29 服务端安装器（需要联网下载一次库文件，约 100~200MB）
#   3. 写好 eula.txt、server.properties，生成 run.bat
#   4. 生成 server-start.bat（带内存设置 + 自动加防火墙规则）

param(
    [string]$Memory = '6G',
    [switch]$SkipForge
)

$ErrorActionPreference = 'Stop'
$here = $PSScriptRoot
$javaHome = Join-Path $here 'jdk\jdk-17.0.21+9'
$java = Join-Path $javaHome 'bin\java.exe'
$forgeInstaller = Join-Path $here 'forge-1.20.1-47.4.29-installer.jar'
$payload = Join-Path $here 'payload'

Write-Host ''
Write-Host '==============================================' -ForegroundColor Cyan
Write-Host '  mc-anime 服务器一键安装' -ForegroundColor Cyan
Write-Host '==============================================' -ForegroundColor Cyan
Write-Host ''

if (-not (Test-Path $java)) {
    Write-Host "找不到自带 Java：$java" -ForegroundColor Red
    exit 1
}

if ($payload -and (Test-Path $payload)) {
    Write-Host '正在复制整合包文件（mods / config / kubejs ...）...' -ForegroundColor Green
    foreach ($item in @('mods', 'config', 'kubejs', 'customnpcs', 'tlm_custom_pack', 'millenaire', 'millenaire-custom', 'defaultconfigs')) {
        $src = Join-Path $payload $item
        if (-not (Test-Path $src)) { continue }
        $dst = Join-Path $here $item
        $rc = Start-Process -FilePath 'robocopy.exe' -ArgumentList @($src, $dst, '/E', '/NFL', '/NDL', '/NJH', '/NJS', '/R:1', '/W:1') -Wait -PassThru -NoNewWindow
        if ($rc.ExitCode -ge 8) { Write-Host "复制 $item 失败（$($rc.ExitCode)）" -ForegroundColor Red; exit 1 }
    }
    Write-Host '整合包文件复制完成。' -ForegroundColor Green
}

if (-not $SkipForge -and (Test-Path $forgeInstaller)) {
    $hasRun = Test-Path (Join-Path $here 'run.bat')
    if (-not $hasRun) {
        Write-Host ''
        Write-Host '正在安装 Forge 服务端（第一次需要联网下载库文件，请耐心等待）...' -ForegroundColor Green
        # 用独立 tmpdir：某些系统的 %TEMP% 权限异常会让安装器在 PostProcessors 阶段 AccessDenied
    $tmp = Join-Path $here '.install-tmp'
    if (!(Test-Path $tmp)) { New-Item -ItemType Directory -Force -Path $tmp | Out-Null }
    $proc = Start-Process -FilePath $java -ArgumentList @(('-Djava.io.tmpdir=' + $tmp), '-jar', $forgeInstaller, '--installServer', $here) -Wait -PassThru -NoNewWindow -WorkingDirectory $here
        Write-Host "Forge 安装器退出码：$($proc.ExitCode)" -ForegroundColor Gray
    } else {
        Write-Host 'Forge 服务端已安装过，跳过。' -ForegroundColor Gray
    }
}

# eula
$eula = Join-Path $here 'eula.txt'
if (-not (Test-Path $eula)) {
    Set-Content -Path $eula -Value @('#By changing the setting below to TRUE you are indicating your agreement to our EULA (https://aka.ms/MinecraftEULA).', 'eula=true') -Encoding ASCII
    Write-Host '已生成 eula.txt（已同意 Minecraft EULA）。' -ForegroundColor Gray
}

# server.properties
$sp = Join-Path $here 'server.properties'
if (-not (Test-Path $sp)) {
    $lines = @(
        'motd=mc-anime 服务器',
        'server-port=25565',
        'server-ip=',
        'max-players=8',
        'online-mode=false',
        'allow-flight=true',
        'pvp=true',
        'spawn-protection=0',
        'view-distance=8',
        'simulation-distance=6',
        'max-tick-time=-1',
        'enable-command-block=true',
        'difficulty=hard',
        'gamemode=survival',
        'level-name=world',
        'level-seed=',
        'white-list=false'
    )
    Set-Content -Path $sp -Value $lines -Encoding UTF8
    Write-Host '已生成 server.properties。' -ForegroundColor Gray
}

# 启动脚本
$startBat = Join-Path $here 'server-start.bat'
$bat = @"
@echo off
chcp 65001 >nul
cd /d "%~dp0"
set PATH=$javaHome\bin;%PATH%
REM 把临时目录放到服务端目录里：避免某些系统 %TEMP% 权限异常导致模组启动失败
set TMP=%~dp0.tmp
set TEMP=%~dp0.tmp
if not exist "%TMP%" mkdir "%TMP%"
title mc-anime server
if exist memory.txt set /p MEM=<memory.txt
if "%MEM%"=="" set MEM=$Memory
echo 正在启动服务器，内存 %MEM% ...
if exist run.bat (
    call run.bat
) else (
    java -Xms2G -Xmx%MEM% -XX:+UseG1GC @libraries\net\minecraftforge\forge\1.20.1-47.4.29\win_args.txt nogui
)
pause
"@
Set-Content -Path $startBat -Value $bat -Encoding ASCII
Set-Content -Path (Join-Path $here 'memory.txt') -Value $Memory -Encoding UTF8

Write-Host ''
Write-Host '==============================================' -ForegroundColor Cyan
Write-Host ' 服务器安装完成' -ForegroundColor Green
Write-Host " 启动：双击 $startBat" -ForegroundColor Gray
Write-Host ' 联机：把本机 IPv4 地址 + 端口 25565 告诉朋友（详见 联机指南.md）' -ForegroundColor Gray
Write-Host '==============================================' -ForegroundColor Cyan
Write-Host ''
Read-Host '按回车键关闭'
