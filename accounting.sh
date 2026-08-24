#!/usr/bin/env bash

# ==============================================================================
# Persian Accounting System - Linux CLI Management Tool (Sanaei Style)
# Repository: https://github.com/meh732/accounting.git
# Author: meh732
# ==============================================================================

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# Global Configuration
INSTALL_DIR="/var/www/accounting"
BACKUP_DIR="/var/backups/accounting"
SERVICE_NAME="accounting"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
GIT_REPO="https://github.com/meh732/accounting.git"
DEFAULT_PORT=3000
BIN_PATH="/usr/local/bin/accounting"

# Check root privileges
check_root() {
    if [[ $EUID -ne 0 ]]; then
        echo -e "${RED}[ERROR] This script must be run as root (or with sudo).${NC}"
        exit 1
    fi
}

# Get Server Public/Local IP
get_server_ip() {
    local ip
    ip=$(curl -s -4 ifconfig.me || curl -s -4 icanhazip.com || curl -s -4 ipinfo.io/ip || hostname -I | awk '{print $1}')
    echo "${ip:-127.0.0.1}"
}

# Print Colorful Header Banner
print_banner() {
    clear
    echo -e "${CYAN}====================================================================${NC}"
    echo -e "${WHITE}           Persian Accounting System - Linux CLI Manager            ${NC}"
    echo -e "${CYAN}====================================================================${NC}"
    echo -e "  ${YELLOW}Repository:${NC}  https://github.com/meh732/accounting.git"
    echo -e "  ${YELLOW}App Path:${NC}    ${INSTALL_DIR}"
    echo -e "  ${YELLOW}Backup Path:${NC} ${BACKUP_DIR}"

    # Status check
    if systemctl is-active --quiet "${SERVICE_NAME}"; then
        local current_port
        current_port=$(grep -Po 'PORT=\K[0-9]+' "${INSTALL_DIR}/.env" 2>/dev/null || echo "${DEFAULT_PORT}")
        echo -e "  ${YELLOW}Status:${NC}      ${GREEN}● Running (Active)${NC} on port ${WHITE}${current_port}${NC}"
    elif [[ -f "${SERVICE_FILE}" ]]; then
        echo -e "  ${YELLOW}Status:${NC}      ${RED}● Stopped (Inactive)${NC}"
    else
        echo -e "  ${YELLOW}Status:${NC}      ${YELLOW}● Not Installed${NC}"
    fi
    echo -e "${CYAN}====================================================================${NC}"
}

# Detect OS and Package Manager
install_prerequisites() {
    echo -e "\n${BLUE}[*] Checking and installing system dependencies...${NC}"
    if command -v apt-get &>/dev/null; then
        apt-get update -y
        apt-get install -y curl wget git tar build-essential
    elif command -v yum &>/dev/null; then
        yum update -y
        yum install -y curl wget git tar make gcc gcc-c++
    elif command -v dnf &>/dev/null; then
        dnf update -y
        dnf install -y curl wget git tar make gcc gcc-c++
    elif command -v pacman &>/dev/null; then
        pacman -Sy --noconfirm curl wget git tar base-devel
    else
        echo -e "${YELLOW}[!] Warning: Unknown package manager. Please ensure git, curl, and tar are installed.${NC}"
    fi

    # Install Node.js v20 LTS if not present or < 18
    if ! command -v node &>/dev/null || [[ $(node -v | cut -d'.' -f1 | tr -d 'v') -lt 18 ]]; then
        echo -e "${BLUE}[*] Installing Node.js v20 LTS (NodeSource)...${NC}"
        if command -v apt-get &>/dev/null; then
            curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
            apt-get install -y nodejs
        elif command -v yum &>/dev/null || command -v dnf &>/dev/null; then
            curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
            if command -v dnf &>/dev/null; then
                dnf install -y nodejs
            else
                yum install -y nodejs
            fi
        fi
    fi

    echo -e "${GREEN}[✓] Node.js version:${NC} $(node -v 2>/dev/null || echo 'N/A')"
    echo -e "${GREEN}[✓] NPM version:${NC}     $(npm -v 2>/dev/null || echo 'N/A')"
}

