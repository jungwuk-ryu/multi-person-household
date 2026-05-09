#!/usr/bin/env sh
set -eu

cd "$(dirname "$0")"

export UV_CACHE_DIR="${UV_CACHE_DIR:-$(pwd)/.uv-cache}"

echo "Running Setlog backend smoke tests..."
uv run --python 3.11 --with-requirements requirements.txt pytest "$@"

echo
echo "Smoke tests completed."
echo "To run the API server:"
echo "  cd backend && uv run --python 3.11 --with-requirements requirements.txt uvicorn app.main:app --host 127.0.0.1 --port 8000"

