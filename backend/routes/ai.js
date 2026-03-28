const express = require("express")
const router = express.Router()
const axios = require("axios")
const { authenticateToken } = require("../middleware/auth")
const { getDatabase } = require("../utils/database")

router.use(authenticateToken)

const API_KEY = "sk-sp-79f5f75cff8d4999a2b14360debea0a2"
const ENDPOINT = "https://coding-intl.dashscope.aliyuncs.com/v1"
const MODEL = "qwen3.5-plus"

router.post("/chat", async (req, res) => {
  try {
    const { notebook_id, message, conversation_id } = req.body
    const db = getDatabase()
    const response = await axios.post(ENDPOINT + "/chat/completions", { 
      model: MODEL, 
      messages: [
        { role: "system", content: "你係 NotebookMT AI 助手，用繁體中文回覆。" }, 
        { role: "user", content: message }
      ] 
    }, { 
      headers: { 
        "Authorization": "Bearer " + API_KEY, 
        "Content-Type": "application/json" 
      } 
    })
    const aiResponse = response.data.choices && response.data.choices[0] && response.data.choices[0].message.content || "無回應"
    let convId = conversation_id
    if (!convId) { 
      const r = db.prepare("INSERT INTO conversations (notebook_id, user_id, title) VALUES (?, ?, ?)").run(notebook_id, req.user.id, message.substring(0, 30))
      convId = r.lastInsertRowid 
    }
    db.prepare("INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)").run(convId, "user", message)
    db.prepare("INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)").run(convId, "assistant", aiResponse)
    res.json({ success: true, data: { conversation_id: convId, message: aiResponse, model: MODEL } })
  } catch (error) { 
    console.error("DashScope Error:", error.response ? error.response.data : error.message)
    res.status(500).json({ success: false, error: { message: error.message } }) 
  }
})

router.post("/summarize", async (req, res) => { 
  res.json({ success: true, data: { summary: "AI 摘要功能開發中..." } }) 
})

router.post("/search", async (req, res) => { 
  const { notebook_id, query } = req.body
  const db = getDatabase()
  const results = db.prepare("SELECT d.id, d.title FROM documents d WHERE d.notebook_id = ? LIMIT 10").all(notebook_id)
  res.json({ success: true, data: { results, query } }) 
})

module.exports = router
