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
NGINX_CONF_DIR="/etc/nginx/sites-available"
NGINX_CONF_ENABLED="/etc/nginx/sites-enabled"

# Helper for robust interactive input reading (handles piped bash <(curl ...) properly)
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
        echo -e "${RED}[خطا / ERROR] این اسکریپت باید با دسترسی root یا sudo اجرا شود.${NC}"
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

# Print Header Banner
print_banner() {
    clear
    local server_ip
    server_ip=$(get_server_ip)
    local domain
    domain=$(get_configured_domain)
    local current_port
    current_port=$(grep -Po 'PORT=\K[0-9]+' "${INSTALL_DIR}/.env" 2>/dev/null || echo "${DEFAULT_PORT}")

    echo -e "${CYAN}====================================================================${NC}"
    echo -e "${WHITE}       سامانه حسابداری مَه - پنل مدیریت لینوکس (Persian Accounting)     ${NC}"
    echo -e "${CYAN}====================================================================${NC}"
    echo -e "  ${YELLOW}مخزن گیت‌هاب (GitHub):${NC} https://github.com/meh732/accounting.git"
    echo -e "  ${YELLOW}مسیر نصب برنامه:${NC}      ${INSTALL_DIR}"
    echo -e "  ${YELLOW}آی‌پی سرور (Server IP):${NC}  ${WHITE}${server_ip}${NC}"
    
    if [ -n "$domain" ]; then
        echo -e "  ${YELLOW}دامنه فعال (Domain):${NC}    ${GREEN}https://${domain}${NC}"
    fi

    # Status check
    if systemctl is-active --quiet "${SERVICE_NAME}"; then
        echo -e "  ${YELLOW}وضعیت سرویس (Status):${NC}   ${GREEN}● فعال و در حال اجرا (Active)${NC} روی پورت ${WHITE}${current_port}${NC}"
    elif [[ -f "${SERVICE_FILE}" ]]; then
        echo -e "  ${YELLOW}وضعیت سرویس (Status):${NC}   ${RED}● متوقف شده (Inactive)${NC}"
    else
        echo -e "  ${YELLOW}وضعیت سرویس (Status):${NC}   ${YELLOW}● هنوز نصب نشده است (Not Installed)${NC}"
    fi
    echo -e "${CYAN}====================================================================${NC}"
}

# Detect OS and Package Manager
install_prerequisites() {
    echo -e "\n${BLUE}[*] در حال بررسی و نصب پکیج‌های پیش‌نیاز سیستم...${NC}"
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

    # Install Node.js v20 LTS if not present or < 18
    if ! command -v node &>/dev/null || [[ $(node -v | cut -d'.' -f1 | tr -d 'v') -lt 18 ]]; then
        echo -e "${BLUE}[*] در حال نصب Node.js v20 LTS...${NC}"
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

    echo -e "${GREEN}[✓] نسخه Node.js:${NC} $(node -v 2>/dev/null || echo 'N/A')"
    echo -e "${GREEN}[✓] نسخه NPM:${NC}     $(npm -v 2>/dev/null || echo 'N/A')"
}

# Create Systemd Service File
create_systemd_service() {
    local port=${1:-$DEFAULT_PORT}
    echo -e "${BLUE}[*] در حال ایجاد سرویس پس‌زمینه سیستم (${SERVICE_NAME})...${NC}"

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
    echo -e "${GREEN}[✓] سرویس سیستم با موفقیت ایجاد و فعال شد.${NC}"
}

# Create Backup (Full archive with timestamp)
create_backup() {
    local prefix="${1:-manual}"
    mkdir -p "${BACKUP_DIR}"
    local timestamp
    timestamp=$(date +"%Y%m%d_%H%M%S")
    local backup_file="${BACKUP_DIR}/accounting_backup_${prefix}_${timestamp}.tar.gz"

    if [[ -d "${INSTALL_DIR}" ]]; then
        echo -e "${BLUE}[*] در حال ایجاد نسخه پشتیبان (${prefix})...${NC}"
        tar --exclude="${INSTALL_DIR}/node_modules" \
            --exclude="${INSTALL_DIR}/.git" \
            --exclude="${INSTALL_DIR}/release" \
            -czf "${backup_file}" -C "$(dirname "${INSTALL_DIR}")" "$(basename "${INSTALL_DIR}")" 2>/dev/null

        if [[ -f "${backup_file}" ]]; then
            local bsize
            bsize=$(du -h "${backup_file}" | cut -f1)
            echo -e "${GREEN}[✓] نسخه پشتیبان با موفقیت ساخته شد:${NC} ${backup_file} (${bsize})"
            return 0
        else
            echo -e "${RED}[خطا] ساخت فایل پشتیبان با مشکل مواجه شد.${NC}"
            return 1
        fi
    else
        echo -e "${YELLOW}[!] پوشه برنامه یافت نشد. پشتیبان‌گیری صرف‌نظر شد.${NC}"
        return 0
    fi
}

