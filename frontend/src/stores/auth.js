import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '../utils/api'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('token') || null)
  const user = ref(JSON.parse(localStorage.getItem('user') || 'null'))
  
  const isAuthenticated = computed(() => !!token.value)
  
  function setAuth(authData) {
    token.value = authData.token
    user.value = authData.user
    localStorage.setItem('token', authData.token)
    localStorage.setItem('user', JSON.stringify(authData.user))
    api.defaults.headers.common['Authorization'] = 'Bearer ' + authData.token
  }
  
  function logout() {
    token.value = null
    user.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    delete api.defaults.headers.common['Authorization']
  }
  
  async function login(username, password) {
    const response = await api.post('/auth/login', { username, password })
    if (response.data.success) {
      setAuth(response.data.data)
      return response.data.data
    }
    throw new Error(response.data.error?.message || 'Login failed')
  }
  
  async function register(username, email, password) {
    const response = await api.post('/auth/register', { username, email, password })
    if (response.data.success) {
      setAuth(response.data.data)
      return response.data.data
    }
    throw new Error(response.data.error?.message || 'Registration failed')
  }
  
  if (token.value) {
    api.defaults.headers.common['Authorization'] = 'Bearer ' + token.value
  }
  
  return { token, user, isAuthenticated, setAuth, logout, login, register }
})
