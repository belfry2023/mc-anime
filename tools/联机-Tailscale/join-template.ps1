# ================================================================
#  mc-anime 朋友一键加入（Tailscale 版）
#
#  由房主脚本生成，请直接双击同目录的「一键加入.bat」。
# ================================================================
$ErrorActionPreference = 'Continue'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$Address    = '__ADDRESS__'
$ShareLink  = '__SHARELINK__'
$MemoryGB   = '__MEMORY__'
$ZipUrl     = 'https://github.com/belfry2023/mc-anime/releases/download/v1.0.0/mc-anime-client.zip'

$here    = Split-Path -Parent $MyInvocation.MyCommand.Path
$target  = Join-Path $here 'mc-anime'
$zipPath = Join-Path $here 'mc-anime-client.zip'
$tsExe   = 'C:\Program Files\Tailscale\tailscale.exe'
$tsSetup = Join-Path $here 'tailscale-setup.exe'

function Say($t) { Write-Host $t }
function Pause2($t) { Read-Host $t | Out-Null }

Say ''
Say '=============================================='
Say '        mc-anime 一键加入'
Say '=============================================='
Say ('  服务器地址：' + $Address)
Say ''

# ---------- 1. 安装 Tailscale ----------
if (!(Test-Path $tsExe)) {
  Say '第 1 步：安装 Tailscale（用来直连房主，比中转快很多）'
  Say '  会弹出 UAC，请点「是」'
  if (!(Test-Path $tsSetup)) {
    Say '  下载安装包 ...'
    try {
      Invoke-WebRequest -Uri 'https://pkgs.tailscale.com/stable/tailscale-setup-latest.exe' -OutFile $tsSetup -UseBasicParsing -TimeoutSec 600
    } catch {
      Say ('  下载失败：' + $_.Exception.Message)
      Say '  请手动下载安装：https://tailscale.com/download/windows 装完再重跑本脚本'
      Pause2 '按回车退出'
      exit 1
    }
  }
  $p = Start-Process -FilePath $tsSetup -ArgumentList '/quiet', '/norestart' -Verb RunAs -Wait -PassThru
  Say ('  安装结束（返回码 ' + $p.ExitCode + '）')
  if (!(Test-Path $tsExe)) { Say '  没装成功，请手动安装后重跑'; Pause2 '按回车退出'; exit 1 }
}

# ---------- 2. 在这台电脑上登录 Tailscale（关键：浏览器登录不算） ----------
function Get-MyTsIP {
  try { $x = & $tsExe ip -4 2>$null | Select-Object -First 1; return ([string]$x).Trim() } catch { return '' }
}

Say ''
Say '第 2 步：在这台电脑上登录 Tailscale'
$myip = Get-MyTsIP
if (!$myip) {
  Say '  注意：只在浏览器里登录是不够的，必须在电脑上登录一次。'
  Say '  现在会弹出登录（UAC 点「是」），浏览器里用你的账号登录即可。'
  Start-Process -FilePath 'cmd.exe' -ArgumentList '/c', ('"' + $tsExe + '" up') -Verb RunAs -Wait
  for ($i = 0; $i -lt 24; $i++) {
    Start-Sleep -Seconds 5
    $myip = Get-MyTsIP
    if ($myip) { break }
    Write-Host '  等待登录完成 ...'
  }
}
if (!$myip) {
  Say ''
  Say '  没拿到 Tailscale IP，说明电脑上还没登录成功。'
  Say '  请点任务栏右下角 Tailscale 图标 → Log in，登录后重跑本脚本。'
  Pause2 '按回车退出'
  exit 1
}
Say ('  本机 Tailscale IP：' + $myip)

# ---------- 2b. 接受房主的邀请 / 分享（如果已经能连上就跳过） ----------
function Test-TargetOk {
  try {
    $c = New-Object Net.Sockets.TcpClient
    $c.Connect(($Address -replace ':\d+$', ''), 25565)
    $c.Close()
    return $true
  } catch { return $false }
}