# Setup Nginx Domain & SSL Certificate (Let's Encrypt)
setup_domain_ssl() {
    print_banner
    echo -e "${WHITE}=== تنظیم دامنه و گواهی رایگان SSL (Let's Encrypt) ===${NC}\n"
    
    if [[ ! -d "${INSTALL_DIR}" ]]; then
        echo -e "${RED}[خطا] ابتدا باید سامانه حسابداری را نصب کنید (گزینه ۱).${NC}"
        return
    fi

    local current_port
    current_port=$(grep -Po 'PORT=\K[0-9]+' "${INSTALL_DIR}/.env" 2>/dev/null || echo "${DEFAULT_PORT}")

    echo -e "${YELLOW}نکته مهم: قبل از ادامه، مطمئن شوید رکورد A دامنه خود را در کلودفلر یا پنل دامنه به آی‌پی سرور متصل کرده‌اید.${NC}"
    echo -e "آی‌پی سرور شما: ${CYAN}$(get_server_ip)${NC}\n"

    local user_domain
    read_input "لطفاً نام دامنه یا ساب‌دامنه خود را وارد کنید (مثال: panel.example.com): " user_domain ""
    
    if [ -z "$user_domain" ]; then
        echo -e "${RED}[خطا] نام دامنه نمی‌تواند خالی باشد.${NC}"
        return
    fi

    # Clean domain string
    user_domain=$(echo "$user_domain" | tr -d ' ' | sed -e 's|^https://||' -e 's|^http://||' -e 's|/$||')

    local user_email
    read_input "ایمیل جهت دریافت هشدارهای انقضای گواهی (یا اینتر برای پیش‌فرض): " user_email "admin@${user_domain}"

    echo -e "\n${BLUE}[*] در حال نصب و تنظیم Nginx Reverse Proxy...${NC}"
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
        echo -e "${RED}[خطا] پیکربندی Nginx معتبر نیست.${NC}"
        nginx -t
        return
    fi
    systemctl reload nginx

    echo -e "${BLUE}[*] در حال درخواست گواهی رایگان SSL از Let's Encrypt برای ${user_domain}...${NC}"
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
        echo -e "${WHITE}   [✓] دامنه و گواهی امنیتی SSL با موفقیت فعال شد!                ${NC}"
        echo -e "${GREEN}====================================================================${NC}"
        echo -e "  ${WHITE}آدرس امن سامانه:${NC} ${CYAN}https://${user_domain}${NC}"
        echo -e "  ${WHITE}تمدید خودکار SSL:${NC} ${GREEN}فعال شد (روزانه ساعت ۳ صبح بررسی می‌شود)${NC}"
        echo -e "${GREEN}====================================================================${NC}\n"
    else
        echo -e "${YELLOW}[!] صدور خودکار SSL توسط Certbot ناموفق بود.${NC}"
        echo -e "ممکن است اتصال دامنه به این آی‌پی هنوز اعمال نشده باشد یا کلودفلر روشن باشد."
        echo -e "آدرس بدون SSL فعال است: ${CYAN}http://${user_domain}${NC}"
    fi
}

