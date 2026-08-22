# Grid-Commander — Local CI & Verification Runner (PowerShell)
#
# Runs every quality gate defined in .github/workflows/validate.yml locally on Windows:
# 1. Python Unit Tests (Harness)
# 2. OpenSpec Validation
# 3. TypeScript Typecheck
# 4. ESLint
# 5. Vitest Test Suite
# 6. Next.js Application Build

$ErrorActionPreference = "Stop"
$script:failed = $false

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host " Grid-Commander -- Comprehensive Local CI Gate Runner" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

function Run-Gate($name, $command) {
    Write-Host "--> Running Gate: $name ..." -NoNewline
    try {
        $env:PYTHONIOENCODING="utf-8"
        Invoke-Expression $command | Out-String | Out-Null
        Write-Host " [PASS]" -ForegroundColor Green
    } catch {
        Write-Host " [FAILED]" -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Yellow
        $script:failed = $true
    }
}

# 1. Python Harness Unit Tests
Run-Gate "1/6 Python Unit Tests" "python -m unittest discover -s tests"

# 2. OpenSpec Validation
Run-Gate "2/6 OpenSpec Validation" "python .claude/tools/openspec.py validate --all"

# 3. TypeScript Typecheck
Run-Gate "3/6 TypeScript Typecheck" "npx tsc --noEmit"

# 4. ESLint
Run-Gate "4/6 ESLint" "npx eslint ."

# 5. Vitest Test Suite
Run-Gate "5/6 Vitest Tests" "npx vitest run"

# 6. Next.js Build Gate
Run-Gate "6/6 Next.js Build" "npx next build"

if ($script:failed) {
    Write-Host ""
    Write-Host "========================================================" -ForegroundColor Red
    Write-Host " CI GATES FAILED" -ForegroundColor Red
    Write-Host "========================================================" -ForegroundColor Red
    exit 1
} else {
    Write-Host ""
    Write-Host "========================================================" -ForegroundColor Green
    Write-Host " ALL CI GATES PASSED (100% GREEN)" -ForegroundColor Green
    Write-Host "========================================================" -ForegroundColor Green
    exit 0
}
