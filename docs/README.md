# 📓 Notebook AI

智能筆記助手 - NotebookLM 風格的 AI 驅動筆記平台

## ✨ 功能特點

### 階段一（核心功能）✅
- ✅ 用戶註冊/登入
- ✅ 筆記本管理
- ✅ 上傳 PDF/TXT/MD 文檔
- ✅ 自動解析文檔內容
- ✅ AI 自動摘要（OpenAI）
- ✅ 對話式查詢（RAG 風格）

### 階段二（進階功能）✅
- ✅ 多筆記本管理
- ✅ 搜索歷史
- ✅ 導出 Markdown
- ⚠️ 引用來源高亮（基礎版本）

### 階段三（可選）
- ⏸️ IM 聊天功能
- ⏸️ 協作編輯
- ⏸️ 語音輸入

---

## 🏗️ 技術架構

### 後端
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: SQLite (better-sqlite3)
- **AI**: OpenAI API (GPT-4o-mini)
- **Auth**: JWT + bcrypt

### 前端
- **Framework**: Vue 3 + Vite
- **State**: Pinia
- **Router**: Vue Router
- **Styling**: TailwindCSS

### 部署
- **Web Server**: Nginx (反向代理)
- **Process Manager**: systemd
- **OS**: Ubuntu/Debian

---

## 🚀 快速開始

### 系統要求
- Ubuntu 20.04+ / Debian 11+
- Node.js 18+
- 至少 1GB RAM
- 10GB 可用存儲

### 一鍵安裝

```bash
# 克隆項目
cd ~
git clone <your-repo>/notebook-ai.git
cd notebook-ai

# 運行安裝腳本
chmod +x scripts/install.sh
bash scripts/install.sh
```

### 手動安裝

```bash
# 1. 安裝依賴
sudo apt update
sudo apt install -y nodejs npm nginx sqlite3

# 2. 安裝後端
cd backend
npm install --production

# 3. 配置環境
cp .env.example .env
# 編輯 .env 填入 OpenAI API Key

# 4. 構建前端
cd ../frontend
npm install
npm run build

# 5. 啟動服務
cd ../backend
npm start

# 6. 配置 Nginx (見 scripts/install.sh)
```

---

## 📖 API 文檔

### 認證
```
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
```

### 筆記本
```
GET    /api/notebooks           # 列表
POST   /api/notebooks           # 創建
GET    /api/notebooks/:id       # 詳情
PUT    /api/notebooks/:id       # 更新
DELETE /api/notebooks/:id       # 刪除
```

### 文檔
```
POST /api/documents/upload      # 上傳
GET  /api/documents/:id         # 詳情
GET  /api/documents/:id/content # 內容
GET  /api/documents/search      # 搜索
DELETE /api/documents/:id       # 刪除
```

### AI 功能
```
POST /api/ai/summarize          # 摘要
POST /api/ai/chat               # 對話
POST /api/ai/search             # 搜索
```

### 對話
```
GET    /api/conversations/notebook/:id  # 列表
POST   /api/conversations               # 創建
GET    /api/conversations/:id           # 詳情
POST   /api/conversations/:id/messages  # 發送消息
DELETE /api/conversations/:id           # 刪除
```

---

## 🔧 配置

### 環境變量 (.env)

```bash
# 服務器
PORT=3000
HOST=127.0.0.1

# JWT
JWT_SECRET=your-secret-key

# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini

# 文件上傳
UPLOAD_DIR=/path/to/uploads
MAX_FILE_SIZE=10485760  # 10MB

# 數據庫
DATABASE_PATH=/path/to/notebook.db
```

---

## 📊 數據庫 Schema

見 `database/schema.sql`

主要表格：
- `users` - 用戶
- `notebooks` - 筆記本
- `documents` - 文檔
- `document_chunks` - 文檔分塊（搜索用）
- `conversations` - 對話
- `messages` - 消息
- `search_history` - 搜索歷史

---

## 🛠️ 開發

### 後端開發
```bash
cd backend
npm run dev
```

### 前端開發
```bash
cd frontend
npm run dev
```

### 運行測試
```bash
# TODO: 添加測試
```

---

## 📝 使用指南

### 1. 創建賬戶
訪問首頁，點擊「註冊」，填寫用戶名、電郵、密碼。

### 2. 創建筆記本
登入後，點擊「新建筆記本」，輸入標題和描述。

### 3. 上傳文檔
進入筆記本，點擊「上傳文檔」，選擇 PDF/TXT/MD 文件。

### 4. AI 摘要
點擊文檔，然後點擊「AI 摘要」按鈕。

### 5. 對話式查詢
點擊「AI 對話」，輸入問題，AI 會基於筆記本內容回答。

---

## ⚠️ 注意事項

### 1GB RAM 限制
- 使用 SQLite 而非 MongoDB（節省 ~200MB）
- 不運行本地 AI 模型（使用 OpenAI API）
- 限制並發連接數

### 安全建議
- 使用 HTTPS（生產環境）
- 定期備份數據庫
- 限制文件上傳大小
- 使用強密碼

### 性能優化
- 啟用 Nginx 緩存
- 使用 Redis 緩存（可選）
- 數據庫索引優化

---

## 📄 許可證

MIT License

---

## 🙏 致謝

- [OpenAI](https://openai.com/) - AI 模型
- [Vue.js](https://vuejs.org/) - 前端框架
- [Express.js](https://expressjs.com/) - 後端框架
- [pdf-parse](https://www.npmjs.com/package/pdf-parse) - PDF 解析
