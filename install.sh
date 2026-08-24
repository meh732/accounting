#!/usr/bin/env bash

# ==============================================================================
# Persian Accounting System - Linux Server Manager (CLI)
# Repository: https://github.com/meh732/accounting.git
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
if [[ $EUID -ne 0 ]]; then
    echo -e "\n${RED}[ERROR] This script must be run as root or with sudo.${NC}\n"
    exit 1
fi

# Robust input reader that works seamlessly with curl pipe and TTY
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

get_server_ip() {
    local ip
    ip=$(curl -s -4 --max-time 2 ifconfig.me || curl -s -4 --max-time 2 icanhazip.com || hostname -I | awk '{print $1}')
    echo "${ip:-127.0.0.1}"
}

get_configured_domain() {
    if [[ -f "${INSTALL_DIR}/.env" ]]; then
        grep -Po 'DOMAIN=\K[^\s]+' "${INSTALL_DIR}/.env" 2>/dev/null || echo ""
    else
        echo ""
    fi
}

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

    if systemctl is-active --quiet "${SERVICE_NAME}" 2>/dev/null; then
        echo -e "  ${YELLOW}Service Status:${NC}  ${GREEN}● Active (Running)${NC} on port ${WHITE}${current_port}${NC}"
    elif [[ -f "${SERVICE_FILE}" ]]; then
        echo -e "  ${YELLOW}Service Status:${NC}  ${RED}● Inactive (Stopped)${NC}"
    else
        echo -e "  ${YELLOW}Service Status:${NC}  ${YELLOW}● Not Installed${NC}"
    fi
    echo -e "${CYAN}====================================================================${NC}"
}

install_prerequisites() {
    echo -e "\n${BLUE}[*] Updating package repositories and installing prerequisites...${NC}"
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

    # Install Node.js v20 LTS if missing or < 18
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
}

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
            echo -e "${GREEN}[✓] Safety backup successfully saved to:${NC} ${backup_file} (${bsize})"
            return 0
        fi
    fi
    return 0
}

create_systemd_service() {
    local port=${1:-$DEFAULT_PORT}
    echo -e "${BLUE}[*] Creating system background service (${SERVICE_NAME})...${NC}"

    local entry_file="${INSTALL_DIR}/server.js"

    cat <<EOF > "${SERVICE_FILE}"
[Unit]
Description=Persian Accounting Central Web & Database Service
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=${INSTALL_DIR}
ExecStart=$(which node) ${entry_file}
Restart=always
RestartSec=3
Environment=NODE_ENV=production
Environment=PORT=${port}
Environment=HOST=0.0.0.0

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    systemctl enable "${SERVICE_NAME}" >/dev/null 2>&1
    systemctl restart "${SERVICE_NAME}"
    echo -e "${GREEN}[✓] System service enabled and started on port ${port}.${NC}"
}

