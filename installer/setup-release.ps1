# mc-anime 客户端安装器（Release 版）
# 同目录下需要：mc-anime-client.zip（或 payload 目录）+ 本脚本（由 setup.exe 调用）
$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$zip = Join-Path $here 'mc-anime-client.zip'
$payload = Join-Path $here 'payload'

Write-Host ''
Write-Host '  ============================================'
Write-Host '            mc-anime 整合包 安装程序'
Write-Host '  ============================================'
Write-Host ''

if (!(Test-Path $zip) -and !(Test-Path $payload)) {
  Write-Host '同目录下找不到 mc-anime-client.zip / payload，无法安装。'
  Read-Host '按回车退出'
  exit 1
}

$defaultDir = Join-Path ([Environment]::GetFolderPath('MyDocuments')) 'mc-anime'
$dir = Read-Host ('安装到哪个目录？（直接回车 = ' + $defaultDir + '）')
if ([string]::IsNullOrWhiteSpace($dir)) { $dir = $defaultDir }
$dir = $dir.Trim('"')
if (!(Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }

$name = Read-Host '游戏内昵称（直接回车 = 玩家）'
if ([string]::IsNullOrWhiteSpace($name)) { $name = '玩家' }

$mem = Read-Host '分配内存（直接回车 = 4G，可填 6G / 8G）'
if ([string]::IsNullOrWhiteSpace($mem)) { $mem = '4G' }

Write-Host ''
Write-Host ('  正在解压到 ' + $dir + ' ...')

if (Test-Path $zip) {
  $tar = Join-Path $env:SystemRoot 'System32\tar.exe'
  Push-Location $dir
  try { & $tar -x -f $zip } finally { Pop-Location }
  if ($LASTEXITCODE -ne 0) {
    Write-Host 'tar 解压失败，改用 PowerShell 解压（较慢）...'
    Expand-Archive -Path $zip -DestinationPath $dir -Force
  }
} else {
  robocopy $payload $dir /E /NFL /NDL /NJH /NJS /R:1 /W:1 | Out-Null
}

Set-Content -Path (Join-Path $dir 'username.txt') -Value $name -Encoding UTF8
Set-Content -Path (Join-Path $dir 'memory.txt') -Value $mem -Encoding UTF8

$desktop = [Environment]::GetFolderPath('Desktop')
$lnk = Join-Path $desktop '玩 mc-anime.lnk'
$ws = New-Object -ComObject WScript.Shell
$sc = $ws.CreateShortcut($lnk)
$sc.TargetPath = 'powershell.exe'
$sc.Arguments = '-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "' + (Join-Path $dir 'launch-game.ps1') + '"'
$sc.WorkingDirectory = $dir
$sc.IconLocation = 'powershell.exe,0'
$sc.Description = 'mc-anime 整合包'
$sc.Save()

Write-Host ''
Write-Host '  安装完成！'
Write-Host ('  安装位置：' + $dir)
Write-Host ('  昵称：' + $name + '    内存：' + $mem)
Write-Host '  桌面上已生成「玩 mc-anime」快捷方式（双击即可启动）。'
Write-Host ''
Read-Host '按回车退出'
