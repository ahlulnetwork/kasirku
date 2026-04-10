<template>
  <div class="admin-users-container">
    <div class="page-header">
      <h2>👥 Kelola Pengguna Kasir</h2>
      <n-button type="primary" @click="openAdd">+ Tambah Kasir</n-button>
    </div>

    <n-card size="small">
      <n-list bordered>
        <n-list-item v-for="u in userList" :key="u.id">
          <div class="user-row">
            <div class="user-info">
              <div class="user-nama">{{ u.nama_kasir || u.username }}</div>
              <div class="user-meta">
                <n-tag size="small" type="default">@{{ u.username }}</n-tag>
                <n-tag v-if="!u.aktif" size="small" type="error">Nonaktif</n-tag>
              </div>
            </div>
            <n-space size="small">
              <n-button size="small" @click="openEdit(u)">✏️</n-button>
              <n-button size="small" type="warning" @click="openResetPass(u)">🔑</n-button>
              <n-button size="small" type="error" @click="confirmDelete(u)">🗑️</n-button>
            </n-space>
          </div>
        </n-list-item>
        <n-list-item v-if="userList.length === 0">
          <div style="text-align:center;color:#aaa;padding:32px 0">Belum ada kasir. Klik "+ Tambah Kasir".</div>
        </n-list-item>
      </n-list>
    </n-card>

    <!-- Modal Tambah/Edit -->
    <n-modal v-model:show="showModal" :mask-closable="false" style="width:420px">
      <n-card :title="editingUser ? '✏️ Edit Pengguna' : '+ Tambah Kasir Baru'" :bordered="false" size="medium">
        <n-form label-placement="left" label-width="130">
          <n-form-item label="Nama Kasir">
            <n-input v-model:value="form.nama_kasir" placeholder="Nama lengkap kasir" />
          </n-form-item>
          <n-form-item label="Username">
            <n-input v-model:value="form.username" placeholder="Username untuk login" />
          </n-form-item>
          <n-form-item :label="editingUser ? 'Password Baru' : 'Password'">
            <n-input
              v-model:value="form.password"
              type="password"
              show-password-on="click"
              :placeholder="editingUser ? 'Kosongkan jika tidak ingin diubah' : 'Password login'"
            />
          </n-form-item>
          <n-form-item v-if="editingUser" label="Status">
            <n-switch v-model:value="form.aktif" :checked-value="1" :unchecked-value="0">
              <template #checked>Aktif</template>
              <template #unchecked>Nonaktif</template>
            </n-switch>
          </n-form-item>
        </n-form>
        <p v-if="formError" style="color:#d03050;font-size:13px;margin-bottom:8px">❌ {{ formError }}</p>
        <n-space justify="end" style="margin-top:8px">
          <n-button @click="showModal = false">Batal</n-button>
          <n-button type="primary" @click="saveForm" :loading="saving">Simpan</n-button>
        </n-space>
      </n-card>
    </n-modal>

    <!-- Modal Reset Password -->
    <n-modal v-model:show="showResetModal" :mask-closable="false" style="width:380px">
      <n-card title="🔑 Reset Password" :bordered="false" size="medium">
        <p style="margin-bottom:12px;color:#666">Reset password untuk <strong>{{ resetTarget?.nama_kasir || resetTarget?.username }}</strong></p>
        <n-input
          v-model:value="resetPass"
          type="password"
          show-password-on="click"
          placeholder="Password baru"
        />
        <n-space justify="end" style="margin-top:16px">
          <n-button @click="showResetModal = false">Batal</n-button>
          <n-button type="primary" @click="doResetPass" :loading="saving">Simpan</n-button>
        </n-space>
      </n-card>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useMessage, useDialog } from 'naive-ui'

const message = useMessage()
const dialog = useDialog()

const userList = ref([])
const showModal = ref(false)
const editingUser = ref(null)
const saving = ref(false)
const formError = ref('')
const form = ref({ nama_kasir: '', username: '', password: '', aktif: 1 })

const showResetModal = ref(false)
const resetTarget = ref(null)
const resetPass = ref('')

onMounted(loadUsers)

async function loadUsers() {
  const all = await window.api.users.getAll()
  userList.value = all.filter(u => u.role !== 'admin')
}

function openAdd() {
  editingUser.value = null
  form.value = { nama_kasir: '', username: '', password: '', aktif: 1 }
  formError.value = ''
  showModal.value = true
}

function openEdit(u) {
  editingUser.value = u
  form.value = { nama_kasir: u.nama_kasir || '', username: u.username, password: '', aktif: u.aktif }
  formError.value = ''
  showModal.value = true
}

async function saveForm() {
  formError.value = ''
  if (!form.value.username.trim()) { formError.value = 'Username tidak boleh kosong.'; return }
  if (!editingUser.value && !form.value.password.trim()) { formError.value = 'Password tidak boleh kosong.'; return }
  saving.value = true
  let result
  if (editingUser.value) {
    result = await window.api.users.update(editingUser.value.id, { ...form.value, role: 'kasir' })
  } else {
    result = await window.api.users.create({ ...form.value, role: 'kasir' })
  }
  saving.value = false
  if (result.success) {
    message.success(editingUser.value ? 'Data diperbarui.' : 'Kasir ditambahkan.')
    showModal.value = false
    await loadUsers()
  } else {
    formError.value = result.error
  }
}

function openResetPass(u) {
  resetTarget.value = u
  resetPass.value = ''
  showResetModal.value = true
}

async function doResetPass() {
  if (!resetPass.value.trim()) { message.warning('Password tidak boleh kosong.'); return }
  saving.value = true
  await window.api.users.resetPassword(resetTarget.value.id, resetPass.value)
  saving.value = false
  showResetModal.value = false
  message.success('Password berhasil direset.')
}

function confirmDelete(u) {
  dialog.warning({
    title: 'Hapus Pengguna',
    content: `Yakin hapus "${u.nama_kasir || u.username}"?`,
    positiveText: 'Hapus',
    negativeText: 'Batal',
    onPositiveClick: async () => {
      const result = await window.api.users.delete(u.id)
      if (result.success) { message.success('Pengguna dihapus.'); await loadUsers() }
      else message.error(result.error)
    }
  })
}
</script>

<style scoped>
.admin-users-container {
  padding: 24px;
  max-width: 700px;
}
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.page-header h2 { margin: 0; }
.user-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}
.user-nama { font-size: 15px; font-weight: 600; color: #333; margin-bottom: 4px; }
.user-meta { display: flex; gap: 6px; align-items: center; }
</style>