# 1. Install Function
install_app() {
    print_banner
    echo -e "${WHITE}=== ۱. نصب سامانه حسابداری مَه بر روی لینوکس ===${NC}\n"

    if [[ -d "${INSTALL_DIR}" ]] && systemctl is-active --quiet "${SERVICE_NAME}"; then
        echo -e "${YELLOW}[!] برنامه در حال حاضر نصب بوده و در حال اجرا است.${NC}"
        local confirm_reinstall
        read_input "آیا مایلید مجدداً نصب و رونویسی شود؟ [y/N]: " confirm_reinstall "n"
        if [[ ! "${confirm_reinstall}" =~ ^[Yy]$ ]]; then
            echo -e "${BLUE}[*] عملیات نصب لغو شد.${NC}"
            return
        fi
        create_backup "pre_reinstall"
    fi

    # Port selection
    echo -e "${CYAN}تنظیم پورت سرور:${NC}"
    local custom_port
    read_input "پورت مورد نظر را وارد فرمایید [پیش‌فرض: ${DEFAULT_PORT}]: " custom_port "${DEFAULT_PORT}"
    if [[ ! "${custom_port}" =~ ^[0-9]+$ ]] || [ "${custom_port}" -lt 1 ] || [ "${custom_port}" -gt 65535 ]; then
        echo -e "${YELLOW}[!] پورت نامعتبر بود. از پورت پیش‌فرض ${DEFAULT_PORT} استفاده می‌شود.${NC}"
        custom_port=$DEFAULT_PORT
    fi
    echo -e "${GREEN}[✓] پورت انتخاب شده: ${custom_port}${NC}\n"

    install_prerequisites

    # Prepare directories
    mkdir -p "${INSTALL_DIR}"
    mkdir -p "${BACKUP_DIR}"

    echo -e "${BLUE}[*] در حال دریافت کدهای پروژه از گیت‌هاب (${GIT_REPO})...${NC}"
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

    echo -e "${BLUE}[*] در حال نصب وابستگی‌های NPM (ممکن است چند لحظه طول بکشد)...${NC}"
    npm install --production=false

    echo -e "${BLUE}[*] در حال ساخت خروجی نهایی پروژه (Build)...${NC}"
    npm run build

    # Create global shortcut command
    ln -sf "${INSTALL_DIR}/accounting.sh" "${BIN_PATH}"
    chmod +x "${INSTALL_DIR}/accounting.sh" "${INSTALL_DIR}/server.js" "${BIN_PATH}" 2>/dev/null

    # Setup & start service
    create_systemd_service "${custom_port}"

    local server_ip
    server_ip=$(get_server_ip)

    echo -e "\n${GREEN}====================================================================${NC}"
    echo -e "${WHITE}   [✓] سامانه حسابداری مَه با موفقیت نصب و راه‌اندازی شد!         ${NC}"
    echo -e "${GREEN}====================================================================${NC}"
    echo -e "  ${WHITE}آدرس دسترسی:${NC}     ${CYAN}http://${server_ip}:${custom_port}${NC}"
    echo -e "  ${WHITE}آدرس لوکال:${NC}      ${CYAN}http://localhost:${custom_port}${NC}"
    echo -e "  ${WHITE}دستور مدیریت:${NC}    در هر جای ترمینال بنویسید: ${YELLOW}accounting${NC}"
    echo -e "${GREEN}====================================================================${NC}\n"

    # Ask for Domain & SSL Setup right away
    local ask_ssl
    read_input "آیا مایلید هم‌اکنون دامنه و گواهی رایگان SSL (https) را تنظیم کنید؟ [y/N]: " ask_ssl "n"
    if [[ "${ask_ssl}" =~ ^[Yy]$ ]]; then
        setup_domain_ssl
    fi
}

