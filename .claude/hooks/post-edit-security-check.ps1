# Post-Edit Security Hook
# HTML 파일 편집 후 innerHTML 사용 시 escapeHtml 누락 감지

param()

$filePath = $env:CLAUDE_FILE_PATH
if (-not $filePath -or $filePath -notmatch '\.html$') { exit 0 }
if (-not (Test-Path $filePath)) { exit 0 }

$lines = Get-Content $filePath -ErrorAction SilentlyContinue
$issues = @()

for ($i = 0; $i -lt $lines.Count; $i++) {
    $line = $lines[$i]
    # innerHTML 사용하면서 escapeHtml 없고, 주석이 아닌 라인 감지
    if ($line -match 'innerHTML' -and $line -notmatch 'escapeHtml' -and $line -notmatch '^\s*//' -and $line -notmatch 'textContent') {
        $issues += "  Line $($i+1): $($line.Trim())"
    }
}

if ($issues.Count -gt 0) {
    Write-Host ""
    Write-Host "[Security Hook] innerHTML without escapeHtml() detected:" -ForegroundColor Yellow
    $issues | ForEach-Object { Write-Host $_ -ForegroundColor Red }
    Write-Host "Fix: escapeHtml()로 감싸거나 textContent를 사용하세요." -ForegroundColor Cyan
}
