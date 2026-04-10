import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const currentUser = ref(null) // { id, username, role }

  const isLoggedIn = computed(() => currentUser.value !== null)
  const isAdmin = computed(() => currentUser.value?.role === 'admin')
  const namaKasir = computed(() => currentUser.value?.nama_kasir || currentUser.value?.username || 'Kasir')
  const userId = computed(() => currentUser.value?.id || null)

  function setUser(user) {
    currentUser.value = user
  }

  function logout() {
    currentUser.value = null
  }

  return {
    currentUser,
    isLoggedIn,
    isAdmin,
    namaKasir,
    userId,
    setUser,
    logout
  }
})
