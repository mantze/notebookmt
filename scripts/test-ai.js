#!/usr/bin/env node
/**
 * AI 功能測試腳本
 * 測試改進後的對話記憶和引用功能
 */

const axios = require('axios');

// 配置
const API_BASE = process.env.API_BASE || 'http://localhost:3000/api';
const TEST_NOTEBOOK_ID = process.env.NOTEBOOK_ID || '1';

// 測試用戶憑證（需要先註冊）
const TEST_USER = {
  username: process.env.TEST_USERNAME || 'admin',
  password: process.env.TEST_PASSWORD || 'admin123'
};

let authToken = null;
let conversationId = null;

// 顏色輸出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

// 測試步驟
async function testAI() {
  console.log('\n' + '='.repeat(60));
  log(colors.cyan, '🧪 Notebook AI 功能測試');
  console.log('='.repeat(60) + '\n');

  try {
    // Step 1: 登入
    log(colors.blue, 'Step 1: 登入...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, TEST_USER);
    authToken = loginResponse.data.data.token;
    log(colors.green, '✅ 登入成功');
    console.log(`   用戶：${loginResponse.data.data.user.username}\n`);

    // Step 2: 測試問題 1 - 一般問題
    log(colors.blue, 'Step 2: 測試問題 1 - 一般問題');
    const q1 = '這個筆記本有什麼文檔？';
    console.log(`   問題：${q1}\n`);
    
    const response1 = await callAI(q1);
    console.log(`   回答：${response1.message.substring(0, 200)}...\n`);
    checkSources(response1);

    // Step 3: 測試問題 2 - 指代之前的內容（測試記憶）
    log(colors.blue, 'Step 3: 測試問題 2 - 指代記憶');
    const q2 = '剛才提到的文檔有多少字？';
    console.log(`   問題：${q2}`);
    console.log(`   🎯 測試點：AI 是否記得「剛才提到的文檔」指的是什麼\n`);
    
    const response2 = await callAI(q2);
    console.log(`   回答：${response2.message.substring(0, 200)}...\n`);
    checkSources(response2);

    // Step 4: 測試問題 3 - 要求引用（測試引用機制）
    log(colors.blue, 'Step 4: 測試問題 3 - 引用測試');
    const q3 = '請引用具體文檔說明主要內容';
    console.log(`   問題：${q3}`);
    console.log(`   🎯 測試點：AI 是否主動引用 [來源 X]\n`);
    
    const response3 = await callAI(q3);
    console.log(`   回答：${response3.message.substring(0, 200)}...\n`);
    checkSources(response3);

    // Step 5: 測試問題 4 - 文檔中沒有的內容（測試誠實原則）
    log(colors.blue, 'Step 5: 測試問題 4 - 誠實原則');
    const q4 = '這個學校的建校歷史是什麼？';
    console.log(`   問題：${q4}`);
    console.log(`   🎯 測試點：AI 是否誠實說明文檔中沒有\n`);
    
    const response4 = await callAI(q4);
    console.log(`   回答：${response4.message.substring(0, 200)}...\n`);
    
    if (response4.message.includes('未找到') || response4.message.includes('沒有')) {
      log(colors.green, '✅ AI 誠實說明文檔中沒有相關內容');
    } else {
      log(colors.yellow, '⚠️  AI 可能產生了幻覺（文檔中應該沒有這個信息）');
    }

    // 總結
    console.log('\n' + '='.repeat(60));
    log(colors.cyan, '📊 測試總結');
    console.log('='.repeat(60));
    console.log(`對話 ID: ${conversationId}`);
    console.log(`總共提問：4 次`);
    console.log(`對話輪數：${Math.floor((conversationId ? await getConversationLength(conversationId) : 0) / 2)} 輪`);
    console.log('\n檢查要點:');
    console.log('  1. AI 是否記得之前的對話內容？');
    console.log('  2. AI 是否主動引用 [來源 X]？');
    console.log('  3. 引用的來源是否準確？');
    console.log('  4. 文檔中沒有的內容，AI 是否誠實說明？');
    console.log('');

  } catch (error) {
    log(colors.red, `❌ 測試失敗：${error.message}`);
    if (error.response) {
      console.log('詳情:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

// 調用 AI API
async function callAI(message) {
  const response = await axios.post(
    `${API_BASE}/ai/chat`,
    {
      notebook_id: TEST_NOTEBOOK_ID,
      message: message,
      conversation_id: conversationId
    },
    {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    }
  );

  if (!conversationId) {
    conversationId = response.data.data.conversation_id;
  }

  return response.data.data;
}

// 檢查來源
function checkSources(response) {
  if (response.sources && response.sources.length > 0) {
    log(colors.green, `✅ 引用了 ${response.sources.length} 個來源`);
    response.sources.forEach((source, idx) => {
      console.log(`   [${idx + 1}] ${source.document_title}${source.chunk_index > 0 ? ` (第${source.chunk_index}節)` : ''}`);
    });
  } else if (response.chunks_found > 0) {
    log(colors.yellow, `⚠️  找到 ${response.chunks_found} 個 chunk 但 AI 沒有引用`);
  } else {
    log(colors.blue, 'ℹ️  沒有相關文檔內容');
  }

  if (response.warning) {
    log(colors.yellow, `⚠️  警告：${response.warning}`);
  }
}

// 獲取對話長度
async function getConversationLength(convId) {
  try {
    const response = await axios.get(
      `${API_BASE}/conversations/${convId}`,
      {
        headers: { 'Authorization': `Bearer ${authToken}` }
      }
    );
    return response.data.data.messages.length;
  } catch {
    return 0;
  }
}

// 運行測試
if (require.main === module) {
  testAI();
}

module.exports = { testAI };
