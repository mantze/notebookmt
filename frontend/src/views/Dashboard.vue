<template>
  <div class="min-h-screen bg-gray-50">
    <header class="bg-white shadow-sm">
      <div class="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
        <h1 class="text-2xl font-bold">📓 NotebookMT</h1>
        <button @click="logout" class="text-gray-600 hover:text-red-600">登出</button>
      </div>
    </header>
    
    <main class="max-w-7xl mx-auto px-4 py-8">
      <div class="mb-6 flex justify-between items-center">
        <h2 class="text-xl font-semibold">我的筆記本</h2>
        <button @click="showCreateModal=true" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">➕ 新建筆記本</button>
      </div>
      
      <div v-if="loading" class="text-center py-12">載入中...</div>
      <div v-else-if="notebooks.length===0" class="text-center py-12 bg-white rounded-xl">
        <p class="text-gray-500 mb-4">還沒有筆記本</p>
        <button @click="showCreateModal=true" class="bg-blue-600 text-white px-6 py-2 rounded-lg">創建第一個筆記本</button>
      </div>
      
      <div v-else class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div v-for="nb in notebooks" :key="nb.id" @click="goToNotebook(nb.id)" 
             class="bg-white p-6 rounded-xl shadow-sm hover:shadow-md cursor-pointer">
          <h3 class="text-lg font-semibold">{{ nb.title }}</h3>
          <p class="text-sm text-gray-500 mt-2">{{ nb.document_count }} 個文檔</p>
        </div>
      </div>
    </main>
    
    <!-- 創建筆記本 Modal -->
    <div v-if="showCreateModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-xl p-6 max-w-md w-full">
        <h3 class="text-xl font-bold mb-4">創建新筆記本</h3>
        <input v-model="newNotebook.title" placeholder="標題" class="w-full border rounded-lg px-4 py-2 mb-4" />
        <textarea v-model="newNotebook.description" placeholder="描述" class="w-full border rounded-lg px-4 py-2 mb-4" rows="3"></textarea>
        <div class="flex space-x-3">
          <button @click="showCreateModal=false" class="flex-1 border py-2 rounded-lg">取消</button>
          <button @click="createNotebook" class="flex-1 bg-blue-600 text-white py-2 rounded-lg">創建</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import api from '../utils/api'

const router = useRouter()
const authStore = useAuthStore()
const notebooks = ref([])
const loading = ref(true)
const showCreateModal = ref(false)
const newNotebook = ref({ title: '', description: '' })

onMounted(async () => { await fetchNotebooks() })

async function fetchNotebooks() {
  try {
    const res = await api.get('/notebooks')
    notebooks.value = res.data.data.notebooks
  } finally { loading.value = false }
}

async function createNotebook() {
  try {
    await api.post('/notebooks', newNotebook.value)
    showCreateModal.value = false
    newNotebook.value = { title: '', description: '' }
    await fetchNotebooks()
  } catch (err) { alert('創建失敗') }
}

function goToNotebook(id) { router.push(`/notebook/${id}`) }
function logout() { authStore.logout(); router.push('/login') }
</script>
