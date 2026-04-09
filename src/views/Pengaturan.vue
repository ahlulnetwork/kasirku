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
                  <img v-if="settings.logo_path" :src="'file://' + settings.logo_path" alt="" />
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

      <!-- A2. Kasir & Pajak -->
      <n-tab-pane name="kasir" tab="👤 Kasir & Pajak">
        <n-card size="small">
          <n-form label-placement="left" label-width="140">
            <n-form-item label="Nama Kasir">
              <n-input v-model:value="settings.nama_kasir" placeholder="Nama kasir aktif" />
            </n-form-item>
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
              <span :style="{ opacity: item.aktif ? 1 : 0.5 }">{{ item.nama }}</span>
              <template #suffix>
                <n-button text type="error" size="small" @click="deleteNonTunai(item.id)">🗑️</n-button>
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
          <n-form label-placement="left" label-width="160">
            <n-form-item label="Lebar Kertas Thermal">
              <n-radio-group v-model:value="settings.lebar_kertas">
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
          <n-form label-placement="left" label-width="160">
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

      <!-- A7. Printer -->
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
              <p style="color: #666; margin: 8px 0">Backup semua data termasuk database, logo, dan foto produk.</p>
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

      <!-- A9. Tampilan -->
      <n-tab-pane name="tampilan" tab="🌙 Tampilan">
        <n-card size="small">
          <n-space vertical size="large">
            <n-form-item label="Mode Gelap (Dark Mode)">
              <n-switch
                :value="settingsStore.darkMode"
                @update:value="settingsStore.darkMode = $event"
                checked-children="🌙 Gelap"
                unchecked-children="☀️ Terang"
              />
            </n-form-item>
            <p style="color: #999; font-size: 12px">Pengaturan tampilan tidak disimpan ke database, hanya berlaku selama aplikasi terbuka.</p>
          </n-space>
        </n-card>
      </n-tab-pane>
    </n-tabs>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useMessage, useDialog } from 'naive-ui'
import { useSettingsStore } from '../stores/settings'

const message = useMessage()
const mydialog = useDialog()
const settingsStore = useSettingsStore()

const settings = ref({})
const saving = ref(false)
const printing = ref(false)
const backingUp = ref(false)
const restoring = ref(false)

const newNonTunai = ref('')
const nonTunaiList = ref([])
const printerList = ref([])

const pajakPersen = ref(0)
const tampilLogo = ref(true)
const tampilPajak = ref(true)

const labelOptions = [
  { label: '30x20mm', value: '30x20' },
  { label: '40x25mm', value: '40x25' },
  { label: '50x30mm', value: '50x30' },
  { label: '58x40mm', value: '58x40' }
]

const printerOptions = computed(() =>
  printerList.value.map(p => ({ label: p.displayName || p.name, value: p.name }))
)

async function loadSettings() {
  const all = await window.api.settings.getAll()
  settings.value = all
  pajakPersen.value = parseFloat(all.pajak_persen || '0')
  tampilLogo.value = all.tampil_logo_struk === '1'
  tampilPajak.value = all.tampil_pajak_struk === '1'
}

async function saveSettings() {
  saving.value = true
  try {
    settings.value.pajak_persen = String(pajakPersen.value)
    settings.value.tampil_logo_struk = tampilLogo.value ? '1' : '0'
    settings.value.tampil_pajak_struk = tampilPajak.value ? '1' : '0'

    for (const [key, value] of Object.entries(settings.value)) {
      await window.api.settings.set(key, value || '')
    }

    await settingsStore.loadSettings()
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
          message.success('Restore berhasil! Aplikasi akan restart...')
          setTimeout(() => location.reload(), 2000)
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
})
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
