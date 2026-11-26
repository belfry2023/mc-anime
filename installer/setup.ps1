# mc-anime 客户端安装器（Release 版）
# 同目录需要：mc-anime-client.zip（或 payload 目录）
# 可选：mc-anime-patch-*.zip（存在就会自动叠加到安装目录，修掉旧包的启动问题）
$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$zip = Join-Path $here 'mc-anime-client.zip'
$payload = Join-Path $here 'payload'
$patches = @(Get-ChildItem -Path $here -Filter 'mc-anime-patch-*.zip' -File -ErrorAction SilentlyContinue | Sort-Object Name)

Write-Host ''
Write-Host '  ============================================'
Write-Host '            mc-anime 整合包 安装程序'
Write-Host '  ============================================'
Write-Host ''

if (!(Test-Path $zip) -and !(Test-Path $payload)) {
  Write-Host '找不到安装源：请把 mc-anime-client.zip（或 payload 文件夹）和 setup.exe、setup.ps1 放在同一个文件夹里。'
  Read-Host '按回车退出'
  exit 1
}

$src = if (Test-Path $zip) { $zip } else { $payload }
Write-Host ('  安装源：' + (Split-Path -Leaf $src))
if ($patches.Count -gt 0) { Write-Host ('  已发现补丁：' + (($patches | ForEach-Object { $_.Name }) -join ', ') + '（安装后自动叠加）') }
Write-Host ''

$defaultDir = Join-Path ([Environment]::GetFolderPath('MyDocuments')) 'mc-anime'
$dir = Read-Host ('安装到哪个目录？（直接回车 = ' + $defaultDir + '）')
if ([string]::IsNullOrWhiteSpace($dir)) { $dir = $defaultDir }
$dir = $dir.Trim().Trim('"')
if (!(Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
$dir = (Resolve-Path $dir).Path

$name = Read-Host '游戏内昵称（直接回车 = 玩家）'
if ([string]::IsNullOrWhiteSpace($name)) { $name = '玩家' }
$name = $name.Trim()

$ramGB = 0
try { $ramGB = [int][math]::Floor((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1GB) } catch { $ramGB = 0 }
$suggest = 4
if ($ramGB -ge 24) { $suggest = 8 } elseif ($ramGB -ge 16) { $suggest = 6 } elseif ($ramGB -ge 10) { $suggest = 4 } else { $suggest = 3 }
while ($true) {
  $memIn = Read-Host ('分配内存（本机约 ' + $ramGB + 'G，建议 ' + $suggest + 'G；直接回车 = 自动）')
  if ([string]::IsNullOrWhiteSpace($memIn)) { $memGB = $suggest; break }
  $digits = ($memIn -replace '[^0-9]', '')
  if ($digits -eq '') { Write-Host '  请输入数字，例如 4 或 6G'; continue }
  $memGB = [int]$digits
  if ($memGB -lt 2) { Write-Host '  太小了，最少 2G（一般 4G 就够）'; continue }
  if ($memGB -gt 64) { Write-Host '  太大了，最多 64G'; continue }
  break
}

Write-Host ''
Write-Host ('  正在安装到 ' + $dir)
Write-Host '  （约 1.6GB，机械硬盘大概 3~8 分钟，请勿关闭窗口）'
Write-Host ''

$tar = Join-Path $env:SystemRoot 'System32\tar.exe'
if (Test-Path $zip) {
  Push-Location $dir
  try { & $tar -x -f $zip } finally { Pop-Location }
  if ($LASTEXITCODE -ne 0) {
    Write-Host '  tar 解压失败，改用 PowerShell 解压（很慢，请耐心等）...'
    Expand-Archive -Path $zip -DestinationPath $dir -Force
  }
} else {
  robocopy $payload $dir /E /NFL /NDL /NJH /NJS /R:1 /W:1 | Out-Null
}

foreach ($p in $patches) {
  Write-Host ('  叠加补丁 ' + $p.Name + ' ...')
  Push-Location $dir
  try { & $tar -x -f $p.FullName } finally { Pop-Location }
}

Set-Content -Path (Join-Path $dir 'username.txt') -Value $name -Encoding UTF8
Set-Content -Path (Join-Path $dir 'memory.txt') -Value (($memGB.ToString()) + 'G') -Encoding UTF8
Remove-Item (Join-Path $dir 'game\.minecraft\launch-args.txt') -Force -ErrorAction SilentlyContinue

# 关键文件体检
$launcher = Join-Path $dir 'launch-game.ps1'
$bat = Join-Path $dir '启动游戏.bat'
$verJson = Join-Path $dir 'game\.minecraft\versions\1.20.1-forge-47.4.29\1.20.1-forge-47.4.29.json'
$jdkFull = Join-Path $dir 'jdk\jdk-17.0.21+9\jmods\java.base.jmod'
$warn = @()
if (!(Test-Path $launcher)) { $warn += '缺少 launch-game.ps1' }
if (!(Test-Path $bat)) { $bat = $launcher; $warn += '缺少 启动游戏.bat（快捷方式改为直接调 launch-game.ps1）' }
if (!(Test-Path $verJson)) { $warn += '缺少 1.20.1-forge-47.4.29.json（整合包不完整）' }
if (!(Test-Path $jdkFull)) { $warn += '自带 Java 不是完整 JDK 17（若启动报 jdk.nio.zipfs，请装 Temurin 17）' }

$desktop = [Environment]::GetFolderPath('Desktop')
$lnk = Join-Path $desktop '玩 mc-anime.lnk'
$ws = New-Object -ComObject WScript.Shell
$sc = $ws.CreateShortcut($lnk)
if ($bat -like '*.bat') {
  $sc.TargetPath = $bat
  $sc.Arguments = ''
} else {
  $sc.TargetPath = 'powershell.exe'
  $sc.Arguments = '-NoProfile -ExecutionPolicy Bypass -File "' + $bat + '"'
}
$sc.WorkingDirectory = $dir
$sc.IconLocation = 'powershell.exe,0'
$sc.Description = 'mc-anime 整合包'
$sc.Save()

Write-Host ''
Write-Host '  安装完成！'
Write-Host ('  安装位置：' + $dir)
Write-Host ('  昵称：' + $name + '    内存：' + $memGB + 'G')
Write-Host '  桌面已生成「玩 mc-anime」快捷方式，双击即可启动。'
Write-Host '  启动失败时窗口会停住显示错误，把内容截图发回来即可排查。'
if ($warn.Count -gt 0) {
  Write-Host ''
  Write-Host '  [注意] 体检发现问题：'
  foreach ($w in $warn) { Write-Host ('   - ' + $w) }
}
Write-Host ''
Read-Host '按回车退出'
