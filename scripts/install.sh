#!/bin/bash
# Notebook AI Installation Script
# For 1GB RAM VPS (Ubuntu/Debian)

set -e

echo "🚀 Notebook AI 安裝腳本"
echo "======================"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
INSTALL_DIR="$HOME/notebook-ai"
BACKEND_DIR="$INSTALL_DIR/backend"
FRONTEND_DIR="$INSTALL_DIR/frontend"
UPLOAD_DIR="$INSTALL_DIR/uploads"
DB_DIR="$INSTALL_DIR/database"

echo -e "\n${YELLOW}📁 安裝目錄：$INSTALL_DIR${NC}"

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    echo -e "${RED}❌ 請不要使用 root 用戶運行此腳本${NC}"
    exit 1
fi

# Step 1: Install system dependencies
echo -e "\n${GREEN}Step 1/8: 安裝系統依賴...${NC}"
sudo apt update
sudo apt install -y curl git nginx sqlite3

# Step 2: Install Node.js 18
echo -e "\n${GREEN}Step 2/8: 安裝 Node.js 18...${NC}"
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

echo "Node.js version: $(node --version)"
echo "npm version: $(npm --version)"

# Step 3: Create directories
echo -e "\n${GREEN}Step 3/8: 創建目錄結構...${NC}"
mkdir -p "$UPLOAD_DIR" "$DB_DIR"
chmod 755 "$UPLOAD_DIR" "$DB_DIR"

# Step 4: Install backend dependencies
echo -e "\n${GREEN}Step 4/8: 安裝後端依賴...${NC}"
cd "$BACKEND_DIR"
npm install --production

# Step 5: Install frontend dependencies and build
echo -e "\n${GREEN}Step 5/8: 構建前端...${NC}"
cd "$FRONTEND_DIR"
npm install
npm run build

# Step 6: Configure environment
echo -e "\n${GREEN}Step 6/8: 配置環境變量...${NC}"
if [ ! -f "$BACKEND_DIR/.env" ]; then
    echo "請配置以下環境變量："
    echo ""
    echo "1. OpenAI API Key: "
    read -s OPENAI_KEY
    echo ""
    
    echo "2. JWT Secret (留空自動生成): "
    read JWT_SECRET
    if [ -z "$JWT_SECRET" ]; then
        JWT_SECRET=$(openssl rand -hex 32)
    fi
    
    cat > "$BACKEND_DIR/.env" << EOF
# Server Configuration
PORT=3000
HOST=127.0.0.1

# JWT Secret
JWT_SECRET=$JWT_SECRET

# OpenAI API Configuration
OPENAI_API_KEY=$OPENAI_KEY
OPENAI_MODEL=gpt-4o-mini

# File Upload
UPLOAD_DIR=$UPLOAD_DIR
MAX_FILE_SIZE=10485760

# Database
DATABASE_PATH=$DB_DIR/notebook.db
EOF
    
    echo -e "${GREEN}✅ 環境配置完成${NC}"
else
    echo -e "${YELLOW}⚠️  .env 文件已存在，跳過${NC}"
fi

# Step 7: Configure Nginx
echo -e "\n${GREEN}Step 7/8: 配置 Nginx...${NC}"
sudo tee /etc/nginx/sites-available/notebook-ai > /dev/null << 'EOF'
server {
    listen 80;
    server_name _;
    
    location / {
        root /home/USER/notebook-ai/frontend/dist;
        try_files $uri $uri/ /index.html;
    }
    
    location /api {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
    
    # Limit file upload size
    client_max_body_size 10M;
}
EOF

# Replace USER with actual username
sudo sed -i "s/USER/$(whoami)/g" /etc/nginx/sites-available/notebook-ai

# Enable site
sudo ln -sf /etc/nginx/sites-available/notebook-ai /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test nginx config
sudo nginx -t

# Step 8: Create systemd service
echo -e "\n${GREEN}Step 8/8: 創建系統服務...${NC}"
sudo tee /etc/systemd/system/notebook-ai.service > /dev/null << EOF
[Unit]
Description=Notebook AI Backend Service
After=network.target

[Service]
Type=simple
User=$(whoami)
WorkingDirectory=$BACKEND_DIR
Environment=NODE_ENV=production
ExecStart=$(which node) server.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd
sudo systemctl daemon-reload
sudo systemctl enable notebook-ai

# Initialize database
cd "$BACKEND_DIR"
node -e "require('./utils/database').initDatabase()"

echo -e "\n${GREEN}✅ 安裝完成！${NC}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "啟動服務："
echo "  sudo systemctl start notebook-ai"
echo "  sudo systemctl restart nginx"
echo ""
echo "查看狀態："
echo "  sudo systemctl status notebook-ai"
echo "  sudo systemctl status nginx"
echo ""
echo "訪問地址："
echo "  http://$(hostname -I | awk '{print $1}')"
echo ""
echo "查看日誌："
echo "  journalctl -u notebook-ai -f"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${YELLOW}⚠️  記得配置 OpenAI API Key 在 .env 文件中！${NC}"
