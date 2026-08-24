#!/usr/bin/env bash

# ==============================================================================
# Persian Accounting System - Linux CLI Management Tool (Sanaei & X-UI Style)
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

# Robust interactive input reading (handles piped bash <(curl ...) properly)
read_input() {
    local prompt="$1"
    local var_name="$2"
    local default_val="$3"
    
    if [ -e /dev/tty ]; then
        read -rp "$prompt" "$var_name" < /dev/tty
    else
        read -rp "$prompt" "$var_name"
    fi
    
    eval "local val=\$$var_name"
    if [ -z "$val" ] && [ -n "$default_val" ]; then
        eval "$var_name=\"$default_val\""
    fi
}

# Check root privileges
check_root() {
    if [[ $EUID -ne 0 ]]; then
        echo -e "${RED}[ERROR] This script must be run as root or with sudo.${NC}"
        exit 1
    fi
}

# Get Server Public/Local IP
get_server_ip() {
    local ip
    ip=$(curl -s -4 --max-time 3 ifconfig.me || curl -s -4 --max-time 3 icanhazip.com || curl -s -4 --max-time 3 ipinfo.io/ip || hostname -I | awk '{print $1}')
    echo "${ip:-127.0.0.1}"
}

# Get Configured Domain
get_configured_domain() {
    if [[ -f "${INSTALL_DIR}/.env" ]]; then
        grep -Po 'DOMAIN=\K[^\s]+' "${INSTALL_DIR}/.env" 2>/dev/null || echo ""
    else
        echo ""
    fi
}

# Print Header Banner in Clean English
print_banner() {
    clear
    local server_ip
    server_ip=$(get_server_ip)
    local domain
    domain=$(get_configured_domain)
    local current_port
    current_port=$(grep -Po 'PORT=\K[0-9]+' "${INSTALL_DIR}/.env" 2>/dev/null || echo "${DEFAULT_PORT}")

    echo -e "${CYAN}====================================================================${NC}"
    echo -e "${WHITE}          Persian Accounting System - Linux Server Manager          ${NC}"
    echo -e "${CYAN}====================================================================${NC}"
    echo -e "  ${YELLOW}GitHub Repo:${NC}     https://github.com/meh732/accounting.git"
    echo -e "  ${YELLOW}Install Path:${NC}    ${INSTALL_DIR}"
    echo -e "  ${YELLOW}Server IP:${NC}       ${WHITE}${server_ip}${NC}"
    
    if [ -n "$domain" ]; then
        echo -e "  ${YELLOW}Active Domain:${NC}   ${GREEN}https://${domain}${NC}"
    fi

    # Status check
    if systemctl is-active --quiet "${SERVICE_NAME}"; then
        echo -e "  ${YELLOW}Service Status:${NC}  ${GREEN}● Active (Running)${NC} on port ${WHITE}${current_port}${NC}"
    elif [[ -f "${SERVICE_FILE}" ]]; then
        echo -e "  ${YELLOW}Service Status:${NC}  ${RED}● Inactive (Stopped)${NC}"
    else
        echo -e "  ${YELLOW}Service Status:${NC}  ${YELLOW}● Not Installed${NC}"
    fi
    echo -e "${CYAN}====================================================================${NC}"
}

# Detect OS and Package Manager
install_prerequisites() {
    echo -e "\n${BLUE}[*] Checking and installing required system packages...${NC}"
    if command -v apt-get &>/dev/null; then
        apt-get update -y
        apt-get install -y curl wget git tar build-essential nginx certbot python3-certbot-nginx socat cron
    elif command -v yum &>/dev/null; then
        yum install -y epel-release 2>/dev/null
        yum update -y
        yum install -y curl wget git tar make gcc gcc-c++ nginx certbot python3-certbot-nginx socat crontabs
    elif command -v dnf &>/dev/null; then
        dnf install -y epel-release 2>/dev/null
        dnf update -y
        dnf install -y curl wget git tar make gcc gcc-c++ nginx certbot python3-certbot-nginx socat crontabs
    fi

    # Install Node.js v20 LTS if missing or version < 18
    if ! command -v node &>/dev/null || [[ $(node -v | cut -d'.' -f1 | tr -d 'v') -lt 18 ]]; then
        echo -e "${BLUE}[*] Installing Node.js v20 LTS...${NC}"
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

    echo -e "${GREEN}[✓] Node.js Version:${NC} $(node -v 2>/dev/null || echo 'N/A')"
    echo -e "${GREEN}[✓] NPM Version:${NC}     $(npm -v 2>/dev/null || echo 'N/A')"
}

