param([string]$Token)

$ErrorActionPreference = 'Stop'
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$repo = 'belfry2023/mc-anime'
$tag = 'v1.0.0'
$file = (Resolve-Path (Join-Path $PSScriptRoot '..\dist\mc-anime一键联机.zip')).Path
$assetName = 'mc-anime-join.zip'

$token = $Token
if (-not $token) { throw 'no token passed' }
$h = @{ 'User-Agent' = 'mc-anime'; Authorization = "token $token" }

$rel = Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/releases/tags/$tag" -Headers $h -TimeoutSec 60
Write-Host ("release id = " + $rel.id)

$old = $rel.assets | Where-Object { $_.name -eq $assetName }
if ($old) {
    Invoke-RestMethod -Method Delete -Uri ("https://api.github.com/repos/$repo/releases/assets/" + $old.id) -Headers $h -TimeoutSec 60 | Out-Null
    Write-Host 'deleted old asset'
}

$url = "https://uploads.github.com/repos/$repo/releases/" + $rel.id + "/assets?name=$assetName"
$r = Invoke-WebRequest -Method Post -Uri $url -Headers $h -InFile $file -ContentType 'application/zip' -TimeoutSec 300
Write-Host ("upload status = " + $r.StatusCode)
$obj = $r.Content | ConvertFrom-Json
Write-Host ("asset: " + $obj.name + " size=" + $obj.size + " state=" + $obj.state)
Write-Host ("url = " + $obj.browser_download_url)
