#!/usr/bin/env bash

# ==============================================================================
# Persian Accounting System - One-Line Installer Script
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

clear
echo -e "${CYAN}====================================================================${NC}"
echo -e "${WHITE}    Persian Accounting System - Automatic Linux Installer (CLI)    ${NC}"
echo -e "       ${YELLOW}Repository: https://github.com/meh732/accounting.git${NC}"
echo -e "${CYAN}====================================================================${NC}\n"

# Check root privileges
if [[ $EUID -ne 0 ]]; then
    echo -e "${RED}[ERROR] This script must be run as root or with sudo!${NC}"
    exit 1
fi

INSTALL_DIR="/var/www/accounting"
BIN_PATH="/usr/local/bin/accounting"

echo -e "${BLUE}[*] Checking and updating essential system packages...${NC}"
if command -v apt-get &>/dev/null; then
    apt-get update -qq
    apt-get install -y -qq curl wget git tar socat cron >/dev/null 2>&1
elif command -v yum &>/dev/null; then
    yum install -y -q curl wget git tar socat crontabs >/dev/null 2>&1
elif command -v dnf &>/dev/null; then
    dnf install -y -q curl wget git tar socat crontabs >/dev/null 2>&1
fi
echo -e "${GREEN}[✓] Base prerequisites ready.${NC}\n"

# Download latest management script from GitHub
mkdir -p /tmp/accounting_installer
echo -e "${BLUE}[*] Fetching latest accounting management script from GitHub...${NC}"
curl -sSL https://raw.githubusercontent.com/meh732/accounting/main/accounting.sh -o /tmp/accounting_installer/accounting.sh
chmod +x /tmp/accounting_installer/accounting.sh

# Run install routine interactively with terminal TTY access
if [ -t 0 ]; then
    bash /tmp/accounting_installer/accounting.sh install
elif [ -e /dev/tty ]; then
    bash /tmp/accounting_installer/accounting.sh install < /dev/tty
else
    bash /tmp/accounting_installer/accounting.sh install
fi

# Clean up
rm -rf /tmp/accounting_installer
