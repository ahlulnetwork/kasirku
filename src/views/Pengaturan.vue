<template>
  <div class="pengaturan-container">
    <h2 style="margin-bottom: 16px">⚙️ Pengaturan</h2>

    <n-tabs type="line" animated>
      <!-- A1. Informasi Usaha -->
      <n-tab-pane name="usaha" tab="🏪 Informasi Usaha">
        <n-card size="small">
          <n-form label-placement="left" label-width="140">
            <n-form-item label="Logo Usaha">
              <n-space align="center">
                <div class="logo-preview" @click="pickLogo">
                  <img v-if="settings.logo_path" :src="'media://' + settings.logo_path" alt="" />
                  <span v-else>📷 Pilih Logo</span>
                </div>
                <n-button v-if="settings.logo_path" text type="error" @click="settings.logo_path = ''">Hapus</n-button>
              </n-space>
            </n-form-item>
            <n-form-item label="Nama Usaha">
              <n-input v-model:value="settings.nama_usaha" placeholder="Nama usaha" />
            </n-form-item>
            <n-form-item label="Alamat">
              <n-input v-model:value="settings.alamat" placeholder="Alamat usaha" />
            </n-form-item>
            <n-form-item label="Kota">
              <n-input v-model:value="settings.kota" placeholder="Kota" />
            </n-form-item>
            <n-form-item label="No. HP">
              <n-input v-model:value="settings.no_hp" placeholder="08xxxxxxxxxx" />
            </n-form-item>
          </n-form>
          <n-button type="primary" @click="saveSettings" :loading="saving">Simpan</n-button>
        </n-card>
      </n-tab-pane>

      <!-- A2. Pajak -->
      <n-tab-pane name="kasir" tab="💸 Pajak">
        <n-card size="small">
          <n-form label-placement="left" label-width="140">
            <n-form-item label="Pajak (%)">
              <n-input-number v-model:value="pajakPersen" :min="0" :max="100" :precision="1" style="width: 150px" />
              <span style="margin-left: 8px; color: #999">0 = pajak nonaktif</span>
            </n-form-item>
          </n-form>
          <n-button type="primary" @click="saveSettings" :loading="saving">Simpan</n-button>
        </n-card>
      </n-tab-pane>

      <!-- A3. Non Tunai -->
      <n-tab-pane name="nontunai" tab="💳 Non Tunai">
        <n-card size="small">
          <n-input-group style="margin-bottom: 16px">
            <n-input v-model:value="newNonTunai" placeholder="Nama metode (BCA, QRIS, OVO...)" @keydown.enter="addNonTunai" />
            <n-button type="primary" @click="addNonTunai">Tambah</n-button>
          </n-input-group>

          <n-list bordered>
            <n-list-item v-for="item in nonTunaiList" :key="item.id">
              <template #prefix>
                <n-switch :value="!!item.aktif" @update:value="(v) => toggleNonTunai(item, v)" size="small" />
              </template>
              <n-input
                v-if="editingNonTunaiId === item.id"
                v-model:value="editingNonTunaiNama"
                size="small"
                style="width: 200px"
                autofocus
                @keydown.enter="saveEditNonTunai(item)"
                @keydown.escape="editingNonTunaiId = null"
                @blur="saveEditNonTunai(item)"
              />
              <span
                v-else
                :style="{ opacity: item.aktif ? 1 : 0.5, cursor: 'pointer' }"
                @click="startEditNonTunai(item)"
                title="Klik untuk edit"
              >{{ item.nama }}</span>
              <template #suffix>
                <div style="display:flex;gap:4px;align-items:center">
                  <n-button text size="small" @click="startEditNonTunai(item)">✏️</n-button>
                  <n-button text type="error" size="small" @click="deleteNonTunai(item.id)">🗑️</n-button>
                </div>
              </template>
            </n-list-item>
          </n-list>
        </n-card>
      </n-tab-pane>

      <!-- A4. Struk -->
      <n-tab-pane name="struk" tab="🧾 Struk">
        <n-card size="small">
          <n-form label-placement="left" label-width="160">
            <n-form-item label="Catatan Bawah Struk">
              <n-input v-model:value="settings.catatan_struk" type="textarea" :rows="2"
                placeholder="Terima kasih atas kunjungan Anda!" />
            </n-form-item>
            <n-form-item label="Tampilkan Logo">
              <n-switch v-model:value="tampilLogo" />
            </n-form-item>
            <n-form-item label="Tampilkan Pajak">
              <n-switch v-model:value="tampilPajak" />
            </n-form-item>
          </n-form>
          <n-button type="primary" @click="saveSettings" :loading="saving">Simpan</n-button>
        </n-card>
      </n-tab-pane>

      <!-- A5. Lebar Kertas -->
      <n-tab-pane name="kertas" tab="📏 Lebar Kertas">
        <n-card size="small">
          <n-form label-placement="left" label-width="180">
            <n-form-item label="Lebar Kertas Struk">
              <n-radio-group v-model:value="settings.lebar_kertas">
                <n-space>
                  <n-radio value="58">58mm</n-radio>
                  <n-radio value="80">80mm</n-radio>
                </n-space>
              </n-radio-group>
            </n-form-item>
            <n-form-item label="Lebar Kertas Label">
              <n-radio-group v-model:value="settings.lebar_kertas_label">
                <n-space>
                  <n-radio value="58">58mm</n-radio>
                  <n-radio value="80">80mm</n-radio>
                </n-space>
              </n-radio-group>
            </n-form-item>
          </n-form>
          <n-button type="primary" @click="saveSettings" :loading="saving">Simpan</n-button>
        </n-card>
      </n-tab-pane>

      <!-- A6. Label Stiker -->
      <n-tab-pane name="label" tab="🏷️ Label Stiker">
        <n-card size="small">
          <n-form label-placement="left" label-width="180">
            <n-form-item label="Ukuran Label">
              <n-select v-model:value="settings.ukuran_label" :options="labelOptions" style="width: 200px" />
            </n-form-item>
            <n-form-item label="Kolom per Baris">
              <n-radio-group v-model:value="settings.label_kolom">
                <n-space>
                  <n-radio value="1">1</n-radio>
                  <n-radio value="2">2</n-radio>
                  <n-radio value="3">3</n-radio>
                </n-space>
              </n-radio-group>
            </n-form-item>
          </n-form>
          <n-button type="primary" @click="saveSettings" :loading="saving">Simpan</n-button>
        </n-card>
      </n-tab-pane>
        </n-card>
      </n-tab-pane>

      <!-- A6. Printer -->
      <n-tab-pane name="printer" tab="🖨️ Printer">
        <n-card size="small">
          <n-form label-placement="left" label-width="160">
            <n-form-item label="Printer Thermal">
              <n-select
                v-model:value="settings.nama_printer"
                :options="printerOptions"
                placeholder="Pilih printer"
                style="width: 300px"
              />
            </n-form-item>
          </n-form>
          <n-space>
            <n-button @click="loadPrinters">🔄 Refresh Printer</n-button>
            <n-button type="info" @click="testPrint" :loading="printing">🖨️ Test Print</n-button>
            <n-button type="primary" @click="saveSettings" :loading="saving">Simpan</n-button>
          </n-space>
        </n-card>
      </n-tab-pane>

      <!-- A8. Backup & Restore -->
      <n-tab-pane name="backup" tab="💾 Backup & Restore">
        <n-card size="small">
          <n-space vertical size="large">
            <div>
              <h4>📤 Backup Data</h4>
              <p style="color: #666; margin: 8px 0">Backup semua data termasuk database dan foto produk.</p>
              <n-button type="primary" @click="createBackup" :loading="backingUp">
                Buat Backup
              </n-button>
            </div>
            <n-divider />
            <div>
              <h4>📥 Restore Data</h4>
              <p style="color: #d03050; margin: 8px 0">⚠️ Restore akan menimpa semua data yang ada saat ini!</p>
              <n-button type="warning" @click="restoreBackup" :loading="restoring">
                Pilih File Backup
              </n-button>
            </div>
          </n-space>
        </n-card>
      </n-tab-pane>

      <!-- A9. Keamanan -->
      <n-tab-pane name="keamanan" tab="🔐 Keamanan">
        <n-card size="small">
          <n-space vertical size="large">
            <div>
              <h4>Ganti Password Saya</h4>
              <p style="color:#666;margin:8px 0 16px">Mengganti password untuk akun <strong>{{ authStore.namaKasir }}</strong>.</p>

              <n-form label-placement="left" label-width="180">
                <n-form-item label="Password Lama">
                  <n-input
                    v-model:value="oldPassword"
                    type="password"
                    show-password-on="click"
                    placeholder="Masukkan password lama"
                    style="max-width:280px"
                  />
                </n-form-item>
                <n-form-item label="Password Baru">
                  <n-input
                    v-model:value="newPassword"
                    type="password"
                    show-password-on="click"
                    placeholder="Masukkan password baru"
                    style="max-width:280px"
                  />
                </n-form-item>
                <n-form-item label="Konfirmasi Password">
                  <n-input
                    v-model:value="confirmPassword"
                    type="password"
                    show-password-on="click"
                    placeholder="Ulangi password baru"
                    style="max-width:280px"
                    @keydown.enter="savePassword"
                  />
                </n-form-item>
              </n-form>

              <n-button type="primary" @click="savePassword" :loading="savingPassword">
                💾 Simpan Password
              </n-button>
            </div>
          </n-space>
        </n-card>
      </n-tab-pane>

      <!-- A10. Pengguna (admin only) -->
      <n-tab-pane v-if="authStore.isAdmin" name="pengguna" tab="👥 Pengguna">
        <n-card size="small">
          <n-space vertical>
            <div style="display:flex;justify-content:space-between;align-items:center">
              <h4>Daftar Pengguna</h4>
              <n-button type="primary" size="small" @click="openAddUser">
                + Tambah User
              </n-button>
            </div>

            <n-list bordered>
              <n-list-item v-for="u in userList" :key="u.id" style="display:flex;align-items:center;justify-content:space-between">
                <n-space align="center">
                  <n-tag :type="u.role === 'admin' ? 'warning' : 'default'" size="small">
                    {{ u.role === 'admin' ? '👑 Admin' : '👤 Kasir' }}
                  </n-tag>
                  <span :style="{ fontWeight: u.id === authStore.userId ? 700 : 400 }">{{ u.username }}</span>
                  <n-tag v-if="u.id === authStore.userId" size="tiny" type="success">Saya</n-tag>
                  <n-tag v-if="!u.aktif" size="tiny" type="error">Nonaktif</n-tag>
                </n-space>
                <n-space size="small">
                  <n-button text size="small" @click="openEditUser(u)">✏️</n-button>
                  <n-button text size="small" @click="openResetPass(u)">🔑</n-button>
                  <n-button
                    v-if="u.id !== authStore.userId"
                    text size="small" type="error"
                    @click="deleteUser(u)"
                  >🗑️</n-button>
                </n-space>
              </n-list-item>
            </n-list>
          </n-space>
        </n-card>
      </n-tab-pane>

    </n-tabs>

    <!-- Modal Tambah/Edit User -->
    <n-modal v-model:show="showUserModal" :mask-closable="false" style="width:400px">
      <n-card :title="editingUser ? '✏️ Edit User' : '+ Tambah User'" :bordered="false" size="medium">
        <n-form label-placement="left" label-width="130">
          <n-form-item label="Username">
            <n-input v-model:value="userForm.username" placeholder="Username" />
          </n-form-item>
          <n-form-item v-if="!editingUser" label="Password">
            <n-input v-model:value="userForm.password" type="password" show-password-on="click" placeholder="Password" />
          </n-form-item>
          <n-form-item label="Role">
            <n-select
              v-model:value="userForm.role"
              :options="[{label:'👑 Admin',value:'admin'},{label:'👤 Kasir',value:'kasir'}]"
              style="width:150px"
            />
          </n-form-item>
          <n-form-item v-if="editingUser" label="Status">
            <n-switch v-model:value="userForm.aktif" :checked-value="1" :unchecked-value="0">
              <template #checked>Aktif</template>
              <template #unchecked>Nonaktif</template>
            </n-switch>
          </n-form-item>
        </n-form>
        <n-space justify="end" style="margin-top:8px">
          <n-button @click="showUserModal = false">Batal</n-button>
          <n-button type="primary" @click="saveUser" :loading="savingUser">Simpan</n-button>
        </n-space>
      </n-card>
    </n-modal>

    <!-- Modal Reset Password -->
    <n-modal v-model:show="showResetPassModal" :mask-closable="false" style="width:380px">
      <n-card title="🔑 Reset Password" :bordered="false" size="medium">
        <p style="margin-bottom:12px;color:#666">Reset password untuk <strong>{{ resetPassUser?.username }}</strong></p>
        <n-input
          v-model:value="resetPassValue"
          type="password"
          show-password-on="click"
          placeholder="Password baru"
        />
        <n-space justify="end" style="margin-top:16px">
          <n-button @click="showResetPassModal = false">Batal</n-button>
          <n-button type="primary" @click="doResetPass" :loading="savingUser">Simpan</n-button>
        </n-space>
      </n-card>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useMessage, useDialog } from 'naive-ui'
