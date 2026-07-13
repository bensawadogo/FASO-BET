#!/bin/bash
set -e

exec python -m uvicorn api.main:app --host 0.0.0.0 --port 8000 --workers 1