setup_domain_ssl() {
    print_banner
    echo -e "${WHITE}=== Setup Domain & Free SSL (Let's Encrypt HTTPS) ===${NC}\n"
    
    if [[ ! -d "${INSTALL_DIR}" ]]; then
        echo -e "${RED}[ERROR] Please install the system first (Option 1).${NC}"
        return
    fi

    local current_port
    current_port=$(grep -Po 'PORT=\K[0-9]+' "${INSTALL_DIR}/.env" 2>/dev/null || echo "${DEFAULT_PORT}")

    echo -e "${YELLOW}Ensure your domain DNS (A record) points to Server IP:${NC} ${CYAN}$(get_server_ip)${NC}\n"

    local user_domain
    read_input "Enter your Domain / Subdomain (e.g., acc.example.com): " user_domain ""
    
    if [ -z "$user_domain" ]; then
        echo -e "${RED}[ERROR] Domain name cannot be empty.${NC}"
        return
    fi

    user_domain=$(echo "$user_domain" | tr -d ' ' | sed -e 's|^https://||' -e 's|^http://||' -e 's|/$||')

    local user_email
    read_input "Enter email for SSL alerts [Press Enter for default]: " user_email "admin@${user_domain}"

    echo -e "\n${BLUE}[*] Configuring Nginx Reverse Proxy...${NC}"
    if command -v apt-get &>/dev/null; then
        apt-get install -y nginx certbot python3-certbot-nginx >/dev/null 2>&1
    elif command -v yum &>/dev/null || command -v dnf &>/dev/null; then
        yum install -y nginx certbot python3-certbot-nginx 2>/dev/null || dnf install -y nginx certbot python3-certbot-nginx 2>/dev/null
    fi

    systemctl enable nginx >/dev/null 2>&1
    systemctl start nginx >/dev/null 2>&1

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
        echo -e "${RED}[ERROR] Nginx configuration syntax error.${NC}"
        return
    fi
    systemctl reload nginx

    echo -e "${BLUE}[*] Requesting free SSL certificate from Let's Encrypt...${NC}"
    certbot --nginx --non-interactive --agree-tos --email "${user_email}" -d "${user_domain}" --redirect

    if [ $? -eq 0 ]; then
        if grep -q "DOMAIN=" "${INSTALL_DIR}/.env"; then
            sed -i "s/DOMAIN=.*/DOMAIN=${user_domain}/g" "${INSTALL_DIR}/.env"
        else
            echo "DOMAIN=${user_domain}" >> "${INSTALL_DIR}/.env"
        fi

        (crontab -l 2>/dev/null | grep -v "certbot renew"; echo "0 3 * * * certbot renew --quiet --renew-hook 'systemctl reload nginx'") | crontab -

        echo -e "\n${GREEN}====================================================================${NC}"
        echo -e "${WHITE}   [✓] Domain & Free SSL (HTTPS) successfully active!             ${NC}"
        echo -e "${GREEN}====================================================================${NC}"
        echo -e "  ${WHITE}URL:${NC} ${CYAN}https://${user_domain}${NC}"
        echo -e "${GREEN}====================================================================${NC}\n"
    else
        echo -e "${YELLOW}[!] Automatic SSL challenge failed. HTTP is active at http://${user_domain}${NC}"
    fi
}

# 1. Install Action
install_app() {
    print_banner
    echo -e "${WHITE}=== 1. Install / Reinstall Accounting System ===${NC}\n"

    if [[ -d "${INSTALL_DIR}" ]] && systemctl is-active --quiet "${SERVICE_NAME}" 2>/dev/null; then
        echo -e "${YELLOW}[!] System is currently installed and running.${NC}"
        local confirm_reinstall
        read_input "Do you want to reinstall and overwrite? [y/N]: " confirm_reinstall "n"
        if [[ ! "${confirm_reinstall}" =~ ^[Yy]$ ]]; then
            echo -e "${BLUE}[*] Installation cancelled.${NC}"
            return
        fi
        create_backup "pre_reinstall"
    fi

    local custom_port
    read_input "Enter web port [Default: ${DEFAULT_PORT}]: " custom_port "${DEFAULT_PORT}"
    if [[ ! "${custom_port}" =~ ^[0-9]+$ ]] || [ "${custom_port}" -lt 1 ] || [ "${custom_port}" -gt 65535 ]; then
        custom_port=$DEFAULT_PORT
    fi
    echo -e "${GREEN}[✓] Selected Port: ${custom_port}${NC}\n"

    install_prerequisites

    mkdir -p "${INSTALL_DIR}" "${BACKUP_DIR}"

    echo -e "${BLUE}[*] Cloning repository from GitHub (${GIT_REPO})...${NC}"
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

    cat <<EOF > "${INSTALL_DIR}/.env"
PORT=${custom_port}
HOST=0.0.0.0
NODE_ENV=production
EOF

    echo -e "${BLUE}[*] Installing dependencies (npm install)...${NC}"
    npm install --production=false

    echo -e "${BLUE}[*] Building web production assets (npm run build)...${NC}"
    npm run build

    # Create global CLI command
    cp -f "${INSTALL_DIR}/install.sh" "${BIN_PATH}"
    chmod +x "${BIN_PATH}" "${INSTALL_DIR}/server.js" 2>/dev/null

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

    local ask_ssl
    read_input "Do you want to configure Domain & Free SSL (HTTPS) now? [y/N]: " ask_ssl "n"
    if [[ "${ask_ssl}" =~ ^[Yy]$ ]]; then
        setup_domain_ssl
    fi
}