import { useSettingsStore } from '../stores/settings'
import { useAuthStore } from '../stores/auth'

const message = useMessage()
const mydialog = useDialog()
const settingsStore = useSettingsStore()
const authStore = useAuthStore()

const settings = ref({})
const saving = ref(false)
const printing = ref(false)
const backingUp = ref(false)
const restoring = ref(false)
const savingPassword = ref(false)
const oldPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')

const userList = ref([])
const showUserModal = ref(false)
const editingUser = ref(null)
const userForm = ref({ username: '', password: '', role: 'kasir', aktif: 1 })
const savingUser = ref(false)
const showResetPassModal = ref(false)
const resetPassUser = ref(null)
const resetPassValue = ref('')

const newNonTunai = ref('')
const nonTunaiList = ref([])
const editingNonTunaiId = ref(null)
const editingNonTunaiNama = ref('')
const printerList = ref([])

const pajakPersen = ref(0)

// Computed setters: langsung baca/tulis ke settings.value
const tampilLogo = computed({
  get: () => settings.value.tampil_logo_struk === '1',
  set: (val) => { settings.value.tampil_logo_struk = val ? '1' : '0' }
})
const tampilPajak = computed({
  get: () => settings.value.tampil_pajak_struk === '1',
  set: (val) => { settings.value.tampil_pajak_struk = val ? '1' : '0' }
})

