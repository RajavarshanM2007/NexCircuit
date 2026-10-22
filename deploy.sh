#!/usr/bin/env bash
# ============================================================
# VIT ELECTRONICS — Root One-Click Deployment Launcher
# ============================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec "${SCRIPT_DIR}/infrastructure/scripts/deploy-aws-complete.sh" "$@"
