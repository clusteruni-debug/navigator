# Post-Edit Sensitive Data Hook
# 편집된 파일에서 민감 데이터 패턴 감지 (API 키, 하드코딩된 비밀번호 등)

param()

$filePath = $env:CLAUDE_FILE_PATH
if (-not $filePath) { exit 0 }
if (-not (Test-Path $filePath)) { exit 0 }

$content = Get-Content $filePath -Raw -ErrorAction SilentlyContinue
if (-not $content) { exit 0 }

$patterns = @(
    @{ Name = "API Key (하드코딩)"; Pattern = '(?i)(api[_-]?key|apikey)\s*[:=]\s*["\x27][A-Za-z0-9]{20,}' },
    @{ Name = "Password (하드코딩)"; Pattern = '(?i)(password|passwd|pwd)\s*[:=]\s*["\x27][^\s"'']{4,}' },
    @{ Name = "Secret/Token (하드코딩)"; Pattern = '(?i)(secret|token|private[_-]?key)\s*[:=]\s*["\x27][A-Za-z0-9]{10,}' },
    @{ Name = "Private Key"; Pattern = '-----BEGIN (RSA |EC )?PRIVATE KEY-----' }
)

$found = @()
foreach ($p in $patterns) {
    if ($content -match $p.Pattern) {
        $found += $p.Name
    }
}

if ($found.Count -gt 0) {
    Write-Host ""
    Write-Host "[Sensitive Data Hook] 민감 데이터 패턴 감지:" -ForegroundColor Yellow
    $found | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
    Write-Host "확인: 실제 비밀 값이 아닌지 검토하세요." -ForegroundColor Cyan
}