# 2. Update Action (WITH AUTO BACKUP)
update_app() {
    print_banner
    echo -e "${WHITE}=== 2. Update System to Latest Version (with Auto-Backup) ===${NC}\n"

    if [[ ! -d "${INSTALL_DIR}" ]]; then
        echo -e "${RED}[ERROR] System is not installed yet. Choose option 1 first.${NC}"
        return
    fi

    echo -e "${YELLOW}[!] Creating automatic safety backup archive before update...${NC}"
    create_backup "pre_update"

    echo -e "\n${BLUE}[*] Pulling latest updates from GitHub...${NC}"
    cd "${INSTALL_DIR}" || exit 1
    git fetch --all
    git reset --hard origin/main
    git pull origin main

    echo -e "${BLUE}[*] Installing packages and building project...${NC}"
    npm install --production=false
    npm run build

    local current_port
    current_port=$(grep -Po 'PORT=\K[0-9]+' "${INSTALL_DIR}/.env" 2>/dev/null || echo "${DEFAULT_PORT}")

    cp -f "${INSTALL_DIR}/install.sh" "${BIN_PATH}"
    chmod +x "${BIN_PATH}" 2>/dev/null

    echo -e "${BLUE}[*] Refreshing and restarting background service...${NC}"
    create_systemd_service "${current_port}"

    local server_ip
    server_ip=$(get_server_ip)
    local domain
    domain=$(get_configured_domain)

    echo -e "\n${GREEN}====================================================================${NC}"
    echo -e "${WHITE}   [✓] System successfully updated to latest GitHub version!      ${NC}"
    echo -e "${GREEN}====================================================================${NC}"
    if [ -n "$domain" ]; then
        echo -e "  ${WHITE}Web URL:${NC} ${CYAN}https://${domain}${NC}"
    fi
    echo -e "  ${WHITE}Direct IP:${NC} ${CYAN}http://${server_ip}:${current_port}${NC}"
    echo -e "${GREEN}====================================================================${NC}\n"
}

# 3. Change Port Action
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
    read_input "Enter new port [1-65535]: " new_port ""
    if [[ ! "${new_port}" =~ ^[0-9]+$ ]] || [ "${new_port}" -lt 1 ] || [ "${new_port}" -gt 65535 ]; then
        echo -e "${RED}[ERROR] Invalid port number.${NC}"
        return
    fi

    sed -i "s/PORT=.*/PORT=${new_port}/g" "${INSTALL_DIR}/.env"
    create_systemd_service "${new_port}"

    local server_ip
    server_ip=$(get_server_ip)

    echo -e "\n${GREEN}[✓] Port changed to ${new_port} and service restarted!${NC}"
    echo -e "  ${WHITE}New URL:${NC} ${CYAN}http://${server_ip}:${new_port}${NC}\n"
}