# Create Systemd Service File
create_systemd_service() {
    local port=${1:-$DEFAULT_PORT}
    echo -e "${BLUE}[*] Creating systemd service [${SERVICE_NAME}]...${NC}"

    cat <<EOF > "${SERVICE_FILE}"
[Unit]
Description=Persian Accounting Web Service
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=${INSTALL_DIR}
ExecStart=$(which node) ${INSTALL_DIR}/server.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=${port}
Environment=HOST=0.0.0.0

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    systemctl enable "${SERVICE_NAME}"
    systemctl restart "${SERVICE_NAME}"
    echo -e "${GREEN}[✓] Systemd service created and enabled.${NC}"
}

# Create Backup (Full archive with timestamp)
create_backup() {
    local prefix="${1:-manual}"
    mkdir -p "${BACKUP_DIR}"
    local timestamp
    timestamp=$(date +"%Y%m%d_%H%M%S")
    local backup_file="${BACKUP_DIR}/accounting_backup_${prefix}_${timestamp}.tar.gz"

    if [[ -d "${INSTALL_DIR}" ]]; then
        echo -e "${BLUE}[*] Creating backup (${prefix})...${NC}"
        tar --exclude="${INSTALL_DIR}/node_modules" \
            --exclude="${INSTALL_DIR}/.git" \
            -czf "${backup_file}" -C "$(dirname "${INSTALL_DIR}")" "$(basename "${INSTALL_DIR}")" 2>/dev/null

        if [[ -f "${backup_file}" ]]; then
            local bsize
            bsize=$(du -h "${backup_file}" | cut -f1)
            echo -e "${GREEN}[✓] Backup created successfully:${NC} ${backup_file} (${bsize})"
            return 0
        else
            echo -e "${RED}[ERROR] Failed to create backup.${NC}"
            return 1
        fi
    else
        echo -e "${YELLOW}[!] App directory does not exist. Skipping backup.${NC}"
        return 0
    fi
}

