<template>
  <div class="activation-overlay">
    <div class="activation-box">
      <!-- Logo (klik 5x untuk akses generator) -->
      <div class="act-logo" @click="handleLogoClick" :title="logoClickCount > 0 ? logoClickCount + '/5' : ''">
        <img src="../assets/logo.png" alt="KasirKu" />
      </div>
      <h2 class="act-title">KasirKu</h2>
      <p class="act-subtitle">Aktivasi Aplikasi</p>

      <div class="act-warning">
        ⚠️ Aplikasi belum diaktifkan. Hubungi admin untuk mendapatkan kode aktivasi.
      </div>

      <!-- Device ID -->
      <div class="act-section">
        <label class="act-label">Device ID Perangkat Ini</label>
        <div class="act-device-id">
          <span class="act-device-text">{{ deviceId || 'Memuat...' }}</span>
          <n-button size="small" type="primary" ghost @click="copyDeviceId">
            {{ copied ? '✅ Tersalin' : '📋 Salin' }}
          </n-button>
        </div>
        <p class="act-hint">Salin dan kirimkan Device ID di atas kepada admin untuk mendapatkan kode aktivasi.</p>
      </div>

      <!-- Input Serial Key -->
      <div class="act-section">
        <label class="act-label">Kode Aktivasi / Serial Key</label>
        <n-input
          v-model:value="licenseKey"
          placeholder="XXXXX-XXXXX-XXXXX-XXXXX-XXXXX"
          size="large"
          style="font-family: monospace; letter-spacing: 1px"
          :status="keyError ? 'error' : undefined"
          @keydown.enter="doActivate"
        />
        <p v-if="keyError" class="act-error">{{ keyError }}</p>
      </div>

      <n-button
        type="primary"
        size="large"
        block
        :loading="activating"
        @click="doActivate"
      >
        🔓 Aktifkan
      </n-button>
    </div>

    <!-- Modal Password Generator -->
    <n-modal v-model:show="showPasswordModal" :mask-closable="false" style="width: 360px">
      <n-card title="🔐 Akses Admin" :bordered="false" size="medium">
        <n-form @submit.prevent="checkAdminPassword">
          <n-form-item label="Password Admin">
            <n-input
              v-model:value="adminPassword"
              type="password"
              show-password-on="click"
              placeholder="Masukkan password"
              autofocus
              @keydown.enter="checkAdminPassword"
            />
          </n-form-item>
          <p v-if="passwordError" style="color:#d03050;margin-bottom:12px;font-size:13px">{{ passwordError }}</p>
          <n-space justify="end">
            <n-button @click="showPasswordModal = false">Batal</n-button>
            <n-button type="primary" @click="checkAdminPassword">Masuk</n-button>
          </n-space>
        </n-form>
      </n-card>
    </n-modal>

    <!-- Modal Generator Key -->
    <n-modal v-model:show="showGeneratorModal" :mask-closable="false" style="width: 480px">
      <n-card title="🔑 Generator Kode Aktivasi" :bordered="false" size="medium">
        <n-form>
          <n-form-item label="Device ID Pelanggan">
            <n-input
              v-model:value="genDeviceId"
              placeholder="Paste Device ID pelanggan di sini"
              style="font-family: monospace"
            />
          </n-form-item>
          <n-button type="primary" block @click="doGenerateKey" :loading="generating">
            ⚡ Generate Key
          </n-button>
        </n-form>

        <div v-if="generatedKey" class="gen-result">
          <label class="act-label" style="margin-top:16px;display:block">Kode Aktivasi</label>
          <div class="act-device-id" style="margin-top:8px">
            <span class="act-device-text" style="font-size:16px;letter-spacing:2px">{{ generatedKey }}</span>
            <n-button size="small" type="success" ghost @click="copyGeneratedKey">
              {{ copiedGen ? '✅ Tersalin' : '📋 Salin' }}
            </n-button>
          </div>
        </div>

        <p v-if="genError" style="color:#d03050;margin-top:12px;font-size:13px">{{ genError }}</p>

        <n-divider />
        <n-button block @click="showGeneratorModal = false">Tutup</n-button>
      </n-card>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useMessage } from 'naive-ui'

const emit = defineEmits(['activated'])
const message = useMessage()

const deviceId = ref('')
const licenseKey = ref('')
const keyError = ref('')
const activating = ref(false)
const copied = ref(false)

// Logo 5x tap
const logoClickCount = ref(0)
let logoClickTimer = null

