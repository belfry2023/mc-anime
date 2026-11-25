# 把 dist\release 里的安装包发布/替换到 GitHub Release（用 HttpClient 流式上传，避开 HttpWebRequest 的 Header 限制）
#
# 用法：
#   powershell -NoProfile -ExecutionPolicy Bypass -File tools\replace-release.ps1
#   powershell -NoProfile -ExecutionPolicy Bypass -File tools\replace-release.ps1 -Tag v1.0.1
#
# 行为：
#   1. 取已保存的 GitHub token（git credential fill）
#   2. 找到（或创建）release
#   3. 删除 release 上同名旧资产
#   4. 流式上传 dist\release\mc-anime-client.zip、installer\setup.exe、installer\setup-release.ps1
#   5. 用 installer\RELEASE_NOTES.md 更新 release 说明
param(
  [string]$Tag = 'v1.0.0',
  [string]$Name = '',
  [string]$NotesFile = 'installer\RELEASE_NOTES.md',
  [string]$Repo = 'belfry2023/mc-anime'
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
if ([string]::IsNullOrWhiteSpace($Name)) { $Name = 'mc-anime 整合包 ' + $Tag }

Add-Type -AssemblyName System.Net.Http

Write-Host '取 GitHub token ...'
$cred = ("protocol=https`nhost=github.com`n`n" | git credential fill) -split "`n"
$token = ($cred | Where-Object { $_ -like 'password=*' }) -replace '^password=', ''
if ([string]::IsNullOrWhiteSpace($token)) { throw '取不到 GitHub token' }

$client = New-Object System.Net.Http.HttpClient
$client.Timeout = [TimeSpan]::FromHours(6)
$client.DefaultRequestHeaders.Add('User-Agent', 'mc-anime-release')
$client.DefaultRequestHeaders.Authorization = New-Object System.Net.Http.Headers.AuthenticationHeaderValue('token', $token)

# ── 1. 找 / 建 release ────────────────────────────────────────────────
$api = "https://api.github.com/repos/$Repo/releases"
$rel = $null
try {
  $resp = $client.GetAsync("$api/tags/$Tag").Result
  if ($resp.IsSuccessStatusCode) {
    $rel = $resp.Content.ReadAsStringAsync().Result | ConvertFrom-Json
    Write-Host ('沿用已有 release: ' + $rel.html_url)
  }
} catch { }

if ($null -eq $rel) {
  $notes = if (Test-Path (Join-Path $root $NotesFile)) { Get-Content (Join-Path $root $NotesFile) -Raw -Encoding UTF8 } else { '' }
  $bodyObj = @{ tag_name = $Tag; target_commitish = 'main'; name = $Name; body = $notes; draft = $false; prerelease = $false }
  $json = $bodyObj | ConvertTo-Json -Depth 4
  $content = New-Object System.Net.Http.StringContent($json, [System.Text.Encoding]::UTF8, 'application/json')
  $resp = $client.PostAsync($api, $content).Result
  if (-not $resp.IsSuccessStatusCode) { throw ('创建 release 失败：' + $resp.StatusCode + ' ' + $resp.Content.ReadAsStringAsync().Result) }
  $rel = $resp.Content.ReadAsStringAsync().Result | ConvertFrom-Json
  Write-Host ('已创建 release: ' + $rel.html_url)
}

# ── 2. 更新说明 ───────────────────────────────────────────────────────
if (Test-Path (Join-Path $root $NotesFile)) {
  try {
    $notes = Get-Content (Join-Path $root $NotesFile) -Raw -Encoding UTF8
    $patch = @{ body = $notes; name = $Name } | ConvertTo-Json -Depth 3
    # 注意：Windows PowerShell 5.1 的 System.Net.Http 没有 PatchAsync，只能手工拼 PATCH 请求
    $pc = New-Object System.Net.Http.StringContent($patch, [System.Text.Encoding]::UTF8, 'application/json')
    $patchMethod = New-Object System.Net.Http.HttpMethod('PATCH')
    $preq = New-Object System.Net.Http.HttpRequestMessage($patchMethod, "$api/$($rel.id)")
    $preq.Content = $pc
    $presp = $client.SendAsync($preq).Result
    if (-not $presp.IsSuccessStatusCode) { Write-Host ('更新说明失败（不影响发布）：' + $presp.StatusCode) }
  } catch {
    Write-Host ('更新说明失败（不影响发布）：' + $_.Exception.Message)
  }
}

# ── 3. 删除同名旧资产 ─────────────────────────────────────────────────
$targets = @(
  @{ Path = 'dist\release\mc-anime-client.zip'; Name = 'mc-anime-client.zip'; Type = 'application/zip' },
  @{ Path = 'installer\setup.exe';             Name = 'setup.exe';             Type = 'application/octet-stream' },
  @{ Path = 'installer\setup-release.ps1';     Name = 'setup.ps1';             Type = 'text/plain' }
)

foreach ($t in $targets) {
  $hit = $rel.assets | Where-Object { $_.name -eq $t.Name }
  foreach ($a in $hit) {
    Write-Host ('删除旧资产 ' + $a.name + ' (id=' + $a.id + ')')
    $r = $client.DeleteAsync("https://api.github.com/repos/$Repo/releases/assets/$($a.id)").Result
    if (-not $r.IsSuccessStatusCode) { Write-Host ('  删除失败：' + $r.StatusCode) }
  }
}

# ── 4. 上传 ───────────────────────────────────────────────────────────
$uploadBase = $rel.upload_url -replace '\{.*$', ''
foreach ($t in $targets) {
  $full = Join-Path $root $t.Path
  if (!(Test-Path $full)) { Write-Host ('跳过（不存在）：' + $t.Path); continue }
  $size = (Get-Item $full).Length
  Write-Host ('上传 ' + $t.Name + ' (' + [math]::Round($size / 1MB, 1) + ' MB) ...')

  $stream = [System.IO.File]::OpenRead($full)
  try {
    $sc = New-Object System.Net.Http.StreamContent($stream)
    $sc.Headers.ContentType = New-Object System.Net.Http.Headers.MediaTypeHeaderValue($t.Type)
    $url = $uploadBase + '?name=' + [uri]::EscapeDataString($t.Name)
    $resp = $client.PostAsync($url, $sc).Result
    $txt = $resp.Content.ReadAsStringAsync().Result
    if (-not $resp.IsSuccessStatusCode) { throw ('上传失败 ' + $t.Name + '：' + $resp.StatusCode + ' ' + $txt) }
    $asset = $txt | ConvertFrom-Json
    Write-Host ('  OK  id=' + $asset.id + '  size=' + $asset.size + '  ' + $asset.browser_download_url)
  } finally {
    $stream.Close()
  }
}

Write-Host ''
Write-Host ('完成：' + $rel.html_url)