# Create Systemd Service File
create_systemd_service() {
    local port=${1:-$DEFAULT_PORT}
    echo -e "${BLUE}[*] Creating system background service (${SERVICE_NAME})...${NC}"

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
    systemctl enable "${SERVICE_NAME}" >/dev/null 2>&1
    systemctl restart "${SERVICE_NAME}"
    echo -e "${GREEN}[✓] Systemd service successfully created and started.${NC}"
}

# Create Backup (Full archive with timestamp)
create_backup() {
    local prefix="${1:-manual}"
    mkdir -p "${BACKUP_DIR}"
    local timestamp
    timestamp=$(date +"%Y%m%d_%H%M%S")
    local backup_file="${BACKUP_DIR}/accounting_backup_${prefix}_${timestamp}.tar.gz"

    if [[ -d "${INSTALL_DIR}" ]]; then
        echo -e "${BLUE}[*] Creating backup archive (${prefix})...${NC}"
        tar --exclude="${INSTALL_DIR}/node_modules" \
            --exclude="${INSTALL_DIR}/.git" \
            --exclude="${INSTALL_DIR}/release" \
            -czf "${backup_file}" -C "$(dirname "${INSTALL_DIR}")" "$(basename "${INSTALL_DIR}")" 2>/dev/null

        if [[ -f "${backup_file}" ]]; then
            local bsize
            bsize=$(du -h "${backup_file}" | cut -f1)
            echo -e "${GREEN}[✓] Backup archive created successfully:${NC} ${backup_file} (${bsize})"
            return 0
        else
            echo -e "${RED}[ERROR] Backup creation failed.${NC}"
            return 1
        fi
    else
        echo -e "${YELLOW}[!] Installation folder not found. Skipped backup.${NC}"
        return 0
    fi
}

