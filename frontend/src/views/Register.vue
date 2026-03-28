<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-500 to-blue-600 px-4">
    <div class="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
      <h1 class="text-3xl font-bold text-center mb-6">📓 NotebookMT</h1>
      <h2 class="text-2xl font-bold text-gray-800 mb-6">註冊</h2>
      
      <form @submit.prevent="handleRegister" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">用戶名</label>
          <input v-model="form.username" type="text" required minlength="3" class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">電郵</label>
          <input v-model="form.email" type="email" required class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">密碼</label>
          <input v-model="form.password" type="password" required minlength="6" class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500" />
        </div>
        <div v-if="error" class="text-red-600 text-sm">{{ error }}</div>
        <button type="submit" :disabled="loading" class="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:opacity-50">
          {{ loading ? '註冊中...' : '註冊' }}
        </button>
      </form>
      
      <p class="mt-6 text-center text-gray-600">
        已有賬戶？<router-link to="/login" class="text-green-600 hover:underline">立即登入</router-link>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()
const form = ref({ username: '', email: '', password: '' })
const loading = ref(false)
const error = ref('')

async function handleRegister() {
  loading.value = true
  error.value = ''
  try {
    await authStore.register(form.value.username, form.value.email, form.value.password)
    router.push('/')
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}
</script>
