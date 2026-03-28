<template>
  <div class="min-h-screen bg-gray-50 flex flex-col">
    <header class="bg-white shadow-sm flex-shrink-0">
      <div class="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
        <button @click="goBack" class="text-gray-600">← 返回</button>
        <h1 class="text-xl font-bold">💬 AI 對話</h1>
      </div>
    </header>
    
    <main class="flex-1 overflow-y-auto">
      <div class="max-w-5xl mx-auto px-4 py-6">
        <div v-if="messages.length===0" class="text-center py-12">
          <div class="text-6xl mb-4">🤖</div>
          <p class="text-gray-600">開始與 AI 對話，詢問關於筆記本的問題</p>
        </div>
        
        <div v-else class="space-y-4">
          <div v-for="msg in messages" :key="msg.id" 
               :class="['flex', msg.role==='user'?'justify-end':'justify-start']">
            <div :class="['max-w-[80%] px-4 py-3 rounded-2xl', msg.role==='user'?'message-user':'message-assistant']">
              <p>{{ msg.content }}</p>
            </div>
          </div>
        </div>
      </div>
    </main>
    
    <footer class="bg-white border-t flex-shrink-0">
      <div class="max-w-5xl mx-auto px-4 py-4">
        <form @submit.prevent="sendMessage" class="flex space-x-3">
          <input v-model="newMessage" placeholder="輸入問題..." class="flex-1 border rounded-xl px-4 py-3" :disabled="loading" />
          <button type="submit" :disabled="!newMessage.trim()||loading" class="bg-purple-600 text-white px-6 py-3 rounded-xl hover:bg-purple-700 disabled:opacity-50">
            📤 發送
          </button>
        </form>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import api from '../utils/api'

const router = useRouter()
const route = useRoute()
const messages = ref([])
const newMessage = ref('')
const loading = ref(false)
const conversationId = ref(null)
const notebookId = ref(route.query.notebook_id)

onMounted(async () => {
  if (route.params.id !== 'new') {
    await fetchConversation()
  }
})

async function fetchConversation() {
  const res = await api.get(`/conversations/${route.params.id}`)
  messages.value = res.data.data.messages
  conversationId.value = res.data.data.conversation.id
}

async function sendMessage() {
  if (!newMessage.value.trim() || loading.value) return
  const userMsg = newMessage.value.trim()
  newMessage.value = ''
  messages.value.push({ id: Date.now(), role: 'user', content: userMsg })
  loading.value = true
  
  try {
    const res = await api.post('/ai/chat', {
      notebook_id: notebookId.value,
      message: userMsg,
      conversation_id: conversationId.value
    })
    conversationId.value = res.data.data.conversation_id
    messages.value.push({ id: Date.now()+1, role: 'assistant', content: res.data.data.message })
  } catch (err) {
    messages.value.push({ id: Date.now()+1, role: 'assistant', content: '錯誤：'+err.message })
  } finally {
    loading.value = false
  }
}

function goBack() {
  if (notebookId.value) router.push(`/notebook/${notebookId.value}`)
  else router.back()
}
</script>