# 2. Update Function (Auto-Backup first)
update_app() {
    print_banner
    echo -e "${WHITE}=== ۲. به‌روزرسانی سامانه حسابداری مَه ===${NC}\n"

    if [[ ! -d "${INSTALL_DIR}" ]]; then
        echo -e "${RED}[خطا] برنامه هنوز نصب نشده است. لطفا ابتدا گزینه ۱ را انتخاب فرمایید.${NC}"
        return
    fi

    echo -e "${YELLOW}[!] قبل از به‌روزرسانی، یک نسخه پشتیبان کامل به طور خودکار گرفته می‌شود.${NC}"
    create_backup "pre_update"

    echo -e "\n${BLUE}[*] در حال دریافت آخرین تغییرات از مخزن گیت‌هاب...${NC}"
    cd "${INSTALL_DIR}" || exit 1
    git fetch --all
    git reset --hard origin/main
    git pull origin main

    echo -e "${BLUE}[*] در حال به‌روزرسانی پکیج‌ها و Build مجدد پروژه...${NC}"
    npm install --production=false
    npm run build

    # Read current port
    local current_port
    current_port=$(grep -Po 'PORT=\K[0-9]+' "${INSTALL_DIR}/.env" 2>/dev/null || echo "${DEFAULT_PORT}")

    # Re-link CLI
    ln -sf "${INSTALL_DIR}/accounting.sh" "${BIN_PATH}"
    chmod +x "${INSTALL_DIR}/accounting.sh" "${INSTALL_DIR}/server.js" "${BIN_PATH}" 2>/dev/null

    echo -e "${BLUE}[*] در حال راه‌اندازی مجدد سرویس...${NC}"
    systemctl daemon-reload
    systemctl restart "${SERVICE_NAME}"

    local server_ip
    server_ip=$(get_server_ip)
    local domain
    domain=$(get_configured_domain)

    echo -e "\n${GREEN}====================================================================${NC}"
    echo -e "${WHITE}   [✓] سیستم با موفقیت به آخرین نسخه به‌روزرسانی شد!               ${NC}"
    echo -e "${GREEN}====================================================================${NC}"
    if [ -n "$domain" ]; then
        echo -e "  ${WHITE}آدرس:${NC} ${CYAN}https://${domain}${NC}"
    fi
    echo -e "  ${WHITE}آدرس آی‌پی:${NC} ${CYAN}http://${server_ip}:${current_port}${NC}"
    echo -e "${GREEN}====================================================================${NC}\n"
}

# 3. Change Port Function
change_port() {
    print_banner
    echo -e "${WHITE}=== ۳. تغییر پورت وب سرور ===${NC}\n"

    if [[ ! -d "${INSTALL_DIR}" ]]; then
        echo -e "${RED}[خطا] سامانه هنوز نصب نشده است.${NC}"
        return
    fi

    local current_port
    current_port=$(grep -Po 'PORT=\K[0-9]+' "${INSTALL_DIR}/.env" 2>/dev/null || echo "${DEFAULT_PORT}")
    echo -e "پورت فعلی برنامه: ${GREEN}${current_port}${NC}\n"

    local new_port
    read_input "شماره پورت جدید را وارد کنید [1-65535]: " new_port ""
    if [[ ! "${new_port}" =~ ^[0-9]+$ ]] || [ "${new_port}" -lt 1 ] || [ "${new_port}" -gt 65535 ]; then
        echo -e "${RED}[خطا] شماره پورت نامعتبر است.${NC}"
        return
    fi

    # Update .env
    sed -i "s/PORT=.*/PORT=${new_port}/g" "${INSTALL_DIR}/.env"

    # Recreate service with new port
    create_systemd_service "${new_port}"

    local server_ip
    server_ip=$(get_server_ip)

    echo -e "\n${GREEN}[✓] پورت با موفقیت به ${new_port} تغییر یافت و سرویس مجدداً اجرا شد!${NC}"
    echo -e "  ${WHITE}آدرس جدید:${NC} ${CYAN}http://${server_ip}:${new_port}${NC}\n"
}

# 4. Remove Domain / SSL
remove_domain_ssl() {
    print_banner
    echo -e "${WHITE}=== حذف دامنه و بازگشت به حالت آی‌پی مستقیم ===${NC}\n"
    
    local domain
    domain=$(get_configured_domain)
    if [ -z "$domain" ]; then
        echo -e "${YELLOW}[!] دامنه‌ای برای این سرور تنظیم نشده است.${NC}"
        return
    fi

    echo -e "دامنه فعال فعلی: ${CYAN}${domain}${NC}"
    local confirm
    read_input "آیا از حذف این دامنه و غیرفعال‌سازی Nginx اطمینان دارید؟ [y/N]: " confirm "n"
    if [[ "${confirm}" =~ ^[Yy]$ ]]; then
        rm -f "/etc/nginx/conf.d/${domain}.conf" "/etc/nginx/sites-available/${domain}.conf" "/etc/nginx/sites-enabled/${domain}.conf"
        systemctl reload nginx 2>/dev/null
        sed -i "/DOMAIN=/d" "${INSTALL_DIR}/.env"
        echo -e "${GREEN}[✓] دامنه با موفقیت حذف گردید.${NC}"
    fi
}

