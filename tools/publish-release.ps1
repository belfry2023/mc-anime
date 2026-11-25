# 把 dist\release 里的安装包发布到 GitHub Release
#
# 用法：powershell -NoProfile -ExecutionPolicy Bypass -File tools\publish-release.ps1 -Tag v1.0.0
# 依赖：git 已保存 GitHub 凭据（git credential fill 能取到 token）
param(
  [string]$Tag = 'v1.0.0',
  [string]$Name = 'mc-anime 整合包 v1.0.0',
  [string]$NotesFile = 'installer\RELEASE_NOTES.md',
  [string]$Asset = 'dist\release\mc-anime-client.zip',
  [string]$Repo = 'belfry2023/mc-anime'
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

if (!(Test-Path (Join-Path $root $Asset))) { throw ('找不到资产文件：' + $Asset) }

Write-Host '取 GitHub token ...'
$cred = ("protocol=https`nhost=github.com`n`n" | git credential fill) -split "`n"
$token = ($cred | Where-Object { $_ -like 'password=*' }) -replace '^password=', ''
if ([string]::IsNullOrWhiteSpace($token)) { throw '取不到 GitHub token' }
$headers = @{ Authorization = 'token ' + $token; 'User-Agent' = 'mc-anime-release' }

$body = @{
  tag_name         = $Tag
  target_commitish = 'main'
  name             = $Name
  body             = (Get-Content (Join-Path $root $NotesFile) -Raw -Encoding UTF8)
  draft            = $false
  prerelease       = $false
} | ConvertTo-Json -Depth 4

Write-Host ('创建 release ' + $Tag + ' ...')
try {
  $rel = Invoke-RestMethod -Method Post -Uri ("https://api.github.com/repos/$Repo/releases") -Headers $headers -Body $body -ContentType 'application/json; charset=utf-8'
} catch {
  Write-Host '创建 release 失败（可能已存在），尝试沿用已有的:' $_.Exception.Message
  $rel = Invoke-RestMethod -Method Get -Uri ("https://api.github.com/repos/$Repo/releases/tags/$Tag") -Headers $headers
}
Write-Host ('release id = ' + $rel.id + '  url = ' + $rel.html_url)

$file = Resolve-Path (Join-Path $root $Asset)
$fileName = Split-Path $file -Leaf
$size = (Get-Item $file).Length
$uploadUrl = ($rel.upload_url -replace '\{.*$', '') + '?name=' + [uri]::EscapeDataString($fileName)
Write-Host ('上传 ' + $fileName + ' (' + [math]::Round($size / 1MB, 1) + ' MB) ...')

$fs = [System.IO.File]::OpenRead($file)
try {
  $req = [System.Net.HttpWebRequest]::Create($uploadUrl)
  $req.Method = 'POST'
  $req.ContentType = 'application/zip'
  $req.Headers.Add('Authorization', 'token ' + $token)
  $req.Headers.Add('User-Agent', 'mc-anime-release')
  $req.ContentLength = $size
  $req.AllowWriteStreamBuffering = $false
  $out = $req.GetRequestStream()
  try { $fs.CopyTo($out, 1MB) } finally { $out.Close() }
  $resp = $req.GetResponse()
  $reader = New-Object System.IO.StreamReader($resp.GetResponseStream())
  $json = $reader.ReadToEnd()
  Write-Host '上传完成'
  ($json | ConvertFrom-Json) | Select-Object name, size, browser_download_url | Format-List
} finally { $fs.Close() }

Write-Host ('完成：' + $rel.html_url)