# 1. Install Function
install_app() {
    print_banner
    echo -e "${WHITE}=== 1. Install Persian Accounting System ===${NC}\n"

    if [[ -d "${INSTALL_DIR}" ]] && systemctl is-active --quiet "${SERVICE_NAME}"; then
        echo -e "${YELLOW}[!] The application is already installed and running.${NC}"
        read -rp "Do you want to reinstall and overwrite? [y/N]: " confirm_reinstall
        if [[ ! "${confirm_reinstall}" =~ ^[Yy]$ ]]; then
            echo -e "${BLUE}[*] Installation cancelled.${NC}"
            return
        fi
        create_backup "pre_reinstall"
    fi

    # Port selection
    read -rp "Enter web port to listen on [Default: ${DEFAULT_PORT}]: " custom_port
    custom_port=${custom_port:-$DEFAULT_PORT}

    install_prerequisites

    # Prepare directories
    mkdir -p "${INSTALL_DIR}"
    mkdir -p "${BACKUP_DIR}"

    echo -e "${BLUE}[*] Cloning repository from ${GIT_REPO}...${NC}"
    if [[ -d "${INSTALL_DIR}/.git" ]]; then
        cd "${INSTALL_DIR}" || exit 1
        git fetch --all
        git reset --hard origin/main
        git pull origin main
    else
        rm -rf "${INSTALL_DIR:?}"/*
        git clone "${GIT_REPO}" "${INSTALL_DIR}"
    fi

    cd "${INSTALL_DIR}" || exit 1

    # Create .env
    cat <<EOF > "${INSTALL_DIR}/.env"
PORT=${custom_port}
HOST=0.0.0.0
NODE_ENV=production
EOF

    echo -e "${BLUE}[*] Installing npm dependencies...${NC}"
    npm config set registry https://registry.npmmirror.com && npm install --production=false

    echo -e "${BLUE}[*] Building production assets (Vite)...${NC}"
    npm run build

    # Create global shortcut command
    ln -sf "${INSTALL_DIR}/accounting.sh" "${BIN_PATH}"
    chmod +x "${INSTALL_DIR}/accounting.sh" "${INSTALL_DIR}/server.js" "${BIN_PATH}" 2>/dev/null

    # Setup & start service
    create_systemd_service "${custom_port}"

    local server_ip
    server_ip=$(get_server_ip)

    echo -e "\n${GREEN}====================================================================${NC}"
    echo -e "${WHITE}   [✓] Persian Accounting System Installed Successfully!          ${NC}"
    echo -e "${GREEN}====================================================================${NC}"
    echo -e "  ${WHITE}Access URL:${NC}    ${CYAN}http://${server_ip}:${custom_port}${NC}"
    echo -e "  ${WHITE}Local URL:${NC}     ${CYAN}http://localhost:${custom_port}${NC}"
    echo -e "  ${WHITE}CLI Command:${NC}   Type ${YELLOW}accounting${NC} anywhere in terminal"
    echo -e "${GREEN}====================================================================${NC}\n"
}

# 2. Update Function (Auto-Backup first)
update_app() {
    print_banner
    echo -e "${WHITE}=== 2. Update Persian Accounting System ===${NC}\n"

    if [[ ! -d "${INSTALL_DIR}" ]]; then
        echo -e "${RED}[ERROR] Accounting system is not installed. Please choose option 1 first.${NC}"
        return
    fi

    echo -e "${YELLOW}[!] A full backup will be created automatically before updating.${NC}"
    create_backup "pre_update"

    echo -e "\n${BLUE}[*] Pulling latest updates from GitHub repository...${NC}"
    cd "${INSTALL_DIR}" || exit 1
    git fetch --all
    git reset --hard origin/main
    git pull origin main

    echo -e "${BLUE}[*] Updating npm dependencies...${NC}"
    npm config set registry https://registry.npmmirror.com && npm install --production=false

    echo -e "${BLUE}[*] Rebuilding application...${NC}"
    npm run build

    # Read current port
    local current_port
    current_port=$(grep -Po 'PORT=\K[0-9]+' "${INSTALL_DIR}/.env" 2>/dev/null || echo "${DEFAULT_PORT}")

    # Re-link CLI
    ln -sf "${INSTALL_DIR}/accounting.sh" "${BIN_PATH}"
    chmod +x "${INSTALL_DIR}/accounting.sh" "${INSTALL_DIR}/server.js" "${BIN_PATH}" 2>/dev/null

    echo -e "${BLUE}[*] Restarting systemd service...${NC}"
    systemctl daemon-reload
    systemctl restart "${SERVICE_NAME}"

    local server_ip
    server_ip=$(get_server_ip)

    echo -e "\n${GREEN}====================================================================${NC}"
    echo -e "${WHITE}   [✓] System Updated and Service Restarted Successfully!         ${NC}"
    echo -e "${GREEN}====================================================================${NC}"
    echo -e "  ${WHITE}URL:${NC} ${CYAN}http://${server_ip}:${current_port}${NC}"
    echo -e "${GREEN}====================================================================${NC}\n"
}

# 3. Uninstall Function (Auto-Backup first)
uninstall_app() {
    print_banner
    echo -e "${RED}=== 3. Uninstall Persian Accounting System ===${NC}\n"

    if [[ ! -d "${INSTALL_DIR}" ]] && [[ ! -f "${SERVICE_FILE}" ]]; then
        echo -e "${YELLOW}[!] Accounting system is not found on this server.${NC}"
        return
    fi

    echo -e "${RED}[WARNING] This will stop the service and remove the application files.${NC}"
    read -rp "Are you sure you want to completely uninstall? [y/N]: " confirm_uninstall
    if [[ ! "${confirm_uninstall}" =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}[*] Uninstallation cancelled.${NC}"
        return
    fi

    echo -e "\n${YELLOW}[!] Creating mandatory safety backup before uninstall...${NC}"
    create_backup "pre_uninstall"

    echo -e "${BLUE}[*] Stopping and disabling systemd service...${NC}"
    systemctl stop "${SERVICE_NAME}" 2>/dev/null
    systemctl disable "${SERVICE_NAME}" 2>/dev/null
    rm -f "${SERVICE_FILE}"
    systemctl daemon-reload

    echo -e "${BLUE}[*] Removing application files...${NC}"
    rm -rf "${INSTALL_DIR}"
    rm -f "${BIN_PATH}"

    echo -e "\n${GREEN}====================================================================${NC}"
    echo -e "${WHITE}   [✓] Persian Accounting System Uninstalled Successfully!        ${NC}"
    echo -e "${GREEN}====================================================================${NC}"
    echo -e "  ${YELLOW}Notice:${NC} All pre-uninstall backups are safely preserved in:"
    echo -e "          ${WHITE}${BACKUP_DIR}${NC}"
    echo -e "${GREEN}====================================================================${NC}\n"
}

# 4. Service Control Functions
start_service() {
    echo -e "${BLUE}[*] Starting ${SERVICE_NAME} service...${NC}"
    systemctl start "${SERVICE_NAME}"
    if systemctl is-active --quiet "${SERVICE_NAME}"; then
        echo -e "${GREEN}[✓] Service started successfully.${NC}"
    else
        echo -e "${RED}[ERROR] Failed to start service. Check logs (Option 8).${NC}"
    fi
}

stop_service() {
    echo -e "${BLUE}[*] Stopping ${SERVICE_NAME} service...${NC}"
    systemctl stop "${SERVICE_NAME}"
    echo -e "${YELLOW}[✓] Service stopped.${NC}"
}

restart_service() {
    echo -e "${BLUE}[*] Restarting ${SERVICE_NAME} service...${NC}"
    systemctl restart "${SERVICE_NAME}"
    if systemctl is-active --quiet "${SERVICE_NAME}"; then
        echo -e "${GREEN}[✓] Service restarted successfully.${NC}"
    else
        echo -e "${RED}[ERROR] Failed to restart service. Check logs (Option 8).${NC}"
    fi
}

# 7. Status Function
view_status() {
    print_banner
    echo -e "${WHITE}=== Systemd Service Status ===${NC}\n"
    systemctl status "${SERVICE_NAME}" --no-pager -l
}

# 8. View Logs Function
view_logs() {
    print_banner
    echo -e "${WHITE}=== Live Service Logs (Press Ctrl+C to exit) ===${NC}\n"
    journalctl -u "${SERVICE_NAME}" -f -n 50 --no-pager
}

# 9. Change Port Function
change_port() {
    print_banner
    echo -e "${WHITE}=== 9. Change Web Port ===${NC}\n"

    if [[ ! -d "${INSTALL_DIR}" ]]; then
        echo -e "${RED}[ERROR] Application is not installed.${NC}"
        return
    fi

    local current_port
    current_port=$(grep -Po 'PORT=\K[0-9]+' "${INSTALL_DIR}/.env" 2>/dev/null || echo "${DEFAULT_PORT}")
    echo -e "Current configured port: ${GREEN}${current_port}${NC}"

    read -rp "Enter new port [1-65535]: " new_port
    if [[ ! "${new_port}" =~ ^[0-9]+$ ]] || [ "${new_port}" -lt 1 ] || [ "${new_port}" -gt 65535 ]; then
        echo -e "${RED}[ERROR] Invalid port number.${NC}"
        return
    fi

    # Update .env
    sed -i "s/PORT=.*/PORT=${new_port}/g" "${INSTALL_DIR}/.env"

    # Recreate service with new port
    create_systemd_service "${new_port}"

    local server_ip
    server_ip=$(get_server_ip)

    echo -e "\n${GREEN}[✓] Port updated to ${new_port} and service restarted!${NC}"
    echo -e "  ${WHITE}New URL:${NC} ${CYAN}http://${server_ip}:${new_port}${NC}\n"
}

