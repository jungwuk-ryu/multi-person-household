@echo off
setlocal

cd /d "%~dp0"

if "%UV_CACHE_DIR%"=="" set "UV_CACHE_DIR=%CD%\.uv-cache"
if "%UV_PYTHON_INSTALL_DIR%"=="" set "UV_PYTHON_INSTALL_DIR=%CD%\.uv-python"

echo Running Setlog backend smoke tests...
uv run --python 3.11 --with-requirements requirements.txt pytest %*

if errorlevel 1 (
  exit /b %errorlevel%
)

echo.
echo Smoke tests completed.
echo To run the API server:
echo   cd backend
echo   uv run --python 3.11 --with-requirements requirements.txt uvicorn app.main:app --host 127.0.0.1 --port 8000

endlocal