Say ''
if (Test-TargetOk) {
  Say '第 2b 步：已经能连到房主了，跳过加入网络这一步'
} else {
  Say '第 2b 步：加入房主的网络'
  if ($ShareLink) {
    Say ('  浏览器会打开房主给的链接（如果显示“邀请已失效”说明之前已经用过了，直接回来按回车）：')
    Say ('  ' + $ShareLink)
    Start-Process $ShareLink
  } else {
    Say '  把房主给你的邀请/分享链接粘到这里，然后按回车（会自动打开浏览器）：'
    $ShareLink = Read-Host '  链接'
    if ($ShareLink) { Start-Process $ShareLink }
  }
  Pause2 '  浏览器里点完「接受」后，回到这里按回车继续'
}

# ---------- 3. 等网络连通 ----------
Say ''
Say '第 3 步：等待能连上房主 ...'
$ok = $false
for ($i = 0; $i -lt 60; $i++) {
  Start-Sleep -Seconds 5
  try {
    $client = New-Object Net.Sockets.TcpClient
    $client.Connect(($Address -replace ':\d+$', ''), 25565)
    $client.Close()
    $ok = $true
    break
  } catch { Write-Host ('  还没通，继续等 ... (' + (($i + 1) * 5) + 's)') }
}
if (!$ok) {
  Say ''
  Say '连不上房主，请检查：'
  Say '  1) 房主的服务端窗口还开着（里面有 Done ( 字样）'
  Say '  2) 浏览器里已经点了「接受」，并且电脑上 Tailscale 是已登录状态'
  Say '  3) 让房主确认这周一并在 <https://login.tailscale.com/admin/machines> 里能看到你的设备'
  Pause2 '按回车退出'
  exit 1
}
Say '  已连上房主！'

# ---------- 4. 下载整合包 ----------
$needDownload = $true
if (Test-Path (Join-Path $target 'launch-game.ps1')) {
  Say ''
  Say '第 4 步：检测更新 ...'
  $localBuild = ''
  $lf = Join-Path $target 'installed-build.txt'
  if (Test-Path $lf) { $localBuild = (Get-Content $lf -Raw).Trim() }
  $remote = ''
  try {
    $api = 'https://api.github.com/repos/belfry2023/mc-anime/releases/tags/v1.0.0'
    $j = Invoke-RestMethod -Uri $api -Headers @{ 'User-Agent' = 'mc-anime-join' } -TimeoutSec 30
    $asset = $j.assets | Where-Object { $_.name -eq 'mc-anime-client.zip' } | Select-Object -First 1
    if ($asset) { $remote = ([string]$asset.updated_at) }
  } catch { }
  if ($remote -and $remote -eq $localBuild) {
    Say '  已是最新版本，跳过下载'
    $needDownload = $false
  } else {
    Say '  有新版本，重新下载'
  }
}

if ($needDownload) {
  if (Test-Path $zipPath) {
    Say ''
    Say '第 4 步：发现本文件夹里已经有 mc-anime-client.zip，直接解压（不下载）'
    $okDl = $true
  } else {
    Say ''
    Say '第 4 步：下载整合包（约 1.39 GB，慢慢等）...'
    $okDl = $false
    try {
      Import-Module BitsTransfer -ErrorAction Stop
      Start-BitsTransfer -Source $ZipUrl -Destination $zipPath -Description 'mc-anime' -ErrorAction Stop
      $okDl = $true
    } catch {
      try {
        Invoke-WebRequest -Uri $ZipUrl -OutFile $zipPath -UseBasicParsing -TimeoutSec 3600
        $okDl = $true
      } catch { Say ('  下载失败：' + $_.Exception.Message) }
    }
    if (!$okDl) {
      Say ''
      Say '  自动下载失败了。可以请房主把 mc-anime-client.zip 传给你（网盘/U盘都行），'
      Say '  放到本文件夹（和 join.ps1 同一层），然后重新双击「一键加入.bat」。'
      Pause2 '按回车退出'
      exit 1
    }
  }

  Say '  解压中 ...'
  if (Test-Path $target) { Remove-Item $target -Recurse -Force }
  New-Item -ItemType Directory -Force -Path $target | Out-Null
  $tar = Join-Path $env:SystemRoot 'System32\tar.exe'
  $done = $false
  if (Test-Path $tar) {
    & $tar -x -f $zipPath -C $target
    if ($LASTEXITCODE -eq 0) { $done = $true }
  }
  if (!$done) {
    try { Expand-Archive -Path $zipPath -DestinationPath $target -Force; $done = $true } catch { }
  }
  if (!$done) { Say '  解压失败，请手动把 zip 解压到 ' + $target; Pause2 '按回车退出'; exit 1 }

  if ($remote) { Set-Content -Path (Join-Path $target 'installed-build.txt') -Value $remote -Encoding ASCII }
  Remove-Item $zipPath -Force -ErrorAction SilentlyContinue
}