# 10. Manual Backup Function
manual_backup() {
    print_banner
    echo -e "${WHITE}=== 10. Create System Backup ===${NC}\n"
    create_backup "manual"
}

# 11. Restore Backup Function
restore_backup() {
    print_banner
    echo -e "${WHITE}=== 11. Restore System Backup ===${NC}\n"

    if [[ ! -d "${BACKUP_DIR}" ]] || [[ $(find "${BACKUP_DIR}" -name "*.tar.gz" | wc -l) -eq 0 ]]; then
        echo -e "${YELLOW}[!] No backup archives found in ${BACKUP_DIR}.${NC}"
        return
    fi

    echo -e "${CYAN}Available backups:${NC}"
    local backups=()
    local i=1
    while IFS= read -r file; do
        backups+=("$file")
        echo -e "  [${YELLOW}${i}${NC}] $(basename "$file") ($(du -h "$file" | cut -f1))"
        ((i++))
    done < <(find "${BACKUP_DIR}" -maxdepth 1 -name "*.tar.gz" | sort -r)

    echo ""
    read -rp "Select backup number to restore (or '0' to cancel): " choice

    if [[ "${choice}" =~ ^[0-9]+$ ]] && [ "${choice}" -ge 1 ] && [ "${choice}" -le "${#backups[@]}" ]; then
        local selected_file="${backups[$((choice - 1))]}"
        echo -e "\n${RED}[WARNING] Restoring will overwrite current application files in ${INSTALL_DIR}.${NC}"
        read -rp "Are you sure? [y/N]: " confirm_restore
        if [[ "${confirm_restore}" =~ ^[Yy]$ ]]; then
            create_backup "pre_restore"
            systemctl stop "${SERVICE_NAME}" 2>/dev/null
            tar -xzf "${selected_file}" -C "$(dirname "${INSTALL_DIR}")"
            systemctl start "${SERVICE_NAME}"
            echo -e "\n${GREEN}[✓] Restored successfully from $(basename "${selected_file}")!${NC}"
        else
            echo -e "${BLUE}[*] Restore cancelled.${NC}"
        fi
    else
        echo -e "${BLUE}[*] Cancelled.${NC}"
    fi
}

