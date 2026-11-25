# 通过 GitHub REST API 推送本地提交（github.com:443 不通、api.github.com 可用时使用）
# 用法: powershell -NoProfile -ExecutionPolicy Bypass -File tools\push-via-api.ps1 [-Squash]
param(
    [switch]$Squash,
    [string]$Branch = 'main',
    [string]$Repo   = 'belfry2023/mc-anime'
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

# ---------- token ----------
$cred = ("protocol=https`nhost=github.com`n`n" | git credential fill) 2>$null
$token = (($cred -split "`n") | Where-Object { $_ -like 'password=*' } | Select-Object -First 1) -replace '^password=', ''
if (-not $token) { throw '拿不到 GitHub token（git credential fill 失败）' }

$H = @{
    Authorization = "token $token"
    Accept        = 'application/vnd.github+json'
    'User-Agent'  = 'mc-anime-push-api'
}
$base = "https://api.github.com/repos/$Repo"

function Api([string]$Method, [string]$Url, $Body) {
    if ($null -ne $Body) {
        $json = $Body | ConvertTo-Json -Depth 30 -Compress
        return Invoke-RestMethod -Method $Method -Uri $Url -Headers $H -Body $json -ContentType 'application/json; charset=utf-8'
    }
    return Invoke-RestMethod -Method $Method -Uri $Url -Headers $H
}

# ---------- remote state ----------
$ref    = Api 'GET' "$base/git/ref/heads/$Branch"
$remote = $ref.object.sha
Write-Host "remote head : $remote"
$local  = (git rev-parse HEAD).Trim()
Write-Host "local  head : $local"
if ($remote -eq $local) { Write-Host '已经同步，无需推送'; return }

$commits = @(git rev-list --reverse "$remote..$local")
Write-Host ("待推送提交 : " + $commits.Count + " 个")

function New-BlobSha([string]$gitSha) {
    $tmp = Join-Path $env:TEMP ("mcpush_" + $gitSha + ".bin")
    $p = Start-Process -FilePath 'git' -ArgumentList @('cat-file', 'blob', $gitSha) -NoNewWindow -Wait -PassThru -RedirectStandardOutput $tmp
    if ($p.ExitCode -ne 0) { throw "git cat-file 失败: $gitSha" }
    $b64 = [Convert]::ToBase64String([System.IO.File]::ReadAllBytes($tmp))
    Remove-Item $tmp -Force -ErrorAction SilentlyContinue
    $blob = Api 'POST' "$base/git/blobs" @{ content = $b64; encoding = 'base64' }
    return $blob.sha
}

# 收集所有需要上传的 blob（本地解析，避免重复上传）
$blobCache = @{}
function Get-Entry([string]$Sha, [string]$Path, [string]$Mode) {
    if (-not $blobCache.ContainsKey($Sha)) {
        $blobCache[$Sha] = New-BlobSha $Sha
    }
    return @{ path = $Path; mode = $Mode; type = 'blob'; sha = $blobCache[$Sha] }
}

if ($Squash) {
    Write-Host '模式: squash（把全部改动压成一个提交）'
    $entries = New-Object System.Collections.Generic.List[object]
    $diff = git -c core.quotepath=false diff --name-status $remote $local
    foreach ($line in $diff) {
        if (-not $line.Trim()) { continue }
        $parts = $line -split "`t"
        if ($parts[0] -eq 'D') {
            $entries.Add(@{ path = $parts[1]; mode = '100644'; type = 'blob'; sha = $null })
        } else {
            $treeLine = (git ls-tree $local -- $parts[1])
            $mode = if ($treeLine -match '^100755') { '100755' } else { '100644' }
            $gitSha = ($treeLine -split '\s+')[2]
            $entries.Add((Get-Entry $gitSha $parts[1] $mode))
        }
    }
    $rc = Api 'GET' "$base/git/commits/$remote"
    $msg = "同步本地改动（squash）：脚本/文档/发布工具更新`n`n来源提交数: $($commits.Count)"
    $tree = Api 'POST' "$base/git/trees" @{ base_tree = $rc.tree.sha; tree = $entries.ToArray() }
    $newCommit = Api 'POST' "$base/git/commits" @{ message = $msg; tree = $tree.sha; parents = @($remote) }
    $newSha = $newCommit.sha
} else {
    Write-Host '模式: 逐提交重放（保留历史）'
    $prev = $remote
    foreach ($c in $commits) {
        $subject = (git log -1 --pretty=%s $c).Trim()
        $body    = (git log -1 --pretty=%b $c).Trim()
        $message = if ($body) { "$subject`n`n$body" } else { $subject }

        $entries = New-Object System.Collections.Generic.List[object]
        $listing = git -c core.quotepath=false ls-tree -r $c
        foreach ($l in $listing) {
            if (-not $l.Trim()) { continue }
            $m = [regex]::Match($l, '^(\d+)\s+(\w+)\s+([0-9a-f]+)\t(.+)$')
            if (-not $m.Success) { continue }
            $entries.Add((Get-Entry $m.Groups[3].Value $m.Groups[4].Value $m.Groups[1].Value))
        }
        $tree = Api 'POST' "$base/git/trees" @{ tree = $entries.ToArray() }
        $newCommit = Api 'POST' "$base/git/commits" @{ message = $message; tree = $tree.sha; parents = @($prev) }
        $prev = $newCommit.sha
        Write-Host ("  pushed " + $c.Substring(0, 7) + " -> " + $prev.Substring(0, 7) + "  " + $subject)
    }
    $newSha = $prev
}

Api 'PATCH' "$base/git/refs/heads/$Branch" @{ sha = $newSha; force = $false } | Out-Null
Write-Host "已更新 refs/heads/$Branch -> $newSha"
git update-ref "refs/remotes/origin/$Branch" $newSha
Write-Host '本地 origin 引用已更新'