# 15. Uninstall Action (WITH AUTO BACKUP)
uninstall_app() {
    print_banner
    echo -e "${RED}=== 15. Uninstall System Completely (with Auto-Backup) ===${NC}\n"

    if [[ ! -d "${INSTALL_DIR}" ]] && [[ ! -f "${SERVICE_FILE}" ]]; then
        echo -e "${YELLOW}[!] No installation found on this server.${NC}"
        return
    fi

    echo -e "${RED}[WARNING] This will remove the installation directory and service.${NC}"
    local confirm_uninstall
    read_input "Are you sure you want to completely uninstall? [y/N]: " confirm_uninstall "n"
    if [[ ! "${confirm_uninstall}" =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}[*] Uninstall cancelled.${NC}"
        return
    fi

    echo -e "\n${YELLOW}[!] Creating automatic safety backup before removal...${NC}"
    create_backup "pre_uninstall"

    echo -e "${BLUE}[*] Stopping and disabling service...${NC}"
    systemctl stop "${SERVICE_NAME}" 2>/dev/null
    systemctl disable "${SERVICE_NAME}" 2>/dev/null
    rm -f "${SERVICE_FILE}"
    systemctl daemon-reload

    echo -e "${BLUE}[*] Removing files...${NC}"
    rm -rf "${INSTALL_DIR}"
    rm -f "${BIN_PATH}"

    echo -e "\n${GREEN}====================================================================${NC}"
    echo -e "${WHITE}   [✓] Persian Accounting successfully removed from server.       ${NC}"
    echo -e "${GREEN}====================================================================${NC}"
    echo -e "  ${YELLOW}Notice:${NC} Backups are safely saved in: ${WHITE}${BACKUP_DIR}${NC}"
    echo -e "${GREEN}====================================================================${NC}\n"
}

# Main Interactive Menu (Opens IMMEDIATELY in 0.0 seconds)
menu() {
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
            5)
                local domain
                domain=$(get_configured_domain)
                if [ -n "$domain" ]; then
                    rm -f "/etc/nginx/conf.d/${domain}.conf" "/etc/nginx/sites-available/${domain}.conf" "/etc/nginx/sites-enabled/${domain}.conf"
                    systemctl reload nginx 2>/dev/null
                    sed -i "/DOMAIN=/d" "${INSTALL_DIR}/.env"
                    echo -e "${GREEN}[✓] Domain removed.${NC}"
                else
                    echo -e "${YELLOW}[!] No domain configured.${NC}"
                fi
                ;;
            6)  systemctl restart "${SERVICE_NAME}" && echo -e "${GREEN}[✓] Service restarted.${NC}" ;;
            7)  systemctl stop "${SERVICE_NAME}" && echo -e "${YELLOW}[✓] Service stopped.${NC}" ;;
            8)  print_banner; systemctl status "${SERVICE_NAME}" --no-pager -l ;;
            9)  print_banner; journalctl -u "${SERVICE_NAME}" -f -n 50 --no-pager ;;
            10) create_backup "manual" ;;
            11)
                print_banner
                echo -e "${WHITE}=== Restore Backup Archive ===${NC}\n"
                local backups=()
                local i=1
                while IFS= read -r file; do
                    backups+=("$file")
                    echo -e "  [${YELLOW}${i}${NC}] $(basename "$file") ($(du -h "$file" | cut -f1))"
                    ((i++))
                done < <(find "${BACKUP_DIR}" -maxdepth 1 -name "*.tar.gz" 2>/dev/null | sort -r)

                if [ ${#backups[@]} -eq 0 ]; then
                    echo -e "${YELLOW}[!] No backups found in ${BACKUP_DIR}.${NC}"
                else
                    local bchoice
                    read_input "Select backup number to restore (or 0 to cancel): " bchoice "0"
                    if [[ "${bchoice}" =~ ^[0-9]+$ ]] && [ "${bchoice}" -ge 1 ] && [ "${bchoice}" -le "${#backups[@]}" ]; then
                        create_backup "pre_restore"
                        systemctl stop "${SERVICE_NAME}" 2>/dev/null
                        tar -xzf "${backups[$((bchoice - 1))]}" -C "$(dirname "${INSTALL_DIR}")"
                        systemctl start "${SERVICE_NAME}"
                        echo -e "\n${GREEN}[✓] System restored successfully!${NC}"
                    fi
                fi
                ;;
            12)
                if systemctl is-enabled --quiet "${SERVICE_NAME}" 2>/dev/null; then
                    systemctl disable "${SERVICE_NAME}"
                    echo -e "${YELLOW}[✓] Auto-start on boot disabled.${NC}"
                else
                    systemctl enable "${SERVICE_NAME}"
                    echo -e "${GREEN}[✓] Auto-start on boot enabled.${NC}"
                fi
                ;;
            13)
                print_banner
                local tg bale
                read_input "Telegram Bot Token: " tg ""
                read_input "Bale Bot Token: " bale ""
                [ -n "$tg" ] && (grep -q "TELEGRAM_BOT_TOKEN=" "${INSTALL_DIR}/.env" && sed -i "s/TELEGRAM_BOT_TOKEN=.*/TELEGRAM_BOT_TOKEN=${tg}/g" "${INSTALL_DIR}/.env" || echo "TELEGRAM_BOT_TOKEN=${tg}" >> "${INSTALL_DIR}/.env")
                [ -n "$bale" ] && (grep -q "BALE_BOT_TOKEN=" "${INSTALL_DIR}/.env" && sed -i "s/BALE_BOT_TOKEN=.*/BALE_BOT_TOKEN=${bale}/g" "${INSTALL_DIR}/.env" || echo "BALE_BOT_TOKEN=${bale}" >> "${INSTALL_DIR}/.env")
                echo -e "${GREEN}[✓] Bot tokens saved.${NC}"
                ;;
            14)
                mkdir -p /root/accounting_windows_setup
                cp -r "${INSTALL_DIR}/windows_setup/"* /root/accounting_windows_setup/ 2>/dev/null
                echo -e "${GREEN}[✓] Windows setup files exported to /root/accounting_windows_setup${NC}"
                ;;
            15) uninstall_app ;;
            0)  echo -e "\n${GREEN}Exiting.${NC}\n"; exit 0 ;;
            *)  echo -e "\n${RED}[!] Invalid option.${NC}" ;;
        esac

        echo ""
        local enter_key
        read_input "Press Enter to return to main menu..." enter_key ""
    done
}

menu