# Service Control Functions
start_service() {
    echo -e "${BLUE}[*] در حال اجرای سرویس ${SERVICE_NAME}...${NC}"
    systemctl start "${SERVICE_NAME}"
    if systemctl is-active --quiet "${SERVICE_NAME}"; then
        echo -e "${GREEN}[✓] سرویس با موفقیت فعال شد.${NC}"
    else
        echo -e "${RED}[خطا] اجرای سرویس ناموفق بود. لاگ‌ها را بررسی کنید.${NC}"
    fi
}

stop_service() {
    echo -e "${BLUE}[*] در حال متوقف‌سازی سرویس ${SERVICE_NAME}...${NC}"
    systemctl stop "${SERVICE_NAME}"
    echo -e "${YELLOW}[✓] سرویس متوقف شد.${NC}"
}

restart_service() {
    echo -e "${BLUE}[*] در حال راه‌اندازی مجدد سرویس ${SERVICE_NAME}...${NC}"
    systemctl restart "${SERVICE_NAME}"
    if systemctl is-active --quiet "${SERVICE_NAME}"; then
        echo -e "${GREEN}[✓] سرویس با موفقیت مجدداً راه‌اندازی شد.${NC}"
    else
        echo -e "${RED}[خطا] اجرای سرویس ناموفق بود. لاگ‌ها را بررسی کنید.${NC}"
    fi
}

view_status() {
    print_banner
    echo -e "${WHITE}=== وضعیت زنده سرویس (Systemd Status) ===${NC}\n"
    systemctl status "${SERVICE_NAME}" --no-pager -l
}

view_logs() {
    print_banner
    echo -e "${WHITE}=== مشاهده لاگ‌های زنده سرور (برای خروج Ctrl+C را بزنید) ===${NC}\n"
    journalctl -u "${SERVICE_NAME}" -f -n 50 --no-pager
}

# Manual Backup Function
manual_backup() {
    print_banner
    echo -e "${WHITE}=== ایجاد نسخه پشتیبان دستی از سیستم ===${NC}\n"
    create_backup "manual"
}

# Restore Backup Function
restore_backup() {
    print_banner
    echo -e "${WHITE}=== بازیابی نسخه پشتیبان ===${NC}\n"

    if [[ ! -d "${BACKUP_DIR}" ]] || [[ $(find "${BACKUP_DIR}" -name "*.tar.gz" | wc -l) -eq 0 ]]; then
        echo -e "${YELLOW}[!] هیچ فایل پشتیبانی در مسیر ${BACKUP_DIR} یافت نشد.${NC}"
        return
    fi

    echo -e "${CYAN}فایل‌های پشتیبان موجود:${NC}"
    local backups=()
    local i=1
    while IFS= read -r file; do
        backups+=("$file")
        echo -e "  [${YELLOW}${i}${NC}] $(basename "$file") ($(du -h "$file" | cut -f1))"
        ((i++))
    done < <(find "${BACKUP_DIR}" -maxdepth 1 -name "*.tar.gz" | sort -r)

    echo ""
    local choice
    read_input "شماره فایل پشتیبان جهت بازیابی را وارد کنید (یا 0 برای انصراف): " choice "0"

    if [[ "${choice}" =~ ^[0-9]+$ ]] && [ "${choice}" -ge 1 ] && [ "${choice}" -le "${#backups[@]}" ]; then
        local selected_file="${backups[$((choice - 1))]}"
        echo -e "\n${RED}[هشدار] بازیابی بکاپ، فایل‌های فعلی برنامه را بازنویسی خواهد کرد.${NC}"
        local confirm_restore
        read_input "آیا از بازیابی اطمینان دارید؟ [y/N]: " confirm_restore "n"
        if [[ "${confirm_restore}" =~ ^[Yy]$ ]]; then
            create_backup "pre_restore"
            systemctl stop "${SERVICE_NAME}" 2>/dev/null
            tar -xzf "${selected_file}" -C "$(dirname "${INSTALL_DIR}")"
            systemctl start "${SERVICE_NAME}"
            echo -e "\n${GREEN}[✓] سامانه با موفقیت از فایل $(basename "${selected_file}") بازیابی شد!${NC}"
        else
            echo -e "${BLUE}[*] عملیات بازیابی لغو شد.${NC}"
        fi
    else
        echo -e "${BLUE}[*] انصراف.${NC}"
    fi
}