# 兼容：有的包里多一层 payload
if (!(Test-Path (Join-Path $target 'launch-game.ps1'))) {
  $inner = Join-Path $target 'payload'
  if (Test-Path $inner) {
    Get-ChildItem $inner -Force | ForEach-Object { Move-Item $_.FullName $target -Force }
    Remove-Item $inner -Recurse -Force
  }
}
if (!(Test-Path (Join-Path $target 'launch-game.ps1'))) { Say '  整合包结构不对，找不到 launch-game.ps1'; Pause2 '按回车退出'; exit 1 }

# ---------- 4b. 用本包里自带的启动器覆盖（支持 connect.txt 自动进服 + 出错时打印日志） ----------
$patchedLauncher = Join-Path $PSScriptRoot 'launch-game.ps1'
if (Test-Path $patchedLauncher) {
  try {
    Copy-Item $patchedLauncher (Join-Path $target 'launch-game.ps1') -Force
    Say '  已更新启动器（支持自动进服）'
  } catch { Say ('  更新启动器失败：' + $_.Exception.Message) }
}

# ---------- 5. 昵称 / 内存 / 服务器地址 ----------
Say ''
Say '第 5 步：个性化设置'
$name = Read-Host ('  游戏昵称（直接回车默认：' + $env:USERNAME + '）')
if (!$name) { $name = $env:USERNAME }
$name = ($name -replace '[^A-Za-z0-9_]', '')
if (!$name) { $name = 'Player' }
Set-Content -Path (Join-Path $target 'username.txt') -Value $name -Encoding UTF8
Set-Content -Path (Join-Path $target 'memory.txt') -Value $MemoryGB -Encoding UTF8
Set-Content -Path (Join-Path $target 'connect.txt') -Value $Address -Encoding UTF8

# ---------- 6. 桌面快捷方式 ----------
try {
  $desktop = [Environment]::GetFolderPath('Desktop')
  $lnkPath = Join-Path $desktop '玩 mc-anime.lnk'
  $ws = New-Object -ComObject WScript.Shell
  $lnk = $ws.CreateShortcut($lnkPath)
  $lnk.TargetPath = (Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe')
  $lnk.Arguments = '-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "' + (Join-Path $target 'launch-game.ps1') + '"'
  $lnk.WorkingDirectory = $target
  $lnk.IconLocation = (Join-Path $target 'payload\game\.minecraft\icon.ico')
  $lnk.Save()
  Say '  已在桌面创建「玩 mc-anime」快捷方式'
} catch { Say '  创建快捷方式失败（不影响游戏）' }

# ---------- 7. 启动 ----------
Say ''
Say '都准备好了，正在启动游戏（会自动进服）...'
Start-Process -FilePath (Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe') -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', (Join-Path $target 'launch-game.ps1'))
Start-Sleep -Seconds 3
Say ''
Say ('完成！昵称：' + $name + '，服务器：' + $Address)
Say '以后双击桌面的「玩 mc-anime」即可。'
Pause2 '按回车退出'
