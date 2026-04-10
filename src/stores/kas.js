import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useKasStore = defineStore('kas', () => {
  const status = ref({ sudahBuka: false, sudahTutup: false })

  const sudahBuka = computed(() => {
    if (!status.value.sudahBuka) return false
    if (!status.value.sudahTutup) return true
    // Buka ulang: record buka lebih baru dari record tutup
    const bukaId = status.value.buka?.id || 0
    const tutupId = status.value.tutup?.id || 0
    return bukaId > tutupId
  })

  async function loadStatus() {
    status.value = await window.api.kas.statusHariIni()
  }

  return { status, sudahBuka, loadStatus }
})