# Toggle Auto-Start
toggle_autostart() {
    print_banner
    echo -e "${WHITE}=== تنظیم اجرای خودکار هنگام روشن شدن سیستم (Boot) ===${NC}\n"

    if systemctl is-enabled --quiet "${SERVICE_NAME}" 2>/dev/null; then
        echo -e "وضعیت فعلی: ${GREEN}فعال (با بوت سیستم خودکار اجرا می‌شود)${NC}"
        local ans
        read_input "آیا مایلید اجرای خودکار غیرفعال شود؟ [y/N]: " ans "n"
        if [[ "${ans}" =~ ^[Yy]$ ]]; then
            systemctl disable "${SERVICE_NAME}"
            echo -e "${YELLOW}[✓] اجرای خودکار در بوت غیرفعال شد.${NC}"
        fi
    else
        echo -e "وضعیت فعلی: ${RED}غیرفعال${NC}"
        local ans
        read_input "آیا مایلید اجرای خودکار فعال شود؟ [y/N]: " ans "n"
        if [[ "${ans}" =~ ^[Yy]$ ]]; then
            systemctl enable "${SERVICE_NAME}"
            echo -e "${GREEN}[✓] اجرای خودکار در بوت فعال شد.${NC}"
        fi
    fi
}

# Configure Bots
configure_bots() {
    print_banner
    echo -e "${WHITE}=== تنظیم ربات‌های تلگرام و بله (Telegram & Bale Bots) ===${NC}\n"
    if [[ ! -d "${INSTALL_DIR}" ]]; then
        echo -e "${RED}[خطا] سامانه هنوز نصب نشده است.${NC}"
        return
    fi
    
    echo -e "${YELLOW}توجه: برای دریافت وب‌هوک، سرور باید آی‌پی پابلیک یا دامنه داشته باشد.${NC}\n"
    
    local tg_token
    read_input "توکن ربات تلگرام (Telegram Bot Token): " tg_token ""
    local bale_token
    read_input "توکن ربات بله (Bale Bot Token): " bale_token ""
    
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
        echo -e "${BLUE}[*] در حال ایجاد سرویس پس‌زمینه ربات‌ها...${NC}"
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
    echo -e "\n${GREEN}[✓] تنظیمات ربات‌ها ذخیره و سرویس با موفقیت فعال شد!${NC}\n"
}

# Export Windows Setup
export_windows_setup() {
    print_banner
    echo -e "${WHITE}=== خروجی فایل‌های نصبی ویندوز (Windows Setup Files) ===${NC}\n"
    if [[ ! -d "${INSTALL_DIR}" ]]; then
        echo -e "${RED}[خطا] سامانه هنوز نصب نشده است.${NC}"
        return
    fi
    
    local export_dir="/root/accounting_windows_setup"
    rm -rf "${export_dir}"
    mkdir -p "${export_dir}"
    
    cp -r "${INSTALL_DIR}/windows_setup/"* "${export_dir}/" 2>/dev/null
    
    echo -e "${GREEN}[✓] فایل‌های نصبی و اسکریپت‌های ویندوز در این مسیر قرار گرفتند:${NC}"
    echo -e "    ${WHITE}${export_dir}${NC}"
    echo -e "\nمی‌توانید با SFTP / Termius / WinSCP این پوشه را روی ویندوز دانلود کنید."
    ls -l "${export_dir}"
}

