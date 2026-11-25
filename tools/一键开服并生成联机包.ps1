# mc-anime 一键开服 + 生成「朋友一键联机包」
#
# 用法（在你（房主）的电脑上，双击本文件的包装 bat，或）：
#   powershell -NoProfile -ExecutionPolicy Bypass -File tools\一键开服并生成联机包.ps1
#
# 它会：
#   1. 检查/安装服务端（dist\mc-anime-server）
#   2. 启动服务端
#   3. 准备 playit.gg 内网穿透（自动下载 GUI 客户端，首次需要你在浏览器点一下授权）
#   4. 让你把 playit 分配到的地址粘进来（形如 xxx.playit.gg:25565）
#   5. 生成 dist\friends\mc-anime一键联机.zip —— 发给朋友，他双击就自动装好并进服
param(
  [string]$Address = '',
  [int]$MemoryGB = 4,
  [switch]$SkipServer
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$serverDir = Join-Path $root 'dist\mc-anime-server'
$friendDir = Join-Path $root 'dist\friends'
$playitDir = Join-Path $root 'tools\playit'
$releaseUrl = 'https://github.com/belfry2023/mc-anime/releases/download/v1.0.0/mc-anime-client.zip'

function Say($m) { Write-Host $m -ForegroundColor Cyan }

Say '=============================================='
Say '   mc-anime 一键开服 + 生成朋友联机包'
Say '=============================================='

# ── 1. 服务端 ──────────────────────────────────────────────
if (-not $SkipServer) {
  if (!(Test-Path $serverDir)) { throw ('找不到服务端目录：' + $serverDir) }
  $startBat = Join-Path $serverDir 'server-start.bat'
  if (!(Test-Path $startBat)) {
    Say '服务端还没安装，正在运行安装脚本（第一次要联网，几分钟）...'
    $inst = Join-Path $serverDir 'server-install.ps1'
    if (!(Test-Path $inst)) { throw ('找不到 server-install.ps1，服务端包不完整') }
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $inst
    if (!(Test-Path $startBat)) { throw '服务端安装失败，没有生成 server-start.bat' }
  }
  Say '启动服务端（新窗口，最小化就好）...'
  Start-Process -FilePath 'cmd.exe' -ArgumentList '/c', ('"' + $startBat + '"') -WorkingDirectory $serverDir
  Start-Sleep -Seconds 8
} else {
  Say '（已跳过服务端启动）'
}

# ── 2. playit.gg 内网穿透 ─────────────────────────────────
if ([string]::IsNullOrWhiteSpace($Address)) {
  if (!(Test-Path $playitDir)) { New-Item -ItemType Directory -Force -Path $playitDir | Out-Null }
  $agent = Join-Path $playitDir 'playit-gui.exe'

  if (!(Test-Path $agent)) {
    Say '下载 playit.gg 客户端 ...'
    $cred = ("protocol=https`nhost=github.com`n`n" | git credential fill) -split "`n"
    $token = ($cred | Where-Object { $_ -like 'password=*' }) -replace '^password=', ''
    $h = @{ 'User-Agent' = 'mc-anime' }
    if ($token) { $h['Authorization'] = "token $token" }
    $rel = Invoke-RestMethod -Uri 'https://api.github.com/repos/playit-cloud/playit-agent/releases/latest' -Headers $h -TimeoutSec 60
    $asset = $rel.assets | Where-Object { $_.name -eq 'playit-gui-windows-x86_64-signed.exe' } | Select-Object -First 1
    if (-not $asset) { $asset = $rel.assets | Where-Object { $_.name -eq 'playit-gui-windows-x86_64.exe' } | Select-Object -First 1 }
    if (-not $asset) { throw '在 GitHub 上没找到 playit 的 Windows 客户端' }
    Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $agent -Headers @{ 'User-Agent' = 'mc-anime' } -TimeoutSec 600
  }

  Say ''
  Say '接下来在 playit 窗口里：'
  Say '  1) 浏览器会弹出登录页 → 注册/登录（Google 账号即可）'
  Say '  2) 在 playit 里点「Create Tunnel」→ 类型选 Minecraft Java'
  Say '     Local Address: 127.0.0.1      Local Port: 25565'
  Say '  3) 创建后会给你一个地址，形如  something.playit.gg'
  Say ''
  Start-Process -FilePath $agent -WorkingDirectory $playitDir

  $Address = Read-Host '把 playit 给你的地址粘到这里（如 something.playit.gg:25565）'
}

$Address = ($Address -replace '\s', '')
if ([string]::IsNullOrWhiteSpace($Address)) { throw '没有拿到服务器地址，已退出' }
if ($Address -notmatch ':') { $Address = $Address + ':25565' }

# ── 3. 生成朋友联机包 ─────────────────────────────────────
Say ''
Say ('服务器地址：' + $Address)
Say '生成朋友一键联机包 ...'

if (Test-Path $friendDir) { Remove-Item $friendDir -Recurse -Force }
New-Item -ItemType Directory -Force -Path $friendDir | Out-Null

$joinPs1 = @'
# mc-anime 一键联机（朋友侧，自动生成，别改）
$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$Address = '__ADDRESS__'
$MemoryGB = __MEMORY__
$ClientZipUrl = '__ZIPURL__'

$game = Join-Path $here 'mc-anime'
$launcher = Join-Path $game 'launch-game.ps1'
$zip = Join-Path $here 'mc-anime-client.zip'

Write-Host ''
Write-Host '  ==========================================='
Write-Host '        mc-anime 一键联机（' + $Address + '）'
Write-Host '  ==========================================='
Write-Host ''

# 1) 没有游戏就自动下载并解压
if (!(Test-Path $launcher)) {
  if (!(Test-Path $zip)) {
    Write-Host '  第一次使用：正在下载整合包（约 1.4 GB，看网速，可能要一会儿）...'
    try {
      # 优先用 BITS（有进度条、可断点续传）
      Start-BitsTransfer -Source $ClientZipUrl -Destination $zip -DisplayName 'mc-anime 整合包'
    } catch {
      Write-Host '  BITS 失败，改用普通下载 ...'
      $ProgressPreference = 'SilentlyContinue'
      Invoke-WebRequest -Uri $ClientZipUrl -OutFile $zip -TimeoutSec 3600
    }
  }
  Write-Host '  正在解压（约 16 万个小文件，需要几分钟，别关窗口）...'
  if (!(Test-Path $game)) { New-Item -ItemType Directory -Force -Path $game | Out-Null }
  Push-Location $game
  try {
    & (Join-Path $env:SystemRoot 'System32\tar.exe') -x -f $zip
    if ($LASTEXITCODE -ne 0) {
      Write-Host '  tar 解压失败，改用 PowerShell 解压（更慢）...'
      Expand-Archive -Path $zip -DestinationPath $game -Force
    }
  } finally { Pop-Location }
  if (!(Test-Path $launcher)) { throw '解压后没找到 launch-game.ps1，包可能下载不完整，删掉 zip 重新运行本脚本' }
}

# 2) 昵称 / 内存 / 服务器地址
$nameFile = Join-Path $game 'username.txt'
if (!(Test-Path $nameFile)) {
  $n = Read-Host '游戏内昵称（直接回车 = 你的电脑用户名）'
  if ([string]::IsNullOrWhiteSpace($n)) { $n = $env:USERNAME }
  Set-Content -Path $nameFile -Value $n -Encoding UTF8
}
Set-Content -Path (Join-Path $game 'memory.txt') -Value ($MemoryGB.ToString() + 'G') -Encoding UTF8
Set-Content -Path (Join-Path $game 'connect.txt') -Value $Address -Encoding UTF8

# 3) 桌面快捷方式（以后直接双击就进服）
try {
  $ws = New-Object -ComObject WScript.Shell
  $lnk = Join-Path ([Environment]::GetFolderPath('Desktop')) '玩 mc-anime.lnk'
  $sc = $ws.CreateShortcut($lnk)
  $sc.TargetPath = 'powershell.exe'
  $sc.Arguments = '-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "' + $launcher + '"'
  $sc.WorkingDirectory = $game
  $sc.IconLocation = 'powershell.exe,0'
  $sc.Description = 'mc-anime 整合包（自动进服）'
  $sc.Save()
} catch { }

Write-Host ''
Write-Host '  准备完成，正在启动游戏（首次启动 1~3 分钟）...'
Write-Host '  以后双击桌面「玩 mc-anime」就行。'
Start-Process -FilePath 'powershell.exe' -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ('"' + $launcher + '"')) -WorkingDirectory $game
'@

