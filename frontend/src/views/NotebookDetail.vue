<template>
  <div class="min-h-screen bg-gray-50">
    <header class="bg-white shadow-sm">
      <div class="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
        <div class="flex items-center space-x-4">
          <button @click="goBack" class="text-gray-600">← 返回</button>
          <h1 class="text-2xl font-bold">{{ notebook?.title }}</h1>
        </div>
        <div class="flex space-x-3">
          <button @click="startConversation" class="bg-purple-600 text-white px-4 py-2 rounded-lg">💬 AI 對話</button>
          <label class="bg-blue-600 text-white px-4 py-2 rounded-lg cursor-pointer">
            📤 上傳文檔
            <input type="file" @change="uploadFile" accept=".pdf,.txt,.md" class="hidden" />
          </label>
        </div>
      </div>
    </header>
    
    <main class="max-w-7xl mx-auto px-4 py-8">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- 文檔列表 -->
        <div class="lg:col-span-2">
          <div class="bg-white rounded-xl shadow-sm p-6">
            <h2 class="text-lg font-semibold mb-4">📄 文檔列表 ({{ documents.length }})</h2>
            <div v-if="documents.length===0" class="text-center py-8 text-gray-500">
              <p>暫無文檔</p>
              <p class="text-sm mt-2">點擊「上傳文檔」添加 PDF/TXT/MD 文件</p>
            </div>
            <div v-else class="space-y-3">
              <div v-for="doc in documents" :key="doc.id" class="flex items-center justify-between p-4 border rounded-lg hover:bg-blue-50 cursor-pointer">
                <div class="flex items-center space-x-3">
                  <span class="text-2xl">📄</span>
                  <div>
                    <h3 class="font-medium">{{ doc.title }}</h3>
                    <p class="text-sm text-gray-500">{{ doc.word_count }} 字</p>
                  </div>
                </div>
                <button @click.stop="deleteDoc(doc.id)" class="text-gray-400 hover:text-red-600">🗑️</button>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 對話列表 -->
        <div class="lg:col-span-1">
          <div class="bg-white rounded-xl shadow-sm p-6 sticky top-4">
            <h2 class="text-lg font-semibold mb-4">💬 最近對話 ({{ conversations.length }})</h2>
            <div v-if="conversations.length===0" class="text-center py-8 text-gray-500">
              <p>暫無對話</p>
            </div>
            <div v-else class="space-y-2">
              <div v-for="conv in conversations" :key="conv.id" @click="viewConversation(conv.id)" 
                   class="p-3 border rounded-lg hover:bg-purple-50 cursor-pointer">
                <h3 class="font-medium text-sm">{{ conv.title }}</h3>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import api from '../utils/api'

const router = useRouter()
const route = useRoute()
const notebook = ref(null)
const documents = ref([])
const conversations = ref([])

onMounted(async () => { await fetchData() })

async function fetchData() {
  const res = await api.get(`/notebooks/${route.params.id}`)
  notebook.value = res.data.data.notebook
  documents.value = res.data.data.documents
  conversations.value = res.data.data.conversations
}

async function uploadFile(e) {
  const file = e.target.files[0]
  if (!file) return
  const formData = new FormData()
  formData.append('file', file)
  formData.append('notebook_id', route.params.id)
  try {
    await api.post('/documents/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' }})
    await fetchData()
  } catch (err) { alert('上傳失敗') }
}

async function deleteDoc(id) {
  if (!confirm('確定刪除？')) return
  await api.delete(`/documents/${id}`)
  await fetchData()
}

function startConversation() { router.push(`/conversation/new?notebook_id=${route.params.id}`) }
function viewConversation(id) { router.push(`/conversation/${id}`) }
function goBack() { router.push('/') }
</script>