const printerOptions = computed(() =>
  printerList.value.map(p => ({ label: p.displayName || p.name, value: p.name }))
)

const labelOptions = [
  { label: '30x20mm', value: '30x20' },
  { label: '40x25mm', value: '40x25' },
  { label: '50x30mm', value: '50x30' },
  { label: '58x40mm', value: '58x40' }
]

async function loadSettings() {
  const all = await window.api.settings.getAll()
  if (!all.tampil_logo_struk) all.tampil_logo_struk = '1'
  if (!all.tampil_pajak_struk) all.tampil_pajak_struk = '1'
  if (!all.lebar_kertas_label) all.lebar_kertas_label = '58'
  settings.value = all
  pajakPersen.value = parseFloat(all.pajak_persen || '0')
}

async function saveSettings() {
  saving.value = true
  try {
    // pajak_persen disimpan sebagai string
    settings.value.pajak_persen = String(pajakPersen.value)
    // tampil_logo_struk & tampil_pajak_struk sudah diupdate langsung
    // via computed setter saat toggle diklik — tidak perlu assign lagi

    for (const [key, value] of Object.entries(settings.value)) {
      // Gunakan String(value ?? '') bukan value||'' agar '0' dan false tersimpan benar
      await window.api.settings.set(key, value == null ? '' : String(value))
    }

    await settingsStore.loadSettings()  // update Pinia store (untuk cetak)
    await loadSettings()                // sync ulang komponen dari DB (untuk UI)
    message.success('Pengaturan disimpan')
  } catch (e) {
    message.error('Gagal menyimpan: ' + e.message)
  }
  saving.value = false
}