# Setup Nginx Domain & Free SSL Certificate (Let's Encrypt)
setup_domain_ssl() {
    print_banner
    echo -e "${WHITE}=== Setup Domain & Free SSL (Let's Encrypt HTTPS) ===${NC}\n"
    
    if [[ ! -d "${INSTALL_DIR}" ]]; then
        echo -e "${RED}[ERROR] Please install the accounting system first (Option 1).${NC}"
        return
    fi

    local current_port
    current_port=$(grep -Po 'PORT=\K[0-9]+' "${INSTALL_DIR}/.env" 2>/dev/null || echo "${DEFAULT_PORT}")

    echo -e "${YELLOW}Notice: Make sure your Domain DNS (A record) points to this server's IP address.${NC}"
    echo -e "Server IP: ${CYAN}$(get_server_ip)${NC}\n"

    local user_domain
    read_input "Enter your Domain / Subdomain (e.g., acc.example.com): " user_domain ""
    
    if [ -z "$user_domain" ]; then
        echo -e "${RED}[ERROR] Domain name cannot be empty.${NC}"
        return
    fi

    # Clean domain string
    user_domain=$(echo "$user_domain" | tr -d ' ' | sed -e 's|^https://||' -e 's|^http://||' -e 's|/$||')

    local user_email
    read_input "Enter email address for SSL renewal alerts [press Enter for default]: " user_email "admin@${user_domain}"

    echo -e "\n${BLUE}[*] Configuring Nginx Reverse Proxy...${NC}"
    if command -v apt-get &>/dev/null; then
        apt-get install -y nginx certbot python3-certbot-nginx
    elif command -v yum &>/dev/null || command -v dnf &>/dev/null; then
        yum install -y nginx certbot python3-certbot-nginx 2>/dev/null || dnf install -y nginx certbot python3-certbot-nginx
    fi

    systemctl enable nginx >/dev/null 2>&1
    systemctl start nginx >/dev/null 2>&1

    # Create Nginx Config
    local nginx_conf="/etc/nginx/conf.d/${user_domain}.conf"
    if [[ -d "/etc/nginx/sites-available" ]]; then
        nginx_conf="/etc/nginx/sites-available/${user_domain}.conf"
    fi

    cat <<EOF > "${nginx_conf}"
server {
    listen 80;
    server_name ${user_domain};

    location / {
        proxy_pass http://127.0.0.1:${current_port};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

    if [[ -d "/etc/nginx/sites-enabled" ]]; then
        ln -sf "${nginx_conf}" "/etc/nginx/sites-enabled/${user_domain}.conf"
    fi

    nginx -t >/dev/null 2>&1
    if [ $? -ne 0 ]; then
        echo -e "${RED}[ERROR] Nginx configuration test failed.${NC}"
        nginx -t
        return
    fi
    systemctl reload nginx

    echo -e "${BLUE}[*] Requesting free SSL Certificate from Let's Encrypt for ${user_domain}...${NC}"
    certbot --nginx --non-interactive --agree-tos --email "${user_email}" -d "${user_domain}" --redirect

    if [ $? -eq 0 ]; then
        # Save domain to .env
        if grep -q "DOMAIN=" "${INSTALL_DIR}/.env"; then
            sed -i "s/DOMAIN=.*/DOMAIN=${user_domain}/g" "${INSTALL_DIR}/.env"
        else
            echo "DOMAIN=${user_domain}" >> "${INSTALL_DIR}/.env"
        fi

        # Setup auto-renew cron
        (crontab -l 2>/dev/null | grep -v "certbot renew"; echo "0 3 * * * certbot renew --quiet --renew-hook 'systemctl reload nginx'") | crontab -

        echo -e "\n${GREEN}====================================================================${NC}"
        echo -e "${WHITE}   [✓] Domain & Free SSL (HTTPS) successfully configured!         ${NC}"
        echo -e "${GREEN}====================================================================${NC}"
        echo -e "  ${WHITE}Secure Web URL:${NC} ${CYAN}https://${user_domain}${NC}"
        echo -e "  ${WHITE}Auto-Renewal:${NC}   ${GREEN}Active (Daily check at 03:00 AM)${NC}"
        echo -e "${GREEN}====================================================================${NC}\n"
    else
        echo -e "${YELLOW}[!] Automatic SSL request was not successful.${NC}"
        echo -e "Check your DNS records or Cloudflare proxy settings."
        echo -e "HTTP Access is available at: ${CYAN}http://${user_domain}${NC}"
    fi
}

# 1. Install Function
install_app() {
    print_banner
    echo -e "${WHITE}=== 1. Install / Reinstall Accounting System ===${NC}\n"

    if [[ -d "${INSTALL_DIR}" ]] && systemctl is-active --quiet "${SERVICE_NAME}"; then
        echo -e "${YELLOW}[!] Accounting system is already installed and running.${NC}"
        local confirm_reinstall
        read_input "Do you want to reinstall and overwrite? [y/N]: " confirm_reinstall "n"
        if [[ ! "${confirm_reinstall}" =~ ^[Yy]$ ]]; then
            echo -e "${BLUE}[*] Installation cancelled.${NC}"
            return
        fi
        create_backup "pre_reinstall"
    fi

    # Port selection
    echo -e "${CYAN}Web Port Configuration:${NC}"
    local custom_port
    read_input "Enter desired web port [Default: ${DEFAULT_PORT}]: " custom_port "${DEFAULT_PORT}"
    if [[ ! "${custom_port}" =~ ^[0-9]+$ ]] || [ "${custom_port}" -lt 1 ] || [ "${custom_port}" -gt 65535 ]; then
        echo -e "${YELLOW}[!] Invalid port number. Using default: ${DEFAULT_PORT}${NC}"
        custom_port=$DEFAULT_PORT
    fi
    echo -e "${GREEN}[✓] Selected Port: ${custom_port}${NC}\n"

    install_prerequisites

    # Prepare directories
    mkdir -p "${INSTALL_DIR}"
    mkdir -p "${BACKUP_DIR}"

    echo -e "${BLUE}[*] Fetching source code from GitHub (${GIT_REPO})...${NC}"
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

    echo -e "${BLUE}[*] Installing Node.js packages (this may take a minute)...${NC}"
    npm install --production=false

    echo -e "${BLUE}[*] Building production assets (npm run build)...${NC}"
    npm run build

    # Create global shortcut command
    ln -sf "${INSTALL_DIR}/accounting.sh" "${BIN_PATH}"
    chmod +x "${INSTALL_DIR}/accounting.sh" "${INSTALL_DIR}/server.js" "${BIN_PATH}" 2>/dev/null

    # Setup & start service
    create_systemd_service "${custom_port}"

    local server_ip
    server_ip=$(get_server_ip)

    echo -e "\n${GREEN}====================================================================${NC}"
    echo -e "${WHITE}   [✓] Persian Accounting System Installed & Running!            ${NC}"
    echo -e "${GREEN}====================================================================${NC}"
    echo -e "  ${WHITE}Web URL:${NC}         ${CYAN}http://${server_ip}:${custom_port}${NC}"
    echo -e "  ${WHITE}Local Access:${NC}    ${CYAN}http://localhost:${custom_port}${NC}"
    echo -e "  ${WHITE}Management CLI:${NC}  Type ${YELLOW}accounting${NC} anywhere in terminal"
    echo -e "${GREEN}====================================================================${NC}\n"

    # Ask for Domain & SSL Setup right away
    local ask_ssl
    read_input "Do you want to configure Domain & Free SSL (HTTPS) now? [y/N]: " ask_ssl "n"
    if [[ "${ask_ssl}" =~ ^[Yy]$ ]]; then
        setup_domain_ssl
    fi
}

# 2. Update Function (AUTOMATIC BACKUP BEFORE UPDATE)
update_app() {
    print_banner
    echo -e "${WHITE}=== 2. Update System to Latest Version (with Auto-Backup) ===${NC}\n"

    if [[ ! -d "${INSTALL_DIR}" ]]; then
        echo -e "${RED}[ERROR] System is not installed yet. Please choose Option 1 first.${NC}"
        return
    fi

    echo -e "${YELLOW}[!] Creating automatic safety backup before updating...${NC}"
    create_backup "pre_update"

    echo -e "\n${BLUE}[*] Pulling latest updates from GitHub repository...${NC}"
    cd "${INSTALL_DIR}" || exit 1
    git fetch --all
    git reset --hard origin/main
    git pull origin main

    echo -e "${BLUE}[*] Updating NPM packages and rebuilding application...${NC}"
    npm install --production=false
    npm run build

    # Read current port
    local current_port
    current_port=$(grep -Po 'PORT=\K[0-9]+' "${INSTALL_DIR}/.env" 2>/dev/null || echo "${DEFAULT_PORT}")

    # Re-link CLI
    ln -sf "${INSTALL_DIR}/accounting.sh" "${BIN_PATH}"
    chmod +x "${INSTALL_DIR}/accounting.sh" "${INSTALL_DIR}/server.js" "${BIN_PATH}" 2>/dev/null

    echo -e "${BLUE}[*] Restarting background system service...${NC}"
    systemctl daemon-reload
    systemctl restart "${SERVICE_NAME}"

    local server_ip
    server_ip=$(get_server_ip)
    local domain
    domain=$(get_configured_domain)

    echo -e "\n${GREEN}====================================================================${NC}"
    echo -e "${WHITE}   [✓] System successfully updated to the latest version!         ${NC}"
    echo -e "${GREEN}====================================================================${NC}"
    if [ -n "$domain" ]; then
        echo -e "  ${WHITE}Web URL:${NC} ${CYAN}https://${domain}${NC}"
    fi
    echo -e "  ${WHITE}Direct IP:${NC} ${CYAN}http://${server_ip}:${current_port}${NC}"
    echo -e "${GREEN}====================================================================${NC}\n"
}

# 3. Change Port Function
change_port() {
    print_banner
    echo -e "${WHITE}=== 3. Change Web Port ===${NC}\n"

    if [[ ! -d "${INSTALL_DIR}" ]]; then
        echo -e "${RED}[ERROR] Accounting system is not installed.${NC}"
        return
    fi

    local current_port
    current_port=$(grep -Po 'PORT=\K[0-9]+' "${INSTALL_DIR}/.env" 2>/dev/null || echo "${DEFAULT_PORT}")
    echo -e "Current Web Port: ${GREEN}${current_port}${NC}\n"

    local new_port
    read_input "Enter new port number [1-65535]: " new_port ""
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

    echo -e "\n${GREEN}[✓] Port changed to ${new_port} and service restarted successfully!${NC}"
    echo -e "  ${WHITE}New URL:${NC} ${CYAN}http://${server_ip}:${new_port}${NC}\n"
}

# 4. Remove Domain / SSL
remove_domain_ssl() {
    print_banner
    echo -e "${WHITE}=== Remove Domain & HTTPS (Revert to Direct IP) ===${NC}\n"
    
    local domain
    domain=$(get_configured_domain)
    if [ -z "$domain" ]; then
        echo -e "${YELLOW}[!] No domain is currently configured.${NC}"
        return
    fi

    echo -e "Active domain: ${CYAN}${domain}${NC}"
    local confirm
    read_input "Are you sure you want to remove this domain and Nginx config? [y/N]: " confirm "n"
    if [[ "${confirm}" =~ ^[Yy]$ ]]; then
        rm -f "/etc/nginx/conf.d/${domain}.conf" "/etc/nginx/sites-available/${domain}.conf" "/etc/nginx/sites-enabled/${domain}.conf"
        systemctl reload nginx 2>/dev/null
        sed -i "/DOMAIN=/d" "${INSTALL_DIR}/.env"
        echo -e "${GREEN}[✓] Domain configuration removed successfully.${NC}"
    fi
}

# Service Control Functions
start_service() {
    echo -e "${BLUE}[*] Starting ${SERVICE_NAME} service...${NC}"
    systemctl start "${SERVICE_NAME}"
    if systemctl is-active --quiet "${SERVICE_NAME}"; then
        echo -e "${GREEN}[✓] Service is now active and running.${NC}"
    else
        echo -e "${RED}[ERROR] Failed to start service. Check logs.${NC}"
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
        echo -e "${RED}[ERROR] Failed to restart service. Check logs.${NC}"
    fi
}

view_status() {
    print_banner
    echo -e "${WHITE}=== Systemd Service Status ===${NC}\n"
    systemctl status "${SERVICE_NAME}" --no-pager -l
}

view_logs() {
    print_banner
    echo -e "${WHITE}=== Live Service Logs (Press Ctrl+C to exit) ===${NC}\n"
    journalctl -u "${SERVICE_NAME}" -f -n 50 --no-pager
}

# Manual Backup Function
manual_backup() {
    print_banner
    echo -e "${WHITE}=== Create Manual Backup Archive ===${NC}\n"
    create_backup "manual"
}

# Restore Backup Function
restore_backup() {
    print_banner
    echo -e "${WHITE}=== Restore Backup Archive ===${NC}\n"

    if [[ ! -d "${BACKUP_DIR}" ]] || [[ $(find "${BACKUP_DIR}" -name "*.tar.gz" | wc -l) -eq 0 ]]; then
        echo -e "${YELLOW}[!] No backup files found in ${BACKUP_DIR}.${NC}"
        return
    fi

    echo -e "${CYAN}Available Backup Archives:${NC}"
    local backups=()
    local i=1
    while IFS= read -r file; do
        backups+=("$file")
        echo -e "  [${YELLOW}${i}${NC}] $(basename "$file") ($(du -h "$file" | cut -f1))"
        ((i++))
    done < <(find "${BACKUP_DIR}" -maxdepth 1 -name "*.tar.gz" | sort -r)

    echo ""
    local choice
    read_input "Enter backup number to restore (or 0 to cancel): " choice "0"

    if [[ "${choice}" =~ ^[0-9]+$ ]] && [ "${choice}" -ge 1 ] && [ "${choice}" -le "${#backups[@]}" ]; then
        local selected_file="${backups[$((choice - 1))]}"
        echo -e "\n${RED}[WARNING] Restoring a backup will overwrite current system files.${NC}"
        local confirm_restore
        read_input "Are you sure you want to proceed with restore? [y/N]: " confirm_restore "n"
        if [[ "${confirm_restore}" =~ ^[Yy]$ ]]; then
            create_backup "pre_restore"
            systemctl stop "${SERVICE_NAME}" 2>/dev/null
            tar -xzf "${selected_file}" -C "$(dirname "${INSTALL_DIR}")"
            systemctl start "${SERVICE_NAME}"
            echo -e "\n${GREEN}[✓] System successfully restored from $(basename "${selected_file}")!${NC}"
        else
            echo -e "${BLUE}[*] Restore cancelled.${NC}"
        fi
    else
        echo -e "${BLUE}[*] Cancelled.${NC}"
    fi
}

# Toggle Auto-Start on Boot
toggle_autostart() {
    print_banner
    echo -e "${WHITE}=== Toggle Auto-Start on System Boot ===${NC}\n"

    if systemctl is-enabled --quiet "${SERVICE_NAME}" 2>/dev/null; then
        echo -e "Current Status: ${GREEN}Enabled (Starts automatically on system boot)${NC}"
        local ans
        read_input "Do you want to disable auto-start on boot? [y/N]: " ans "n"
        if [[ "${ans}" =~ ^[Yy]$ ]]; then
            systemctl disable "${SERVICE_NAME}"
            echo -e "${YELLOW}[✓] Auto-start on boot disabled.${NC}"
        fi
    else
        echo -e "Current Status: ${RED}Disabled${NC}"
        local ans
        read_input "Do you want to enable auto-start on boot? [y/N]: " ans "n"
        if [[ "${ans}" =~ ^[Yy]$ ]]; then
            systemctl enable "${SERVICE_NAME}"
            echo -e "${GREEN}[✓] Auto-start on boot enabled.${NC}"
        fi
    fi
}

# Configure Bots
configure_bots() {
    print_banner
    echo -e "${WHITE}=== Configure Telegram & Bale Notification Bots ===${NC}\n"
    if [[ ! -d "${INSTALL_DIR}" ]]; then
        echo -e "${RED}[ERROR] Accounting system is not installed.${NC}"
        return
    fi
    
    local tg_token
    read_input "Telegram Bot Token (or press Enter to skip): " tg_token ""
    local bale_token
    read_input "Bale Bot Token (or press Enter to skip): " bale_token ""
    
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
    
    if [[ ! -f "/etc/systemd/system/accounting-bot.service" ]]; then
        echo -e "${BLUE}[*] Creating bot background service...${NC}"
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
    
    systemctl enable accounting-bot >/dev/null 2>&1
    systemctl restart accounting-bot
    echo -e "\n${GREEN}[✓] Bot settings saved and service started!${NC}\n"
}

# Export Windows Setup
export_windows_setup() {
    print_banner
    echo -e "${WHITE}=== Export Windows Executable / Setup Files ===${NC}\n"
    if [[ ! -d "${INSTALL_DIR}" ]]; then
        echo -e "${RED}[ERROR] Accounting system is not installed.${NC}"
        return
    fi
    
    local export_dir="/root/accounting_windows_setup"
    rm -rf "${export_dir}"
    mkdir -p "${export_dir}"
    
    cp -r "${INSTALL_DIR}/windows_setup/"* "${export_dir}/" 2>/dev/null
    
    echo -e "${GREEN}[✓] Windows setup files and build scripts exported to:${NC}"
    echo -e "    ${WHITE}${export_dir}${NC}"
    echo -e "\nYou can download this folder to Windows using SFTP / Termius / WinSCP."
    ls -l "${export_dir}"
}

# 15. Uninstall Function (AUTOMATIC BACKUP BEFORE UNINSTALL)
uninstall_app() {
    print_banner
    echo -e "${RED}=== 15. Uninstall Accounting System (with Auto-Backup) ===${NC}\n"

    if [[ ! -d "${INSTALL_DIR}" ]] && [[ ! -f "${SERVICE_FILE}" ]]; then
        echo -e "${YELLOW}[!] No installation found on this server.${NC}"
        return
    fi

    echo -e "${RED}[WARNING] This will stop the service and remove all application code.${NC}"
    local confirm_uninstall
    read_input "Are you sure you want to completely uninstall? [y/N]: " confirm_uninstall "n"
    if [[ ! "${confirm_uninstall}" =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}[*] Uninstall cancelled.${NC}"
        return
    fi

    echo -e "\n${YELLOW}[!] Creating automatic safety backup archive before removal...${NC}"
    create_backup "pre_uninstall"

    echo -e "${BLUE}[*] Stopping and disabling systemd service...${NC}"
    systemctl stop "${SERVICE_NAME}" 2>/dev/null
    systemctl disable "${SERVICE_NAME}" 2>/dev/null
    rm -f "${SERVICE_FILE}"
    systemctl daemon-reload

    echo -e "${BLUE}[*] Removing application directory and binary links...${NC}"
    rm -rf "${INSTALL_DIR}"
    rm -f "${BIN_PATH}"

    echo -e "\n${GREEN}====================================================================${NC}"
    echo -e "${WHITE}   [✓] Persian Accounting successfully removed from server.       ${NC}"
    echo -e "${GREEN}====================================================================${NC}"
    echo -e "  ${YELLOW}Notice:${NC} All safety backups are securely preserved in:"
    echo -e "          ${WHITE}${BACKUP_DIR}${NC}"
    echo -e "${GREEN}====================================================================${NC}\n"
}

# Main Interactive Menu Loop (Standard English CLI)
menu() {
    check_root
    while true; do
        print_banner
        echo -e "${WHITE}  1.${NC}  Install / Reinstall System (with custom Port & SSL)"
        echo -e "${WHITE}  2.${NC}  ${CYAN}Update to Latest Version (with Auto-Backup)${NC}"
        echo -e "${WHITE}  3.${NC}  ${GREEN}Setup Domain & Free SSL Certificate (HTTPS / Let's Encrypt)${NC}"
        echo -e "${WHITE}  4.${NC}  Change Web Port"
        echo -e "${WHITE}  5.${NC}  Remove Domain / Revert to Direct IP"
        echo -e "${CYAN}--------------------------------------------------------------------${NC}"
        echo -e "${WHITE}  6.${NC}  Restart Service"
        echo -e "${WHITE}  7.${NC}  Stop Service"
        echo -e "${WHITE}  8.${NC}  Check Service Status"
        echo -e "${WHITE}  9.${NC}  View Live Server Logs"
        echo -e "${CYAN}--------------------------------------------------------------------${NC}"
        echo -e "${WHITE} 10.${NC}  Create Manual Data Backup"
        echo -e "${WHITE} 11.${NC}  Restore Data from Backup Archive"
        echo -e "${WHITE} 12.${NC}  Toggle Auto-Start on System Boot"
        echo -e "${WHITE} 13.${NC}  Configure Telegram & Bale Bots"
        echo -e "${WHITE} 14.${NC}  Export Windows Setup & EXE Builders"
        echo -e "${WHITE} 15.${NC}  ${RED}Uninstall System Completely (with Auto-Backup)${NC}"
        echo -e "${CYAN}--------------------------------------------------------------------${NC}"
        echo -e "${WHITE}  0.${NC}  Exit"
        echo -e "${CYAN}====================================================================${NC}"
        
        local option
        read_input "Please enter your choice [0-15]: " option ""

        case $option in
            1)  install_app ;;
            2)  update_app ;;
            3)  setup_domain_ssl ;;
            4)  change_port ;;
            5)  remove_domain_ssl ;;
            6)  restart_service ;;
            7)  stop_service ;;
            8)  view_status ;;
            9)  view_logs ;;
            10) manual_backup ;;
            11) restore_backup ;;
            12) toggle_autostart ;;
            13) configure_bots ;;
            14) export_windows_setup ;;
            15) uninstall_app ;;
            0)  echo -e "\n${GREEN}Thank you. Exiting.${NC}\n"; exit 0 ;;
            *)  echo -e "\n${RED}[!] Invalid option selected.${NC}" ;;
        esac

        echo ""
        local enter_key
        read_input "Press Enter to return to main menu..." enter_key ""
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
        ssl)        setup_domain_ssl ;;
        port)       change_port ;;
        uninstall)  uninstall_app ;;
        start)      start_service ;;
        stop)       stop_service ;;
        restart)    restart_service ;;
        status)     view_status ;;
        logs)       view_logs ;;
        backup)     manual_backup ;;
        restore)    restore_backup ;;
        *)          echo "Usage: accounting {install|update|ssl|port|uninstall|start|stop|restart|status|logs|backup|restore}" ;;
    esac
fi