# 12. Enable/Disable Boot Auto-Start
toggle_autostart() {
    print_banner
    echo -e "${WHITE}=== 12. Toggle Auto-Start on System Boot ===${NC}\n"

    if systemctl is-enabled --quiet "${SERVICE_NAME}" 2>/dev/null; then
        echo -e "Current status: ${GREEN}Enabled (Starts on Boot)${NC}"
        read -rp "Do you want to disable auto-start? [y/N]: " ans
        if [[ "${ans}" =~ ^[Yy]$ ]]; then
            systemctl disable "${SERVICE_NAME}"
            echo -e "${YELLOW}[✓] Auto-start disabled.${NC}"
        fi
    else
        echo -e "Current status: ${RED}Disabled${NC}"
        read -rp "Do you want to enable auto-start? [y/N]: " ans
        if [[ "${ans}" =~ ^[Yy]$ ]]; then
            systemctl enable "${SERVICE_NAME}"
            echo -e "${GREEN}[✓] Auto-start enabled.${NC}"
        fi
    fi
}


# 13. Configure Bots
configure_bots() {
    print_banner
    echo -e "${WHITE}=== 13. Configure Telegram & Bale Bots ===${NC}\n"
    if [[ ! -d "${INSTALL_DIR}" ]]; then
        echo -e "${RED}[ERROR] Application is not installed.${NC}"
        return
    fi
    
    echo -e "${YELLOW}Note: Bots require the server to be accessible via a public IP/domain for webhooks.${NC}"
    echo -e "Leave blank to keep existing configuration.\n"
    
    read -rp "Enter Telegram Bot Token: " tg_token
    read -rp "Enter Bale Bot Token: " bale_token
    
    if [ -n "$tg_token" ]; then
        if grep -q "TELEGRAM_BOT_TOKEN=" "${INSTALL_DIR}/.env"; then
            sed -i "s/TELEGRAM_BOT_TOKEN=.*/TELEGRAM_BOT_TOKEN=${tg_token}/g" "${INSTALL_DIR}/.env"
        else
            echo "TELEGRAM_BOT_TOKEN=${tg_token}" >> "${INSTALL_DIR}/.env"
        fi
    fi
    
    if [ -n "$bale_token" ]; then
        if grep -q "BALE_BOT_TOKEN=" "${INSTALL_DIR}/.env"; then
            sed -i "s/BALE_BOT_TOKEN=.*/BALE_BOT_TOKEN=${bale_token}/g" "${INSTALL_DIR}/.env"
        else
            echo "BALE_BOT_TOKEN=${bale_token}" >> "${INSTALL_DIR}/.env"
        fi
    fi
    
    # Create systemd service for bot if it doesn't exist
    if [[ ! -f "/etc/systemd/system/accounting-bot.service" ]]; then
        echo -e "${BLUE}[*] Creating systemd service for bots...${NC}"
        cat <<EOF_BOT > /etc/systemd/system/accounting-bot.service
[Unit]
Description=Persian Accounting Telegram/Bale Bot
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=${INSTALL_DIR}
ExecStart=$(which node) ${INSTALL_DIR}/bot_server.js
Restart=always
RestartSec=5
EnvironmentFile=${INSTALL_DIR}/.env

[Install]
WantedBy=multi-user.target
EOF_BOT
        systemctl daemon-reload
    fi
    
    systemctl enable accounting-bot 2>/dev/null
    systemctl restart accounting-bot
    echo -e "\n${GREEN}[✓] Bots configured and service restarted!${NC}\n"
}