async function pickLogo() {
  const filePath = await window.api.dialog.openFile({
    filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp'] }]
  })
  if (filePath) {
    const compressed = await window.api.image.compressLogo(filePath)
    settings.value.logo_path = compressed
  }
}

// Non Tunai
async function loadNonTunai() {
  nonTunaiList.value = await window.api.nontunai.getAll()
}

async function addNonTunai() {
  if (!newNonTunai.value.trim()) return
  await window.api.nontunai.create({ nama: newNonTunai.value.trim() })
  newNonTunai.value = ''
  await loadNonTunai()
  message.success('Metode non tunai ditambahkan')
}

async function toggleNonTunai(item, aktif) {
  await window.api.nontunai.update(item.id, { nama: item.nama, aktif: aktif ? 1 : 0 })
  await loadNonTunai()
}

function startEditNonTunai(item) {
  editingNonTunaiId.value = item.id
  editingNonTunaiNama.value = item.nama
}

async function saveEditNonTunai(item) {
  if (!editingNonTunaiNama.value.trim() || editingNonTunaiId.value !== item.id) return
  await window.api.nontunai.update(item.id, { nama: editingNonTunaiNama.value.trim(), aktif: item.aktif })
  editingNonTunaiId.value = null
  await loadNonTunai()
  message.success('Metode diupdate')
}