# Uninstall Function (Auto-Backup first)
uninstall_app() {
    print_banner
    echo -e "${RED}=== حذف کامل سامانه حسابداری مَه ===${NC}\n"

    if [[ ! -d "${INSTALL_DIR}" ]] && [[ ! -f "${SERVICE_FILE}" ]]; then
        echo -e "${YELLOW}[!] برنامه‌ای بر روی این سرور یافت نشد.${NC}"
        return
    fi

    echo -e "${RED}[هشدار] این عملیات سرویس را متوقف کرده و تمامی کدهای برنامه را پاک می‌کند.${NC}"
    local confirm_uninstall
    read_input "آیا از حذف کامل اطمینان دارید؟ [y/N]: " confirm_uninstall "n"
    if [[ ! "${confirm_uninstall}" =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}[*] عملیات حذف لغو شد.${NC}"
        return
    fi

    echo -e "\n${YELLOW}[!] در حال ایجاد نسخه پشتیبان امنیتی قبل از حذف...${NC}"
    create_backup "pre_uninstall"

    echo -e "${BLUE}[*] در حال متوقف‌سازی سرویس...${NC}"
    systemctl stop "${SERVICE_NAME}" 2>/dev/null
    systemctl disable "${SERVICE_NAME}" 2>/dev/null
    rm -f "${SERVICE_FILE}"
    systemctl daemon-reload

    echo -e "${BLUE}[*] در حال حذف فایل‌های برنامه...${NC}"
    rm -rf "${INSTALL_DIR}"
    rm -f "${BIN_PATH}"

    echo -e "\n${GREEN}====================================================================${NC}"
    echo -e "${WHITE}   [✓] سامانه حسابداری با موفقیت از سرور حذف شد.                 ${NC}"
    echo -e "${GREEN}====================================================================${NC}"
    echo -e "  ${YELLOW}یادآوری:${NC} نسخه‌های پشتیبان به صورت امن در این مسیر ذخیره مانده‌اند:"
    echo -e "          ${WHITE}${BACKUP_DIR}${NC}"
    echo -e "${GREEN}====================================================================${NC}\n"
}

# Main Interactive Menu Loop
menu() {
    check_root
    while true; do
        print_banner
        echo -e "${WHITE}  1.${NC}  نصب یا نصب مجدد سامانه (Install / Reinstall App)"
        echo -e "${WHITE}  2.${NC}  ${CYAN}به‌روزرسانی به آخرین نسخه از گیت‌هاب (Update System)${NC}"
        echo -e "${WHITE}  3.${NC}  ${GREEN}تنظیم دامنه و دریافت گواهی رایگان SSL (Domain & HTTPS)${NC}"
        echo -e "${WHITE}  4.${NC}  تغییر پورت وب سرور (Change Web Port)"
        echo -e "${WHITE}  5.${NC}  حذف دامنه و بازگشت به حالت آی‌پی (Remove Domain)"
        echo -e "${CYAN}--------------------------------------------------------------------${NC}"
        echo -e "${WHITE}  6.${NC}  راه‌اندازی مجدد سرویس (Restart Service)"
        echo -e "${WHITE}  7.${NC}  توقف سرویس (Stop Service)"
        echo -e "${WHITE}  8.${NC}  مشاهده وضعیت زنده سرویس (Service Status)"
        echo -e "${WHITE}  9.${NC}  مشاهده لاگ‌های زنده سرور (Live Logs)"
        echo -e "${CYAN}--------------------------------------------------------------------${NC}"
        echo -e "${WHITE} 10.${NC}  ایجاد نسخه پشتیبان کامل از داده‌ها (Backup Database)"
        echo -e "${WHITE} 11.${NC}  بازیابی از فایل پشتیبان (Restore Backup)"
        echo -e "${WHITE} 12.${NC}  تنظیم اجرای خودکار هنگام روشن شدن سرور (Auto-Start Boot)"
        echo -e "${WHITE} 13.${NC}  تنظیم ربات‌های تلگرام و بله (Bots Configuration)"
        echo -e "${WHITE} 14.${NC}  خروجی فایل‌های نصبی ویندوز (Export Windows Setup Files)"
        echo -e "${WHITE} 15.${NC}  ${RED}حذف کامل سامانه از سرور (Uninstall App)${NC}"
        echo -e "${CYAN}--------------------------------------------------------------------${NC}"
        echo -e "${WHITE}  0.${NC}  خروج از منو (Exit)"
        echo -e "${CYAN}====================================================================${NC}"
        
        local option
        read_input "لطفاً شماره گزینه مورد نظر را وارد فرمایید [0-15]: " option ""

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
            0)  echo -e "\n${GREEN}با تشکر، خروج از برنامه.${NC}\n"; exit 0 ;;
            *)  echo -e "\n${RED}[!] گزینه وارد شده نامعتبر است.${NC}" ;;
        esac

        echo ""
        local enter_key
        read_input "برای بازگشت به منوی اصلی کلید Enter را فشار دهید..." enter_key ""
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
