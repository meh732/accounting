#!/usr/bin/env bash

# ==============================================================================
# Persian Accounting System - Linux Server Management & Installation CLI
# Repository: https://github.com/meh732/accounting.git
# Run: bash <(curl -Ls https://raw.githubusercontent.com/meh732/accounting/main/install.sh)
# ==============================================================================

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m'

# Check root privileges
if [[ $EUID -ne 0 ]]; then
    echo -e "\n${RED}[ERROR] This script must be run as root or with sudo!${NC}\n"
    exit 1
fi

INSTALL_DIR="/var/www/accounting"
BIN_PATH="/usr/local/bin/accounting"

echo -e "\n${BLUE}[*] Initializing environment and verifying basic tools (curl, wget, git, cron)...${NC}"
if command -v apt-get &>/dev/null; then
    apt-get update -qq >/dev/null 2>&1
    apt-get install -y -qq curl wget git tar socat cron >/dev/null 2>&1
elif command -v yum &>/dev/null; then
    yum install -y -q curl wget git tar socat crontabs >/dev/null 2>&1
elif command -v dnf &>/dev/null; then
    dnf install -y -q curl wget git tar socat crontabs >/dev/null 2>&1
fi

# Download latest management CLI script from GitHub
mkdir -p /tmp/accounting_installer
curl -sSL https://raw.githubusercontent.com/meh732/accounting/main/accounting.sh -o /tmp/accounting_installer/accounting.sh
chmod +x /tmp/accounting_installer/accounting.sh

# Open interactive Main Menu directly
if [ -e /dev/tty ]; then
    bash /tmp/accounting_installer/accounting.sh < /dev/tty
else
    bash /tmp/accounting_installer/accounting.sh
fi

# Clean temporary installer files
rm -rf /tmp/accounting_installer