async function deleteNonTunai(id) {
  await window.api.nontunai.delete(id)
  await loadNonTunai()
  message.success('Metode dihapus')
}

// Printer
async function loadPrinters() {
  printerList.value = await window.api.system.getPrinters()
}

async function testPrint() {
  if (!settings.value.nama_printer) {
    message.warning('Pilih printer terlebih dahulu')
    return
  }
  printing.value = true
  try {
    await window.api.print.testPrint(settings.value.nama_printer)
    message.success('Test print berhasil!')
  } catch (e) {
    message.error('Test print gagal: ' + e.message)
  }
  printing.value = false
}

// Backup & Restore
async function createBackup() {
  const namaUsaha = (settings.value.nama_usaha || 'kasirku').replace(/\s+/g, '_')
  const now = new Date()
  const timestamp = now.toISOString().replace(/[-:T]/g, '').split('.')[0]
  const defaultName = `${namaUsaha}_${timestamp}.kasirku-backup`

  const savePath = await window.api.dialog.saveFile({
    defaultPath: defaultName,
    filters: [{ name: 'KasirKu Backup', extensions: ['kasirku-backup'] }]
  })

  if (!savePath) return

  backingUp.value = true
  try {
    await window.api.backup.create(savePath)
    message.success('Backup berhasil dibuat!')
  } catch (e) {
    message.error('Backup gagal: ' + e.message)
  }
  backingUp.value = false
}

