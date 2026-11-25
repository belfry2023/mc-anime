# 构建可发布到 GitHub Release 的精简客户端包
#
# 目标：玩法与联机能力不变，尽量减小体积：
#   1) 不带 yes_steve_model 的 cache/builtin、ysm_geo_compat/resourcepack（首次启动会自己重新生成）
#   2) 不带 tlm_custom_pack 里上百个 .contract-fox-original-*.bak 备份
#   3) JDK 用 jlink 剪裁成最小运行时（约 80MB，替代 303MB 全量 JDK）
#   4) 打成单个 zip（GitHub Release 单文件上限 2GB）
#
# 用法：powershell -NoProfile -ExecutionPolicy Bypass -File tools\build-release.ps1 [-NoZip]

param(
  [switch]$NoZip,
  [string]$Out = 'dist\release'
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$mc = Join-Path $root 'game\.minecraft'
$payload = Join-Path $root (Join-Path $Out 'payload')
$zip = Join-Path $root (Join-Path $Out 'mc-anime-client.zip')

function Write-Step($t) { Write-Host "`n=== $t" -ForegroundColor Cyan }
function Human($bytes) { '{0:N1} MB' -f ($bytes / 1MB) }

Write-Step '清理旧的 release 目录'
if (Test-Path (Join-Path $root $Out)) { Remove-Item (Join-Path $root $Out) -Recurse -Force }
New-Item -ItemType Directory -Force -Path $payload | Out-Null

Write-Step '复制主要目录'
$dirs = @('mods', 'kubejs', 'customnpcs', 'tacz', 'millenaire', 'millenaire-custom',
          'defaultconfigs', 'sexmod', 'versions', 'natives', 'libraries', 'assets')
foreach ($d in $dirs) {
  $src = Join-Path $mc $d
  if (!(Test-Path $src)) { continue }
  $dst = Join-Path $payload ('game\.minecraft\' + $d)
  New-Item -ItemType Directory -Force -Path (Split-Path $dst) | Out-Null
  robocopy $src $dst /E /NFL /NDL /NJH /NJS /R:1 /W:1 | Out-Null
  $sz = (Get-ChildItem $dst -Recurse -File | Measure-Object Length -Sum).Sum
  Write-Host ("  {0,-18} {1}" -f $d, (Human $sz))
}

Write-Step '复制 config（剔除缓存与自动生成的资源包）'
$cfgDst = Join-Path $payload 'game\.minecraft\config'
New-Item -ItemType Directory -Force -Path $cfgDst | Out-Null
$xd = @(
  (Join-Path $mc 'config\yes_steve_model\cache'),
  (Join-Path $mc 'config\yes_steve_model\builtin'),
  (Join-Path $mc 'config\ysm_geo_compat\resourcepack')
)
robocopy (Join-Path $mc 'config') $cfgDst /E /NFL /NDL /NJH /NJS /R:1 /W:1 /XD @xd | Out-Null
Write-Host ("  config = " + (Human ((Get-ChildItem $cfgDst -Recurse -File | Measure-Object Length -Sum).Sum)))

Write-Step '复制 tlm_custom_pack（去掉 .bak 备份）'
$tlmDst = Join-Path $payload 'game\.minecraft\tlm_custom_pack'
New-Item -ItemType Directory -Force -Path $tlmDst | Out-Null
robocopy (Join-Path $mc 'tlm_custom_pack') $tlmDst /E /NFL /NDL /NJH /NJS /R:1 /W:1 /XF '*.bak' | Out-Null
Write-Host ("  tlm_custom_pack = " + (Human ((Get-ChildItem $tlmDst -Recurse -File | Measure-Object Length -Sum).Sum)))

Write-Step '复制 options.txt / 文档'
if (Test-Path (Join-Path $mc 'options.txt')) { Copy-Item (Join-Path $mc 'options.txt') (Join-Path $payload 'game\.minecraft\options.txt') -Force }
foreach ($f in @('apply-keybinds.ps1', 'keys_raw.txt', '指南.md', '游玩说明.md', '超级指南.md', '键位方案.md')) {
  $src = Join-Path $root $f
  if (Test-Path $src) { Copy-Item $src (Join-Path $payload $f) -Force }
}

Write-Step '复制便携启动脚本'
$srcClient = Join-Path $root 'dist\mc-anime-client\payload'
if (!(Test-Path (Join-Path $srcClient 'launch-game.ps1'))) {
  throw '找不到 dist\mc-anime-client\payload\launch-game.ps1，请先运行 tools\build-dist.ps1 -Mode Client'
}
foreach ($f in @('launch-game.ps1', '启动.bat', '启动游戏.bat')) {
  Copy-Item (Join-Path $srcClient $f) (Join-Path $payload $f) -Force
}

Write-Step '用 jlink 生成最小 Java 运行时'
$jdkHome = Join-Path $root 'jdk\jdk-17.0.21+9'
$jlink = Join-Path $jdkHome 'bin\jlink.exe'
$runtimeDst = Join-Path $payload 'jdk\jdk-17.0.21+9'
if (Test-Path $jlink) {
  $mods = 'java.base,java.logging,java.desktop,java.management,java.naming,java.security.sasl,java.sql,jdk.unsupported,jdk.crypto.ec,java.xml,java.instrument'
  & $jlink --add-modules $mods --strip-debug --no-header-files --no-man-pages --compress=2 --output $runtimeDst
  if ($LASTEXITCODE -ne 0) { throw 'jlink 失败' }
  Write-Host ("  runtime = " + (Human ((Get-ChildItem $runtimeDst -Recurse -File | Measure-Object Length -Sum).Sum)))
} else {
  Write-Warning '找不到 jlink，退回复制完整 JDK'
  robocopy $jdkHome $runtimeDst /E /NFL /NDL /NJH /NJS /R:1 /W:1 | Out-Null
}

Write-Step '统计 payload 体积'
$total = (Get-ChildItem $payload -Recurse -File | Measure-Object Length -Sum).Sum
Write-Host ("  payload = " + (Human $total))

if ($NoZip) { Write-Step '跳过压缩（-NoZip）'; return }

Write-Step '压缩为 zip（bsdtar）'
$tar = Join-Path $env:SystemRoot 'System32\tar.exe'
Push-Location $payload
try {
  & $tar -a -c -f $zip *
  if ($LASTEXITCODE -ne 0) { throw ('tar 打包失败 (exit ' + $LASTEXITCODE + ')') }
} finally { Pop-Location }
Write-Host ("  zip = " + (Human ((Get-Item $zip).Length)))
Write-Step ('完成：' + $zip)
