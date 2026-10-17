#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"

if [[ -x "$ROOT/minio/minio-server" && -f "$ROOT/minio/minio.license" ]]; then
  export MINIO_ROOT_USER="${MINIO_ROOT_USER:-harshminio}"
  export MINIO_ROOT_PASSWORD="${MINIO_ROOT_PASSWORD:-harshminio123}"
  "$ROOT/minio/minio-server" server "$ROOT/minio/data" \
    --license "$ROOT/minio/minio.license" \
    --address 127.0.0.1:9000 \
    --console-address 127.0.0.1:9001 >/tmp/harsh-minio.log 2>&1 &
  MINIO_PID=$!
fi

cd "$ROOT/backend"
if [[ ! -d .venv ]]; then
  python3 -m venv .venv
fi
# shellcheck disable=SC1091
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
BACK_PID=$!
trap 'kill "$BACK_PID" 2>/dev/null || true; kill "${MINIO_PID:-}" 2>/dev/null || true' EXIT

cd "$ROOT/frontend"
if [[ ! -d node_modules ]]; then
  npm install
fi

echo
echo "Harsh Hardware"
echo "  App:     http://localhost:5173"
echo "  API:     http://localhost:8000/api/health"
echo "  MinIO:   http://localhost:9001  (harshminio / harshminio123)"
IP="$(ipconfig getifaddr en0 2>/dev/null || true)"
if [[ -n "${IP}" ]]; then
  echo "  Phone:   http://${IP}:5173"
fi
echo

npm run dev
