$ErrorActionPreference = "Stop"

Set-Location $PSScriptRoot

if (-not $env:UV_CACHE_DIR) {
    $env:UV_CACHE_DIR = Join-Path (Get-Location) ".uv-cache"
}

if (-not $env:UV_PYTHON_INSTALL_DIR) {
    $env:UV_PYTHON_INSTALL_DIR = Join-Path (Get-Location) ".uv-python"
}

Write-Host "Running Setlog backend smoke tests..."
uv run --python 3.11 --with-requirements requirements.txt pytest @args
if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}

Write-Host ""
Write-Host "Smoke tests completed."
Write-Host "To run the API server:"
Write-Host "  cd backend"
Write-Host "  uv run --python 3.11 --with-requirements requirements.txt uvicorn app.main:app --host 127.0.0.1 --port 8000"
