import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useSettingsStore = defineStore('settings', () => {
  const allSettings = ref({})
  const darkMode = ref(false)

  const namaUsaha = computed(() => allSettings.value.nama_usaha || 'Toko Saya')
  const alamat = computed(() => allSettings.value.alamat || '')
  const kota = computed(() => allSettings.value.kota || '')
  const noHp = computed(() => allSettings.value.no_hp || '')
  const pajakPersen = computed(() => parseFloat(allSettings.value.pajak_persen || '0'))
  const catatanStruk = computed(() => allSettings.value.catatan_struk || '')
  const lebarKertas = computed(() => allSettings.value.lebar_kertas || '58')
  const logoPath = computed(() => allSettings.value.logo_path || '')
  const namaPrinter = computed(() => allSettings.value.nama_printer || '')
  const tampilLogoStruk = computed(() => allSettings.value.tampil_logo_struk === '1')
  const tampilPajakStruk = computed(() => allSettings.value.tampil_pajak_struk === '1')

  async function loadSettings() {
    allSettings.value = await window.api.settings.getAll()
  }

  async function setSetting(key, value) {
    await window.api.settings.set(key, value)
    allSettings.value[key] = value
  }

  return {
    allSettings,
    darkMode,
    namaUsaha,
    alamat,
    kota,
    noHp,
    pajakPersen,
    catatanStruk,
    lebarKertas,
    logoPath,
    namaPrinter,
    tampilLogoStruk,
    tampilPajakStruk,
    loadSettings,
    setSetting
  }
})
