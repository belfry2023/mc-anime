# ================================================================
#  mc-anime 房主一键开服 - Tailscale 版
#
#  作用：
#    1. 没有 Tailscale 就自动下载安装
#    2. 让你登录 Tailscale（浏览器里点一下）
#    3. 拿到你的 Tailscale 内网 IP（100.x.x.x）
#    4. 启动 Minecraft 服务端
#    5. 生成「朋友一键加入」小压缩包
#
#  用法（在本目录）：
#    powershell -NoProfile -ExecutionPolicy Bypass -File 1-房主一键开服.ps1
# ================================================================
param(
  [string]$ShareLink = '',
  [int]$MemoryGB = 4,
  [switch]$SkipServer
)

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$here     = Split-Path -Parent $MyInvocation.MyCommand.Path
$root     = Split-Path -Parent (Split-Path -Parent $here)
$serverDir = Join-Path $root 'dist\mc-anime-server'
$friendDir = Join-Path $root 'dist\friend-tailscale'
$zipOut    = Join-Path $root 'dist\mc-anime一键联机-Tailscale.zip'
$tsExe    = 'C:\Program Files\Tailscale\tailscale.exe'
$tsSetup  = Join-Path $here 'tailscale-setup.exe'

function Say($t) { Write-Host $t }

Say ''
Say '=============================================='
Say '   mc-anime 一键开服（Tailscale 版）'
Say '=============================================='
Say ''

# ---------- 1. Tailscale 是否安装 ----------
if (!(Test-Path $tsExe)) {
  Say '没有检测到 Tailscale，开始自动下载安装 ...'
  if (!(Test-Path $tsSetup)) {
    Say '  下载安装包 ...'
    Invoke-WebRequest -Uri 'https://pkgs.tailscale.com/stable/tailscale-setup-latest.exe' -OutFile $tsSetup -UseBasicParsing -TimeoutSec 600
  }
  Say '  正在安装（会弹 UAC，请点「是」）...'
  $p = Start-Process -FilePath $tsSetup -ArgumentList '/quiet', '/norestart' -Verb RunAs -Wait -PassThru
  Say ('  安装结束，返回码 ' + $p.ExitCode)
  if (!(Test-Path $tsExe)) { throw 'Tailscale 没装成功，请手动安装后重跑本脚本：https://tailscale.com/download/windows' }
}

# ---------- 2. 登录（浏览器点一下即可） ----------
$ip = ''
try { $ip = (& $tsExe ip -4 2>$null | Select-Object -First 1) } catch { }
$ip = ([string]$ip).Trim()

if (!$ip) {
  Say ''
  Say '第一次使用，需要你在浏览器里登录 Tailscale（Google 账号即可）：'
  Say '  1) 浏览器会打开一个登录页，登录后点 Connect / 允许'
  Say '  2) 回到这个窗口按回车'
  Say ''
  # tailscale up 需要管理员权限；不加 --qr 会让浏览器自动弹出登录页
  Start-Process -FilePath 'cmd.exe' -ArgumentList '/c', ('"' + $tsExe + '" up') -Verb RunAs -Wait
  Read-Host '  登录完成后按回车继续'

  for ($i = 0; $i -lt 36; $i++) {
    Start-Sleep -Seconds 5
    try { $ip = (& $tsExe ip -4 2>$null | Select-Object -First 1) } catch { }
    $ip = ([string]$ip).Trim()
    if ($ip) { break }
    Write-Host '  等待 Tailscale 连上 ...'
  }
  if (!$ip) { throw '没拿到 Tailscale IP，请在托盘里点 Tailscale 图标确认已登录并 Connected，然后重跑本脚本' }
}

Say ('  你的 Tailscale IP：' + $ip)

# ---------- 3. 启动服务端 ----------
$serverRunning = $false
try {
  $r = New-Object Net.Sockets.TcpClient
  $r.Connect('127.0.0.1', 25565)
  $serverRunning = $true
  $r.Close()
} catch { }

if ($SkipServer) {
  Say '（已跳过服务端启动）'
} elseif ($serverRunning) {
  Say '  服务端已经在跑（25565 有响应），不重复启动'
} else {
  if (!(Test-Path (Join-Path $serverDir 'server-start.bat'))) { throw ('找不到服务端：' + $serverDir) }
  Say '  正在启动服务端（新窗口）...'
  Start-Process -FilePath 'cmd.exe' -ArgumentList '/c', 'server-start.bat' -WorkingDirectory $serverDir
  Say '  服务端窗口里出现 "Done (" 就是开好了（第一次约 1 分钟）'
}

# ---------- 4. 提示分享给朋友 ----------
Say ''
Say '----------------------------------------------'
Say '  让朋友能连上你：在 Tailscale 后台把这台设备分享给他'
Say '----------------------------------------------'
Say '  1) 打开 https://login.tailscale.com/admin/machines'
Say '  2) 找到这台电脑 → 右边「...」→ Share / 分享'
Say '  3) 复制分享链接（形如 https://login.tailscale.com/a/xxxx）发给朋友'
Say '  4) 他打开链接、用任意账号（Google 即可）登录接受，就能连你了'
Say ''
Say '  朋友的连接地址：' + $ip + ':25565'
Say ''

if (!$ShareLink) {
  $ShareLink = Read-Host '把分享链接粘到这里（可留空，朋友脚本里会再问）'
}

# ---------- 5. 生成朋友包 ----------
Say ''
Say '生成朋友一键加入包 ...'