function openAdminModal() {
  adminPassword.value = ''
  passwordError.value = ''
  showPasswordModal.value = true
}

// Admin password modal
const showPasswordModal = ref(false)
const adminPassword = ref('')
const passwordError = ref('')

// Generator modal
const showGeneratorModal = ref(false)
const genDeviceId = ref('')
const generatedKey = ref('')
const genError = ref('')
const generating = ref(false)
const copiedGen = ref(false)

onMounted(async () => {
  deviceId.value = await window.api.activation.getDeviceId()

  // Keyboard shortcut: Ctrl+Shift+K
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'K') {
      e.preventDefault()
      openAdminModal()
    }
  })
})

function handleLogoClick() {
  logoClickCount.value++
  clearTimeout(logoClickTimer)
  logoClickTimer = setTimeout(() => { logoClickCount.value = 0 }, 5000)
  if (logoClickCount.value >= 5) {
    logoClickCount.value = 0
    clearTimeout(logoClickTimer)
    openAdminModal()
  }
}

async function checkAdminPassword() {
  if (!adminPassword.value) return
  // Verifikasi password di main process — password tidak pernah disimpan di frontend
  const valid = await window.api.activation.checkAdminPass(adminPassword.value)
  if (valid) {
    showPasswordModal.value = false
    passwordError.value = ''
    genDeviceId.value = ''
    generatedKey.value = ''
    genError.value = ''
    showGeneratorModal.value = true
  } else {
    passwordError.value = 'Password salah!'
    adminPassword.value = ''
  }
}

async function doGenerateKey() {
  genError.value = ''
  generatedKey.value = ''
  if (!genDeviceId.value.trim()) {
    genError.value = 'Masukkan Device ID pelanggan.'
    return
  }
  generating.value = true
  // Password tidak disimpan di frontend — main process yang pegang
  const result = await window.api.activation.generateKey(genDeviceId.value.trim())
  generating.value = false
  if (result.success) {
    generatedKey.value = result.key
  } else {
    genError.value = result.error
  }
}

async function doActivate() {
  keyError.value = ''
  if (!licenseKey.value.trim()) {
    keyError.value = 'Masukkan kode aktivasi terlebih dahulu.'
    return
  }
  activating.value = true
  const result = await window.api.activation.activate(licenseKey.value)
  activating.value = false
  if (result.success) {
    message.success('Aplikasi berhasil diaktifkan! 🎉')
    setTimeout(() => emit('activated'), 800)
  } else {
    keyError.value = result.error
  }
}

async function copyDeviceId() {
  await navigator.clipboard.writeText(deviceId.value)
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}

async function copyGeneratedKey() {
  await navigator.clipboard.writeText(generatedKey.value)
  copiedGen.value = true
  setTimeout(() => { copiedGen.value = false }, 2000)
}
</script>

<style scoped>
.activation-overlay {
  position: fixed;
  inset: 0;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.activation-box {
  background: #fff;
  border-radius: 16px;
  padding: 40px 36px;
  width: 460px;
  box-shadow: 0 24px 64px rgba(0,0,0,0.4);
}

.act-logo {
  text-align: center;
  cursor: pointer;
  user-select: none;
  margin-bottom: 8px;
}
.act-logo img {
  width: 72px;
  height: 72px;
  object-fit: contain;
  border-radius: 12px;
}

.act-title {
  font-size: 26px;
  font-weight: 700;
  text-align: center;
  color: #1f1f1f;
  margin: 0;
}

.act-subtitle {
  text-align: center;
  color: #888;
  font-size: 14px;
  margin: 4px 0 20px;
}

.act-warning {
  background: #fff8e6;
  border: 1px solid #f0c040;
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 13px;
  color: #7a5c00;
  margin-bottom: 20px;
  line-height: 1.5;
}

.act-section {
  margin-bottom: 18px;
}

.act-label {
  font-size: 13px;
  font-weight: 600;
  color: #555;
  margin-bottom: 8px;
  display: block;
}

.act-device-id {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #f5f5f5;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 10px 14px;
}

.act-device-text {
  font-family: monospace;
  font-size: 13px;
  color: #1f1f1f;
  letter-spacing: 1px;
  flex: 1;
  word-break: break-all;
}

.act-hint {
  font-size: 12px;
  color: #aaa;
  margin-top: 6px;
}

.act-error {
  color: #d03050;
  font-size: 13px;
  margin-top: 6px;
}

.gen-result {
  margin-top: 4px;
}
</style>
