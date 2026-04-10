<template>
  <div class="manage-overlay">
    <div class="manage-box">
      <!-- Header -->
      <div class="manage-header">
        <div class="manage-logo">🏪</div>
        <h2 class="manage-title">KasirKu</h2>
        <p class="manage-subtitle">Kelola Pengguna Kasir</p>
      </div>

      <!-- List User -->
      <div class="user-list" v-if="!showForm">
        <div class="list-header">
          <span class="list-count">{{ userList.length }} pengguna terdaftar</span>
          <n-button type="primary" size="small" @click="openAdd">+ Tambah Kasir</n-button>
        </div>

        <div v-if="userList.length === 0" class="empty-state">
          Belum ada pengguna kasir. Tambahkan sekarang.
        </div>

        <div v-for="u in userList" :key="u.id" class="user-item">
          <div class="user-info">
            <div class="user-nama">{{ u.nama_kasir || u.username }}</div>
            <div class="user-username">@{{ u.username }}</div>
          </div>
          <div class="user-actions">
            <n-button text size="small" @click="openEdit(u)">✏️</n-button>
            <n-button text size="small" type="error" @click="confirmDelete(u)">🗑️</n-button>
          </div>
        </div>
      </div>

      <!-- Form Tambah / Edit -->
      <div class="user-form" v-else>
        <h4 class="form-title">{{ editingUser ? '✏️ Edit Pengguna' : '+ Tambah Kasir Baru' }}</h4>

        <div class="form-field">
          <label>Nama Kasir</label>
          <n-input v-model:value="form.nama_kasir" placeholder="Nama lengkap kasir" size="large" />
        </div>
        <div class="form-field">
          <label>Username</label>
          <n-input v-model:value="form.username" placeholder="Username untuk login" size="large" />
        </div>
        <div class="form-field">
          <label>{{ editingUser ? 'Password Baru (kosongkan jika tidak ganti)' : 'Password' }}</label>
          <n-input
            v-model:value="form.password"
            type="password"
            show-password-on="click"
            :placeholder="editingUser ? 'Biarkan kosong jika tidak ingin mengubah' : 'Password login'"
            size="large"
          />
        </div>

        <p v-if="formError" class="form-error">❌ {{ formError }}</p>

        <div class="form-actions">
          <n-button @click="cancelForm" :disabled="saving">Batal</n-button>
          <n-button type="primary" @click="saveForm" :loading="saving">
            💾 Simpan
          </n-button>
        </div>
      </div>

      <!-- Logout -->
      <div class="manage-footer">
        <n-button text @click="doLogout" style="color:#999;font-size:13px">⬅️ Keluar</n-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useDialog, useMessage } from 'naive-ui'

const emit = defineEmits(['logout'])
const dialog = useDialog()
const message = useMessage()

const userList = ref([])
const showForm = ref(false)
const editingUser = ref(null)
const saving = ref(false)
const formError = ref('')

const form = ref({ nama_kasir: '', username: '', password: '' })

onMounted(loadUsers)

async function loadUsers() {
  const all = await window.api.users.getAll()
  // Hanya tampilkan kasir (bukan admin)
  userList.value = all.filter(u => u.role !== 'admin')
}

function openAdd() {
  editingUser.value = null
  form.value = { nama_kasir: '', username: '', password: '' }
  formError.value = ''
  showForm.value = true
}

function openEdit(u) {
  editingUser.value = u
  form.value = { nama_kasir: u.nama_kasir || '', username: u.username, password: '' }
  formError.value = ''
  showForm.value = true
}

function cancelForm() {
  showForm.value = false
  editingUser.value = null
}

async function saveForm() {
  formError.value = ''
  if (!form.value.username.trim()) {
    formError.value = 'Username tidak boleh kosong.'
    return
  }
  if (!editingUser.value && !form.value.password.trim()) {
    formError.value = 'Password tidak boleh kosong.'
    return
  }
  saving.value = true
  let result
  if (editingUser.value) {
    result = await window.api.users.update(editingUser.value.id, {
      nama_kasir: form.value.nama_kasir.trim(),
      username: form.value.username.trim(),
      password: form.value.password || '',
      role: 'kasir',
      aktif: 1
    })
  } else {
    result = await window.api.users.create({
      nama_kasir: form.value.nama_kasir.trim(),
      username: form.value.username.trim(),
      password: form.value.password.trim(),
      role: 'kasir'
    })
  }
  saving.value = false
  if (result.success) {
    message.success(editingUser.value ? 'Data pengguna diperbarui.' : 'Kasir baru ditambahkan.')
    showForm.value = false
    editingUser.value = null
    await loadUsers()
  } else {
    formError.value = result.error
  }
}

function confirmDelete(u) {
  dialog.warning({
    title: 'Hapus Pengguna',
    content: `Yakin hapus "${u.nama_kasir || u.username}"?`,
    positiveText: 'Hapus',
    negativeText: 'Batal',
    onPositiveClick: async () => {
      const result = await window.api.users.delete(u.id)
      if (result.success) {
        message.success('Pengguna dihapus.')
        await loadUsers()
      } else {
        message.error(result.error)
      }
    }
  })
}

function doLogout() {
  emit('logout')
}
</script>

<style scoped>
.manage-overlay {
  position: fixed;
  inset: 0;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.manage-box {
  background: #fff;
  border-radius: 16px;
  padding: 32px 36px;
  width: 480px;
  max-height: 85vh;
  overflow-y: auto;
  box-shadow: 0 24px 64px rgba(0,0,0,0.4);
}

.manage-header {
  text-align: center;
  margin-bottom: 24px;
}
.manage-logo { font-size: 40px; margin-bottom: 4px; }
.manage-title { font-size: 22px; font-weight: 700; margin: 0; }
.manage-subtitle { font-size: 13px; color: #888; margin: 4px 0 0; }

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.list-count { font-size: 13px; color: #888; }

.empty-state {
  text-align: center;
  color: #aaa;
  padding: 32px 0;
  font-size: 14px;
}

.user-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
}
.user-item:last-child { border-bottom: none; }
.user-nama { font-size: 15px; font-weight: 600; color: #333; }
.user-username { font-size: 12px; color: #999; margin-top: 2px; }
.user-actions { display: flex; gap: 8px; }

.form-title { font-size: 16px; font-weight: 600; margin-bottom: 20px; color: #333; }
.form-field { margin-bottom: 16px; }
.form-field label { display: block; font-size: 13px; color: #555; margin-bottom: 6px; font-weight: 500; }
.form-error { color: #d03050; font-size: 13px; margin-bottom: 12px; }
.form-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px; }

.manage-footer {
  text-align: center;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}
</style>