$joinPs1 = $joinPs1.Replace('__ADDRESS__', $Address).Replace('__MEMORY__', $MemoryGB.ToString()).Replace('__ZIPURL__', $releaseUrl)

$bat = @'
@echo off
chcp 65001 >nul
title mc-anime 一键联机
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0join.ps1"
if errorlevel 1 pause
'@

$readme = @'
mc-anime 一键联机包
==================

使用方法：双击「一键联机.bat」

第一次运行会：
  1. 自动下载整合包（约 1.4 GB）
  2. 自动解压到本文件夹下的 mc-anime\ 目录
  3. 问一次你的游戏昵称
  4. 生成桌面快捷方式「玩 mc-anime」并直接启动游戏、自动连进服务器

之后：
  双击桌面「玩 mc-anime」，或者再次双击「一键联机.bat」

注意：
  * 需要 Windows 10/11 64 位、约 10 GB 空闲磁盘
  * 不需要自己装 Java / 启动器
  * 如果服务器没开，游戏会停在「连接失败」，等房主开服后再进即可
  * 想改昵称：编辑 mc-anime\username.txt
  * 想改内存：编辑 mc-anime\memory.txt（默认 __MEMORY__G，电脑内存 8G 就填 4G，16G 可填 6G）
'@
$readme = $readme.Replace('__MEMORY__', $MemoryGB.ToString())

# ps1/README 用带 BOM 的 UTF-8（PowerShell 5.1 才不会把中文读成乱码）；bat 必须不带 BOM，否则 cmd 会把第一行读坏
$utf8Bom = New-Object System.Text.UTF8Encoding($true)
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText((Join-Path $friendDir 'join.ps1'), $joinPs1, $utf8Bom)
[System.IO.File]::WriteAllText((Join-Path $friendDir '一键联机.bat'), $bat, $utf8NoBom)
[System.IO.File]::WriteAllText((Join-Path $friendDir 'README.txt'), $readme, $utf8Bom)

$zipOut = Join-Path $root 'dist\mc-anime一键联机.zip'
if (Test-Path $zipOut) { Remove-Item $zipOut -Force }
Push-Location $friendDir
try {
  & (Join-Path $env:SystemRoot 'System32\tar.exe') -a -c -f $zipOut *
} finally { Pop-Location }

Say ''
Say '完成！把下面这个文件发给朋友：'
Say ('  ' + $zipOut)
Say ''
Say '朋友那边：解压 → 双击「一键联机.bat」→ 等它自动装好并进服。'
