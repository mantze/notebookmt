#!/bin/bash
# Notebook AI Quick Start Script

set -e

INSTALL_DIR="$HOME/notebook-ai"
BACKEND_DIR="$INSTALL_DIR/backend"

echo "🚀 啟動 Notebook AI..."

# Check if .env exists
if [ ! -f "$BACKEND_DIR/.env" ]; then
    echo "❌ .env 文件不存在，請先運行 install.sh"
    exit 1
fi

# Start backend (development mode)
cd "$BACKEND_DIR"
echo "📦 啟動後端服務..."
npm start &

# Wait a moment
sleep 2

echo ""
echo "✅ 服務已啟動！"
echo ""
echo "訪問地址：http://localhost:3000"
echo ""
echo "按 Ctrl+C 停止服務"

# Keep script running
wait
