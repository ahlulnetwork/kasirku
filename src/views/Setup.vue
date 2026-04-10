<template>
  <div class="setup-overlay">
    <div class="setup-box">
      <div class="setup-logo">🏪</div>
      <h2 class="setup-title">Selamat Datang di KasirKu</h2>
      <p class="setup-subtitle">Atur akun kasir Anda untuk memulai</p>

      <n-form label-placement="top" style="margin-top: 24px">
        <n-form-item label="Nama Kasir">
          <n-input
            v-model:value="form.namaKasir"
            placeholder="Contoh: Budi Santoso"
            size="large"
            autofocus
          />
        </n-form-item>

        <n-form-item label="Username">
          <n-input
            v-model:value="form.username"
            placeholder="Username untuk login"
            size="large"
          />
        </n-form-item>

        <n-form-item label="Password">
          <n-input
            v-model:value="form.password"
            type="password"
            show-password-on="click"
            placeholder="Buat password baru"
            size="large"
          />
        </n-form-item>

        <n-form-item label="Konfirmasi Password">
          <n-input
            v-model:value="form.confirmPassword"
            type="password"
            show-password-on="click"
            placeholder="Ulangi password"
            size="large"
            @keydown.enter="doSetup"
          />
        </n-form-item>
      </n-form>

      <p v-if="errorMsg" style="color:#d03050;text-align:center;margin-bottom:12px;font-size:13px">❌ {{ errorMsg }}</p>

      <n-button
        type="primary"
        size="large"
        block
        :loading="saving"
        @click="doSetup"
      >
        ✅ Mulai Gunakan KasirKu
      </n-button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const emit = defineEmits(['done'])

const form = ref({ namaKasir: '', username: '', password: '', confirmPassword: '' })
const errorMsg = ref('')
const saving = ref(false)

async function doSetup() {
  errorMsg.value = ''
  if (!form.value.namaKasir.trim()) { errorMsg.value = 'Nama kasir tidak boleh kosong.'; return }
  if (!form.value.username.trim()) { errorMsg.value = 'Username tidak boleh kosong.'; return }
  if (!form.value.password) { errorMsg.value = 'Password tidak boleh kosong.'; return }
  if (form.value.password.length < 4) { errorMsg.value = 'Password minimal 4 karakter.'; return }
  if (form.value.password !== form.value.confirmPassword) { errorMsg.value = 'Konfirmasi password tidak cocok.'; return }

  saving.value = true
  const result = await window.api.users.firstRunSetup({
    namaKasir: form.value.namaKasir.trim(),
    username: form.value.username.trim(),
    password: form.value.password
  })
  saving.value = false

  if (result.success) {
    emit('done')
  } else {
    errorMsg.value = result.error
  }
}
</script>

<style scoped>
.setup-overlay {
  position: fixed;
  inset: 0;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.setup-box {
  background: #fff;
  border-radius: 16px;
  padding: 40px 36px;
  width: 420px;
  box-shadow: 0 24px 64px rgba(0,0,0,0.4);
}

.setup-logo {
  font-size: 48px;
  text-align: center;
  margin-bottom: 8px;
}

.setup-title {
  font-size: 20px;
  font-weight: 700;
  text-align: center;
  margin: 0 0 4px;
  color: #1a1a2e;
}

.setup-subtitle {
  font-size: 13px;
  text-align: center;
  color: #888;
  margin: 0 0 8px;
}
</style>
