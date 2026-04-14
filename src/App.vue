<template>
  <n-config-provider :theme="theme" :locale="idID" :date-locale="dateIdID">
    <n-message-provider>
      <n-dialog-provider>
        <n-notification-provider>
          <!-- Loading -->
          <div v-if="appState === 'loading'" style="display:flex;align-items:center;justify-content:center;height:100vh">
            <n-spin size="large" />
          </div>

          <!-- Activation Screen -->
          <Activation v-else-if="appState === 'activation'" @activated="onActivated" />

          <!-- Login Screen -->
          <div v-else-if="appState === 'login'" class="login-overlay">
            <div class="login-card">
              <!-- Panel Kiri -->
              <div class="login-left">
                <div class="login-brand">
                  <img src="./assets/logo.png" alt="KasirKu" class="login-brand-logo" />
                  <h1 class="login-brand-name">KasirKu</h1>
                  <p class="login-brand-tagline">Sistem Kasir Modern untuk Bisnis Anda</p>
                </div>
                <div class="login-left-footer">
                  <span>Point of Sale System &copy; 2026</span>
                  <span>PT. Java Inovasi Digital</span>
                </div>
              </div>
              <!-- Panel Kanan -->
              <div class="login-right">
                <div class="login-form-wrap">
                  <h2 class="login-form-title">Selamat Datang</h2>
                  <p class="login-form-sub">Masuk ke akun Anda untuk melanjutkan</p>

                  <div class="login-field">
                    <label class="login-label">Username</label>
                    <n-input
                      v-model:value="loginUsername"
                      placeholder="Masukkan username"
                      size="large"
                      autofocus
                      @keydown.enter="doLogin"
                    >
                      <template #prefix><span style="color:#bbb;font-size:16px">👤</span></template>
                    </n-input>
                  </div>

                  <div class="login-field">
                    <label class="login-label">Password</label>
                    <n-input
                      v-model:value="loginPassword"
                      type="password"
                      show-password-on="click"
                      placeholder="Masukkan password"
                      size="large"
                      @keydown.enter="doLogin"
                    >
                      <template #prefix><span style="color:#bbb;font-size:16px">🔑</span></template>
                    </n-input>
                  </div>

                  <div v-if="loginError" class="login-error">{{ loginError }}</div>

                  <n-button
                    type="primary"
                    size="large"
                    block
                    :loading="loginLoading"
                    @click="doLogin"
                    style="height:56px;font-size:18px;font-weight:700;margin-top:8px"
                  >
                    Masuk
                  </n-button>
                </div>
              </div>
            </div>
          </div>

          <!-- Main App -->
          <div v-else-if="appState === 'app'" class="app-container">
            <Navbar @logout="doLogout" />
            <main class="app-main">
              <router-view />
            </main>
          </div>
        </n-notification-provider>
      </n-dialog-provider>
    </n-message-provider>
  </n-config-provider>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { darkTheme, idID, dateIdID } from 'naive-ui'
import { useRouter } from 'vue-router'
import { useSettingsStore } from './stores/settings'
import { useAuthStore } from './stores/auth'
import Navbar from './components/shared/Navbar.vue'
import Activation from './views/Activation.vue'

const settingsStore = useSettingsStore()
const authStore = useAuthStore()
const router = useRouter()
const theme = computed(() => settingsStore.darkMode ? darkTheme : null)

// State machine: 'loading' | 'activation' | 'login' | 'app'
const appState = ref('loading')

const loginUsername = ref('')
const loginPassword = ref('')
const loginError = ref('')
const loginLoading = ref(false)

async function doLogin() {
  if (!loginUsername.value || !loginPassword.value) return
  loginLoading.value = true
  loginError.value = ''
  const result = await window.api.users.login(loginUsername.value.trim(), loginPassword.value)
  loginLoading.value = false
  if (result.success) {
    authStore.setUser(result.user)
    loginUsername.value = ''
    loginPassword.value = ''
    appState.value = 'app'
    router.push({ name: result.user.role === 'admin' ? 'pengaturan' : 'kasir' })
  } else {
    loginError.value = result.error
    loginPassword.value = ''
  }
}

onMounted(async () => {
  const activated = await window.api.activation.checkStatus()
  if (!activated) {
    appState.value = 'activation'
    return
  }
  await settingsStore.loadSettings()
  appState.value = 'login'
})

async function onActivated() {
  await settingsStore.loadSettings()
  appState.value = 'login'
}

function doLogout() {
  authStore.logout()
  appState.value = 'login'
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  overflow: hidden;
}

#app {
  height: 100%;
}

.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

/* Login screen */
.login-overlay {
  position: fixed;
  inset: 0;
  background: #f0f2f5;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.login-card {
  display: flex;
  width: 960px;
  height: 600px;
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 0 32px 100px rgba(0,0,0,0.18);
}

.login-left {
  width: 380px;
  background: linear-gradient(160deg, #0f7a45 0%, #18a058 50%, #1db971 100%);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 56px 48px;
  position: relative;
  overflow: hidden;
}
.login-left::before {
  content: '';
  position: absolute;
  width: 300px;
  height: 300px;
  background: rgba(255,255,255,0.06);
  border-radius: 50%;
  top: -80px;
  right: -80px;
}
.login-left::after {
  content: '';
  position: absolute;
  width: 200px;
  height: 200px;
  background: rgba(255,255,255,0.06);
  border-radius: 50%;
  bottom: -60px;
  left: -40px;
}

.login-brand {
  position: relative;
  z-index: 1;
}
.login-brand-logo {
  width: 80px;
  height: 80px;
  border-radius: 18px;
  object-fit: cover;
  background: rgba(255,255,255,0.2);
  padding: 0;
  margin-bottom: 24px;
  display: block;
  box-shadow: 0 6px 20px rgba(0,0,0,0.2);
}
.login-brand-name {
  font-size: 42px;
  font-weight: 800;
  color: #fff;
  margin: 0 0 10px;
  letter-spacing: -0.5px;
}
.login-brand-tagline {
  font-size: 16px;
  color: rgba(255,255,255,0.85);
  line-height: 1.5;
  margin: 0 0 12px;
}
.login-brand-company {
  font-size: 12px;
  font-weight: 600;
  color: rgba(255,255,255,0.55);
  letter-spacing: 0.3px;
  margin: 0;
  text-transform: uppercase;
}
.login-left-footer {
  font-size: 14px;
  color: rgba(255,255,255,0.6);
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.login-right {
  flex: 1;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 56px;
}
.login-form-wrap {
  width: 100%;
  max-width: 380px;
}
.login-form-title {
  font-size: 32px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0 0 8px;
}
.login-form-sub {
  font-size: 16px;
  color: #888;
  margin: 0 0 36px;
}
.login-field {
  margin-bottom: 20px;
}
.login-label {
  display: block;
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
}
.login-error {
  background: #fff0f0;
  border: 1px solid #ffc0c0;
  color: #d03050;
  border-radius: 8px;
  padding: 12px 16px;
  font-size: 15px;
  margin-bottom: 16px;
}

.app-main {
  flex: 1;
  overflow: auto;
  background: #f5f5f5;
}

/* Big number styling for kasir */
.price-big {
  font-size: 48px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.price-huge {
  font-size: 72px;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
}

.kembalian-display {
  font-size: 80px;
  font-weight: 900;
  color: #18a058;
  font-variant-numeric: tabular-nums;
}

/* Scrollbar styling */
::-webkit-scrollbar {
  width: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: #ccc;
  border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover {
  background: #999;
}
</style>
