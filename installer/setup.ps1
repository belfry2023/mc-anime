# mc-anime 客户端安装脚本（由 setup.exe / setup.bat 调用）

param(
    [string]$Target = '',
    [string]$PlayerName = '',
    [string]$Memory = ''
)

$ErrorActionPreference = 'Stop'
$here = $PSScriptRoot
$payload = Join-Path $here 'payload'

Write-Host ''
Write-Host '==============================================' -ForegroundColor Cyan
Write-Host '  mc-anime 整合包 客户端安装程序' -ForegroundColor Cyan
Write-Host '==============================================' -ForegroundColor Cyan
Write-Host ''

if (-not (Test-Path $payload)) {
    Write-Host '找不到 payload 目录：请把 setup.exe 与 payload 文件夹放在同一个位置。' -ForegroundColor Red
    exit 1
}

if (-not $Target) {
    $default = Join-Path $env:LOCALAPPDATA 'mc-anime'
    Write-Host "默认安装目录： $default" -ForegroundColor Yellow
    $ans = Read-Host '直接回车使用默认目录，或输入其它完整路径'
    if ($ans -and $ans.Trim()) { $Target = $ans.Trim() } else { $Target = $default }
}

if (-not $PlayerName) {
    $ans = Read-Host '游戏内昵称（直接回车默认 Player）'
    if ($ans -and $ans.Trim()) { $PlayerName = $ans.Trim() } else { $PlayerName = 'Player' }
}

if (-not $Memory) {
    $ans = Read-Host '分配给游戏的内存（直接回车默认 6G，8G 内存的机器建议 4G）'
    if ($ans -and $ans.Trim()) { $Memory = $ans.Trim() } else { $Memory = '6G' }
}

Write-Host ''
Write-Host "正在安装到： $Target" -ForegroundColor Green
Write-Host '（约 2GB，机械硬盘需要几分钟，请耐心等待）' -ForegroundColor DarkGray

New-Item -ItemType Directory -Force -Path $Target | Out-Null
$rc = Start-Process -FilePath 'robocopy.exe' -ArgumentList @($payload, $Target, '/E', '/NFL', '/NDL', '/NJH', '/NJS', '/R:1', '/W:1') -Wait -PassThru -NoNewWindow
if ($rc.ExitCode -ge 8) {
    Write-Host "复制文件失败（robocopy 退出码 $($rc.ExitCode)）" -ForegroundColor Red
    exit 1
}

Set-Content -Path (Join-Path $Target 'username.txt') -Value $PlayerName -Encoding UTF8
Set-Content -Path (Join-Path $Target 'memory.txt') -Value $Memory -Encoding UTF8

# 桌面快捷方式
try {
    $desktop = [Environment]::GetFolderPath('Desktop')
    $ws = New-Object -ComObject WScript.Shell
    $lnkPath = Join-Path $desktop '玩 mc-anime.lnk'
    $lnk = $ws.CreateShortcut($lnkPath)
    $lnk.TargetPath = "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"
    $lnk.Arguments = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Minimized -File `"$Target\launch-game.ps1`""
    $lnk.WorkingDirectory = $Target
    $lnk.Description = '启动 mc-anime 整合包'
    $lnk.Save()
    Write-Host "已创建桌面快捷方式： $lnkPath" -ForegroundColor Green
} catch {
    Write-Host "创建快捷方式失败（不影响游戏）： $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host ''
Write-Host '==============================================' -ForegroundColor Cyan
Write-Host ' 安装完成！' -ForegroundColor Green
Write-Host " 安装目录： $Target" -ForegroundColor Gray
Write-Host " 昵称： $PlayerName   内存： $Memory" -ForegroundColor Gray
Write-Host ''
Write-Host ' 启动方式：双击桌面的「玩 mc-anime」，或运行安装目录里的 启动.bat' -ForegroundColor Gray
Write-Host ' 想改昵称/内存：直接编辑安装目录里的 username.txt / memory.txt' -ForegroundColor Gray
Write-Host '==============================================' -ForegroundColor Cyan
Write-Host ''
Read-Host '按回车键关闭'