if (Test-Path $friendDir) { Remove-Item $friendDir -Recurse -Force }
New-Item -ItemType Directory -Force -Path $friendDir | Out-Null

$tpl = Join-Path $here 'join-template.ps1'
if (!(Test-Path $tpl)) { throw ('缺少模板：' + $tpl) }
$join = [System.IO.File]::ReadAllText($tpl, [System.Text.Encoding]::UTF8)
$join = $join.Replace('__ADDRESS__', ($ip + ':25565')).Replace('__SHARELINK__', $ShareLink).Replace('__MEMORY__', [string]$MemoryGB)

# .bat 必须是「纯 ASCII + CRLF」：中文标题 + LF 换行会让 cmd 按 GBK 解码时吞掉换行符，
# 出现 "'5001' 不是内部或外部命令" 这类诡异报错。中文提示都放在 join.ps1 里输出。
$bat = @'
@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0join.ps1"
if errorlevel 1 pause
'@
$bat = $bat -replace "`r?`n", "`r`n"

$readme = @'
mc-anime 一键加入（Tailscale 版）—— 朋友操作说明
=====================================================

前提：房主已经开着服务端，并且在 Tailscale 里把这台电脑分享给你（链接）。

【系统要求】
  · Windows 10 / 11 64 位
  · 磁盘剩余空间 ≥ 6 GB
  · 不需要自己装 Java（整合包自带）

【完整步骤】
  1. 把 mc-anime一键联机-Tailscale.zip 解压到任意文件夹
     （不要直接在压缩包里双击，必须先解压）
  2. 双击「一键加入.bat」
  3. 弹出 UAC 问是否安装 Tailscale → 点「是」
     （脚本自动下载安装，约 1 分钟，不需要你自己找下载页）
  4. 浏览器会自动打开房主给的分享链接：
     用任意账号登录（Google / 微软 / GitHub 都行，免费）
     → 点「Accept invitation / 接受」
  5. 回到黑色窗口，按一下回车
  6. 脚本自动等待连上房主（最多 5 分钟，显示「已连上房主！」）
  7. 自动下载整合包（约 1.39 GB，看网速：100M 带宽约 2 分钟）
  8. 自动解压（2 万多个文件，约 1~3 分钟）
  9. 输入游戏昵称（直接回车 = 用 Windows 用户名；只能用字母数字下划线）
 10. 自动创建桌面快捷方式「玩 mc-anime」并启动游戏
 11. 游戏启动后会自动进服（首次启动较慢，1~3 分钟正常）

以后每次玩：双击桌面「玩 mc-anime」即可，会自动进房主的服务器。

【常见问题】
  · Tailscale 没装成功 / 你点了「否」
      → 手动下载安装：https://tailscale.com/download/windows
        装好后重新双击「一键加入.bat」
  · 提示连不上房主
      → 看任务栏右下角 Tailscale 图标是否已连接（Connected）
      → 确认浏览器里已经点了「接受」，并等 30 秒
      → 让房主确认服务端窗口还开着（里面有 Done ( 字样）
  · 下载卡住
      → 脚本会自动换备用下载方式；仍失败就用浏览器手动下载：
        https://github.com/belfry2023/mc-anime/releases/download/v1.0.0/mc-anime-client.zip
        下载后放到本文件夹，重新双击「一键加入.bat」
  · 解压失败
      → 手动把 zip 解压到本文件夹下的 mc-anime\ 目录，再重跑脚本
  · 进入游戏提示「无法连接至服务器」
      → 房主那边的服务端窗口关了 / 房主电脑睡眠了

【想和朋友一起玩时】
  房主开着 server-start.bat 那个黑窗口，不要关。
'@

$utf8Bom = New-Object System.Text.UTF8Encoding($true)
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText((Join-Path $friendDir 'join.ps1'), $join, $utf8Bom)
[System.IO.File]::WriteAllText((Join-Path $friendDir '一键加入.bat'), $bat, $utf8NoBom)
[System.IO.File]::WriteAllText((Join-Path $friendDir 'README.txt'), $readme, $utf8Bom)

# 把"支持 connect.txt 自动进服 + 出错时打印日志"的启动器一起放进包里，
# join.ps1 解压整合包后会用这个覆盖旧版启动器。
$patchedLauncher = Join-Path $here '..\..\dist\patch\launch-game.ps1'
if (-not (Test-Path $patchedLauncher)) { $patchedLauncher = Join-Path $here 'launch-game-patch.ps1' }
if (Test-Path $patchedLauncher) {
    Copy-Item $patchedLauncher (Join-Path $friendDir 'launch-game.ps1') -Force
    Say '  已附带新版启动器（支持自动进服）'
} else {
    Say '  [提示] 没找到新启动器补丁（dist\patch\launch-game.ps1），朋友包里仍用整合包自带启动器'
}

if (Test-Path $zipOut) { Remove-Item $zipOut -Force }
Push-Location $friendDir
try {
  & (Join-Path $env:SystemRoot 'System32\tar.exe') -a -c -f $zipOut *
} finally { Pop-Location }

Say ''
Say '完成！把这个文件发给朋友：'
Say ('  ' + $zipOut)
Say ''
Say ('房主自己进服地址（本机）：127.0.0.1:25565')
Say ('朋友进服地址（Tailscale）：' + $ip + ':25565')
Say ''
Read-Host '按回车退出'