# 14. Export Windows Setup
export_windows_setup() {
    print_banner
    echo -e "${WHITE}=== 14. Export Windows Setup Files ===${NC}\n"
    if [[ ! -d "${INSTALL_DIR}" ]]; then
        echo -e "${RED}[ERROR] Application is not installed.${NC}"
        return
    fi
    
    local export_dir="/root/accounting_windows_setup"
    rm -rf "${export_dir}"
    mkdir -p "${export_dir}"
    
    cp -r "${INSTALL_DIR}/windows_setup/"* "${export_dir}/" 2>/dev/null
    
    echo -e "${GREEN}[✓] Windows setup files exported successfully to:${NC}"
    echo -e "    ${WHITE}${export_dir}${NC}"
    echo -e "\nYou can download this folder to your Windows machine using SFTP/SCP."
    echo -e "Files included:"
    ls -l "${export_dir}"
}
# Main Interactive Menu Loop
menu() {
    check_root
    while true; do
        print_banner
        echo -e "${WHITE}  1.${NC}  Install Accounting App"
        echo -e "${WHITE}  2.${NC}  ${CYAN}Update App (Auto-Backup First)${NC}"
        echo -e "${WHITE}  3.${NC}  ${RED}Uninstall App (Auto-Backup First)${NC}"
        echo -e "${CYAN}--------------------------------------------------------------------${NC}"
        echo -e "${WHITE}  4.${NC}  Start Service"
        echo -e "${WHITE}  5.${NC}  Stop Service"
        echo -e "${WHITE}  6.${NC}  Restart Service"
        echo -e "${WHITE}  7.${NC}  View Service Status"
        echo -e "${WHITE}  8.${NC}  View Live Logs (journalctl)"
        echo -e "${CYAN}--------------------------------------------------------------------${NC}"
        echo -e "${WHITE}  9.${NC}  Change Web Port"
        echo -e "${WHITE} 10.${NC}  Create Full System Backup"
        echo -e "${WHITE} 11.${NC}  Restore from Backup"
        echo -e "${WHITE} 12.${NC}  Toggle Auto-Start on Boot"
        echo -e "${WHITE} 13.${NC}  Configure Telegram & Bale Bots"
        echo -e "${WHITE} 14.${NC}  Export Windows Setup Files (Offline Server & Client)"
        echo -e "${CYAN}--------------------------------------------------------------------${NC}"
        echo -e "${WHITE}  0.${NC}  Exit"
        echo -e "${CYAN}====================================================================${NC}"
        read -rp "Enter choice [0-14]: " option

        case $option in
            1)  install_app ;;
            2)  update_app ;;
            3)  uninstall_app ;;
            4)  start_service ;;
            5)  stop_service ;;
            6)  restart_service ;;
            7)  view_status ;;
            8)  view_logs ;;
            9)  change_port ;;
            10) manual_backup ;;
            11) restore_backup ;;
            12) toggle_autostart ;;
            13) configure_bots ;;
            14) export_windows_setup ;;
            0)  echo -e "\n${GREEN}Goodbye!${NC}\n"; exit 0 ;;
            *)  echo -e "\n${RED}[!] Invalid choice. Please select 0-14.${NC}" ;;
        esac

        echo ""
        read -rp "Press Enter to return to main menu..."
    done
}

# Handle CLI arguments or open interactive menu
if [[ $# -eq 0 ]]; then
    menu
else
    check_root
    case $1 in
        install)    install_app ;;
        update)     update_app ;;
        uninstall)  uninstall_app ;;
        start)      start_service ;;
        stop)       stop_service ;;
        restart)    restart_service ;;
        status)     view_status ;;
        logs)       view_logs ;;
        backup)     manual_backup ;;
        restore)    restore_backup ;;
        *)          echo "Usage: accounting {install|update|uninstall|start|stop|restart|status|logs|backup|restore}" ;;
    esac
fi