async function restoreBackup() {
  const filePath = await window.api.dialog.openFile({
    filters: [{ name: 'KasirKu Backup', extensions: ['kasirku-backup'] }]
  })

  if (!filePath) return

  try {
    const info = await window.api.backup.getInfo(filePath)

    mydialog.warning({
      title: 'Konfirmasi Restore',
      content: `Restore backup dari tanggal ${new Date(info.date).toLocaleString('id-ID')}? Semua data saat ini akan ditimpa!`,
      positiveText: 'Restore',
      negativeText: 'Batal',
      onPositiveClick: async () => {
        restoring.value = true
        try {
          await window.api.backup.restore(filePath)
          message.success('Restore berhasil! Aplikasi akan restart otomatis...')
          // app.relaunch() + app.quit() sudah dipanggil dari main process
        } catch (e) {
          message.error('Restore gagal: ' + e.message)
        }
        restoring.value = false
      }
    })
  } catch (e) {
    message.error('File backup tidak valid')
  }
}

onMounted(async () => {
  await loadSettings()
  await loadNonTunai()
  await loadPrinters()
  if (authStore.isAdmin) await loadUsers()
})

// Password functions
async function savePassword() {
  if (!oldPassword.value) {
    message.warning('Masukkan password lama')
    return
  }
  if (!newPassword.value) {
    message.warning('Password baru tidak boleh kosong')
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    message.error('Konfirmasi password tidak cocok!')
    return
  }
  savingPassword.value = true
  const result = await window.api.users.changePassword(authStore.userId, oldPassword.value, newPassword.value)
  savingPassword.value = false
  if (result.success) {
    oldPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
    message.success('Password berhasil diubah.')
  } else {
    message.error(result.error)
  }
}

// User management
async function loadUsers() {
  userList.value = await window.api.users.getAll()
}

function openAddUser() {
  editingUser.value = null
  userForm.value = { username: '', password: '', role: 'kasir', aktif: 1 }
  showUserModal.value = true
}

function openEditUser(u) {
  editingUser.value = u
  userForm.value = { username: u.username, password: '', role: u.role, aktif: u.aktif }
  showUserModal.value = true
}

async function saveUser() {
  if (!userForm.value.username.trim()) {
    message.warning('Username tidak boleh kosong')
    return
  }
  if (!editingUser.value && !userForm.value.password) {
    message.warning('Password tidak boleh kosong')
    return
  }
  savingUser.value = true
  let result
  if (editingUser.value) {
    result = await window.api.users.update(editingUser.value.id, { ...userForm.value })
  } else {
    result = await window.api.users.create({ ...userForm.value })
  }
  savingUser.value = false
  if (result.success) {
    message.success(editingUser.value ? 'User diperbarui' : 'User ditambahkan')
    showUserModal.value = false
    await loadUsers()
  } else {
    message.error(result.error)
  }
}

function openResetPass(u) {
  resetPassUser.value = u
  resetPassValue.value = ''
  showResetPassModal.value = true
}

async function doResetPass() {
  if (!resetPassValue.value.trim()) {
    message.warning('Password baru tidak boleh kosong')
    return
  }
  savingUser.value = true
  await window.api.users.resetPassword(resetPassUser.value.id, resetPassValue.value)
  savingUser.value = false
  showResetPassModal.value = false
  message.success('Password berhasil direset')
}

async function deleteUser(u) {
  mydialog.warning({
    title: 'Hapus User',
    content: `Yakin hapus user "${u.username}"?`,
    positiveText: 'Hapus',
    negativeText: 'Batal',
    onPositiveClick: async () => {
      const result = await window.api.users.delete(u.id)
      if (result.success) {
        message.success('User dihapus')
        await loadUsers()
      } else {
        message.error(result.error)
      }
    }
  })
}
</script>

<style scoped>
.pengaturan-container {
  padding: 16px;
  height: 100%;
  overflow: auto;
}

.logo-preview {
  width: 100px;
  height: 100px;
  border: 2px dashed #ddd;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  overflow: hidden;
  font-size: 13px;
  color: #999;
}

.logo-preview img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.logo-preview:hover {
  border-color: #18a058;
}
</style>
