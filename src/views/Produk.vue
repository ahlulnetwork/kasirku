<template>
  <div class="produk-container">
    <div class="produk-header">
      <h2>Kelola Produk</h2>
      <n-space>
        <n-button @click="showKategoriModal = true">📁 Kelola Kategori</n-button>
        <n-button type="primary" @click="openForm(null)">+ Tambah Produk</n-button>
      </n-space>
    </div>

    <!-- Filters -->
    <div class="produk-filters">
      <n-input
        v-model:value="search"
        placeholder="Cari nama produk / kode / barcode..."
        clearable
        style="width: 300px"
      >
        <template #prefix><n-icon :component="SearchOutline" /></template>
      </n-input>
      <n-select
        v-model:value="filterKategori"
        :options="kategoriOptions"
        placeholder="Semua Kategori"
        clearable
        style="width: 200px"
      />
      <n-select
        v-model:value="filterStok"
        :options="stokOptions"
        placeholder="Semua Stok"
        clearable
        style="width: 180px"
      />
    </div>

    <!-- Product Table -->
    <n-data-table
      :columns="columns"
      :data="filteredProducts"
      :pagination="{ pageSize: 20 }"
      :row-key="row => row.id"
      striped
      style="margin: 16px"
    />

    <!-- Form Modal -->
    <n-modal v-model:show="showForm" style="width: 860px" :mask-closable="false">
      <n-card :title="editingProduct ? 'Edit Produk' : 'Tambah Produk'" :bordered="false">
        <n-form ref="formRef" :model="form" label-placement="top">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0 28px; align-items: start;">

            <!-- Kolom Kiri -->
            <div>
              <n-form-item label="Foto Produk">
                <n-space align="center">
                  <div class="foto-preview" @click="pickFoto">
                    <img v-if="form.foto_path" :src="'media://' + form.foto_path" alt="" />
                    <span v-else>📷 Pilih Foto</span>
                  </div>
                  <n-button v-if="form.foto_path" text type="error" @click="form.foto_path = ''">Hapus Foto</n-button>
                </n-space>
              </n-form-item>

              <n-form-item label="Nama Produk" required>
                <n-input v-model:value="form.nama" placeholder="Nama produk" />
              </n-form-item>

              <n-form-item label="Kode Produk" required>
                <n-input-group>
                  <n-input v-model:value="form.kode_produk" placeholder="Kode produk otomatis, tetap bisa diedit" />
                  <n-button @click="generateKodeProduk">Generate</n-button>
                </n-input-group>
              </n-form-item>

              <n-form-item label="Kategori" required>
                <n-select v-model:value="form.kategori_id" :options="kategoriSelectOptions" placeholder="Pilih kategori" />
              </n-form-item>

              <n-form-item label="Deskripsi">
                <n-input v-model:value="form.deskripsi" type="textarea" :rows="3" placeholder="Opsional" />
              </n-form-item>

              <n-form-item v-if="editingProduct" label="Status">
                <n-switch v-model:value="form.aktif" :checked-value="1" :unchecked-value="0">
                  <template #checked>Aktif</template>
                  <template #unchecked>Nonaktif</template>
                </n-switch>
              </n-form-item>
            </div>

            <!-- Kolom Kanan -->
            <div>
              <n-form-item label="Harga Beli">
                <n-input-number v-model:value="form.harga_beli" :min="0" style="width: 100%" :show-button="false">
                  <template #prefix>Rp</template>
                </n-input-number>
              </n-form-item>

              <n-form-item label="Harga Jual" required>
                <n-input-number v-model:value="form.harga_jual" :min="0" style="width: 100%" :show-button="false">
                  <template #prefix>Rp</template>
                </n-input-number>
              </n-form-item>

              <n-form-item label="Barcode" required>
                <n-space vertical style="width:100%">
                  <n-input-group>
                    <n-input v-model:value="form.barcode" placeholder="Barcode otomatis, tetap bisa diedit" />
                    <n-button @click="generateBarcode">Generate</n-button>
                  </n-input-group>
                  <span class="form-hint">Barcode wajib diisi. Saat tambah produk barcode akan dibuat otomatis, dan tetap bisa digenerate ulang atau diedit manual.</span>
                  <!-- Preview barcode -->
                  <div v-if="form.barcode" style="background:#fff;padding:8px;border:1px solid #e8e8e8;border-radius:6px;text-align:center;">
                    <div v-if="form.nama" style="font-size:12px;font-weight:600;margin-bottom:4px;color:#333;">{{ form.nama }}</div>
                    <svg :id="'barcode-preview'" ref="barcodePreviewSvg"></svg>
                  </div>
                </n-space>
              </n-form-item>

              <n-form-item label="Stok">
                <n-space align="center">
                  <n-input-number
                    v-if="!form.unlimited"
                    v-model:value="form.stok"
                    :min="0"
                    style="width: 120px"
                  />
                  <n-checkbox v-model:checked="form.unlimited">Unlimited</n-checkbox>
                </n-space>
              </n-form-item>

              <n-form-item v-if="!form.unlimited" label="Stok Minimum">
                <n-input-number v-model:value="form.stok_minimum" :min="1" style="width: 120px" />
              </n-form-item>

              <n-form-item label="Satuan">
                <n-select
                  v-model:value="form.satuan"
                  :options="satuanOptions"
                  tag
                  filterable
                  style="width: 150px"
                />
              </n-form-item>
            </div>

          </div>
        </n-form>

        <template #footer>
          <n-space justify="end">
            <n-button @click="showForm = false">Batal</n-button>
            <n-button type="primary" @click="saveProduct" :loading="saving">Simpan</n-button>
          </n-space>
        </template>
      </n-card>
    </n-modal>

    <!-- Kategori Modal -->
    <n-modal v-model:show="showKategoriModal" style="width: 450px">
      <n-card title="📁 Kelola Kategori" :bordered="false">
        <n-space vertical>
          <n-input-group>
            <n-input v-model:value="newKategori" placeholder="Nama kategori baru" @keydown.enter="addKategori" />
            <n-button type="primary" @click="addKategori">Tambah</n-button>
          </n-input-group>

          <n-list bordered>
            <n-list-item v-for="kat in kategoriList" :key="kat.id" style="display:flex;align-items:center;justify-content:space-between">
              <n-space align="center" size="small">
                <span>{{ kat.nama }}</span>
                <n-tag v-if="kat.is_default" type="success" size="small" round>Default</n-tag>
              </n-space>
              <n-space size="small">
                <n-button
                  text size="small"
                  :title="kat.is_default ? 'Hapus default' : 'Jadikan default'"
                  @click="setDefaultKategori(kat)"
                >{{ kat.is_default ? '⭐' : '☆' }}</n-button>
                <n-button text size="small" @click="editKategori(kat)">✏️</n-button>
                <n-button text size="small" type="error" @click="deleteKategori(kat.id)">🗑️</n-button>
              </n-space>
            </n-list-item>
          </n-list>
        </n-space>
      </n-card>
    </n-modal>

    <!-- Label Stiker Modal -->
    <n-modal v-model:show="showLabelModal" style="width: 500px">
      <n-card title="🏷️ Cetak Label Barcode" :bordered="false">
        <n-space vertical>
          <div v-for="(item, idx) in labelItems" :key="idx" class="label-item-row">
            <span style="flex:1;font-weight:600">{{ item.nama }}</span>
            <span style="color:#999;font-size:12px;margin: 0 8px">{{ item.barcode }}</span>
            <n-input-number
              v-model:value="labelQty[idx]"
              :min="1" :max="100"
              size="small"
              style="width:80px"
            />
            <span style="font-size:12px;color:#666;margin-left:4px">lembar</span>
          </div>
        </n-space>
        <template #footer>
          <n-space justify="end">
            <n-button @click="showLabelModal = false">Batal</n-button>
            <n-button type="primary" @click="cetakLabel" :loading="printingLabel">
              🖨️ Cetak
            </n-button>
          </n-space>
        </template>
      </n-card>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, computed, h, onMounted, watch, nextTick } from 'vue'
import { useMessage, useDialog, NButton, NSpace, NTag } from 'naive-ui'
import JsBarcode from 'jsbarcode'
import { useProductsStore } from '../stores/products'
import { formatCurrency } from '../utils/formatCurrency'
import { generateBarcodeNumber, generateProductCode } from '../utils/generateBarcode'
import { SearchOutline } from '@vicons/ionicons5'

const message = useMessage()
const dialog = useDialog()
const productsStore = useProductsStore()

const search = ref('')
const filterKategori = ref(null)
const filterStok = ref(null)
const showForm = ref(false)
const showKategoriModal = ref(false)
const editingProduct = ref(null)
const saving = ref(false)
const newKategori = ref('')
const kategoriList = ref([])
const barcodePreviewSvg = ref(null)

const form = ref({
  kode_produk: generateProductCode(), nama: '', kategori_id: null, foto_path: '', harga_beli: 0, harga_jual: 0,
  deskripsi: '', barcode: '', stok: 0, stok_minimum: 5,
  satuan: 'pcs', aktif: 1, unlimited: false
})

const satuanOptions = [
  { label: 'pcs', value: 'pcs' },
  { label: 'kg', value: 'kg' },
  { label: 'liter', value: 'liter' },
  { label: 'lusin', value: 'lusin' },
  { label: 'pack', value: 'pack' },
  { label: 'box', value: 'box' }
]

const stokOptions = [
  { label: 'Semua', value: null },
  { label: 'Stok Menipis', value: 'menipis' },
  { label: 'Unlimited', value: 'unlimited' },
  { label: 'Habis', value: 'habis' }
]

const kategoriOptions = computed(() => [
  { label: 'Semua Kategori', value: null },
  ...kategoriList.value.map(k => ({ label: k.nama, value: k.id }))
])

const kategoriSelectOptions = computed(() =>
  kategoriList.value.map(k => ({ label: k.nama, value: k.id }))
)

const filteredProducts = computed(() => {
  let list = productsStore.products

  if (search.value) {
    const q = search.value.toLowerCase()
    list = list.filter(p =>
      p.nama.toLowerCase().includes(q) ||
      (p.barcode && p.barcode.toLowerCase().includes(q)) ||
      (p.kode_produk && p.kode_produk.toLowerCase().includes(q))
    )
  }
  if (filterKategori.value) {
    list = list.filter(p => p.kategori_id === filterKategori.value)
  }
  if (filterStok.value === 'menipis') {
    list = list.filter(p => p.stok !== -1 && p.stok <= p.stok_minimum)
  } else if (filterStok.value === 'unlimited') {
    list = list.filter(p => p.stok === -1)
  } else if (filterStok.value === 'habis') {
    list = list.filter(p => p.stok === 0)
  }

  return list
})

const columns = [
  {
    title: 'Foto',
    key: 'foto_path',
    width: 60,
    render(row) {
      if (row.foto_path) {
        return h('img', {
          src: 'media://' + row.foto_path,
          style: 'width:40px;height:40px;object-fit:cover;border-radius:4px'
        })
      }
      return h('div', { style: 'width:40px;height:40px;background:#f5f5f5;border-radius:4px;display:flex;align-items:center;justify-content:center;color:#ccc' }, '📷')
    }
  },
  { title: 'Nama', key: 'nama', sorter: 'default' },
  { title: 'Kode', key: 'kode_produk', width: 120 },
  { title: 'Kategori', key: 'kategori_nama', width: 120 },
  {
    title: 'Harga Beli',
    key: 'harga_beli',
    width: 130,
    sorter: (a, b) => (a.harga_beli || 0) - (b.harga_beli || 0),
    render(row) { return formatCurrency(row.harga_beli || 0) }
  },
  {
    title: 'Harga Jual',
    key: 'harga_jual',
    width: 130,
    sorter: (a, b) => (a.harga_jual || a.harga || 0) - (b.harga_jual || b.harga || 0),
    render(row) { return h('strong', { style: 'color:#18a058' }, formatCurrency(row.harga_jual || row.harga || 0)) }
  },
  { title: 'Barcode', key: 'barcode', width: 130 },
  {
    title: 'Stok',
    key: 'stok',
    width: 100,
    sorter: (a, b) => a.stok - b.stok,
    render(row) {
      if (row.stok === -1) return h(NTag, { size: 'small', type: 'info' }, () => '∞ Unlimited')
      if (row.stok === 0) return h(NTag, { size: 'small', type: 'error' }, () => '❌ Habis')
      if (row.stok <= row.stok_minimum) return h(NTag, { size: 'small', type: 'warning' }, () => `⚠️ ${row.stok} ${row.satuan}`)
      return h(NTag, { size: 'small' }, () => `${row.stok} ${row.satuan}`)
    }
  },
  {
    title: 'Status',
    key: 'aktif',
    width: 80,
    render(row) {
      return h(NTag, { size: 'small', type: row.aktif ? 'success' : 'default' }, () => row.aktif ? 'Aktif' : 'Nonaktif')
    }
  },
  {
    title: 'Aksi',
    key: 'actions',
    width: 120,
    render(row) {
      return h(NSpace, { size: 'small' }, () => [
        h(NButton, { text: true, size: 'small', onClick: () => openForm(row) }, () => '✏️'),
        h(NButton, { text: true, size: 'small', type: 'error', onClick: () => deleteProduk(row) }, () => '🗑️')
      ])
    }
  }
]

async function openForm(product) {
  if (product) {
    editingProduct.value = product
    form.value = {
      ...product,
      kode_produk: product.kode_produk || generateProductCode(),
      harga_beli: product.harga_beli || 0,
      harga_jual: product.harga_jual || product.harga || 0,
      unlimited: product.stok === -1,
      aktif: product.aktif
    }
  } else {
    editingProduct.value = null
    const defaultKat = kategoriList.value.find(k => k.is_default)
    form.value = {
      kode_produk: generateProductCode(), nama: '', kategori_id: defaultKat?.id ?? null, foto_path: '', harga_beli: 0, harga_jual: 0,
      deskripsi: '', barcode: generateBarcodeNumber(), stok: 0, stok_minimum: 5,
      satuan: 'pcs', aktif: 1, unlimited: false
    }
  }
  showForm.value = true
  // Render ulang barcode preview setelah DOM siap (penting saat edit)
  await nextTick()
  await nextTick()
  if (form.value.barcode) renderBarcodePreview(form.value.barcode)
}

async function pickFoto() {
  const filePath = await window.api.dialog.openFile({
    filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp'] }]
  })
  if (filePath) {
    const compressed = await window.api.image.compressProduct(filePath)
    form.value.foto_path = compressed
  }
}

function generateBarcode() {
  form.value.barcode = generateBarcodeNumber()
}

function generateKodeProduk() {
  form.value.kode_produk = generateProductCode()
}

async function renderBarcodePreview(val) {
  await nextTick()
  if (!val || !barcodePreviewSvg.value) return
  try {
    JsBarcode(barcodePreviewSvg.value, val, {
      format: 'CODE128',
      width: 1.5,
      height: 40,
      displayValue: true,
      fontSize: 12,
      margin: 4
    })
  } catch (e) {
    if (barcodePreviewSvg.value) barcodePreviewSvg.value.innerHTML = ''
  }
}

// Watch barcode input → render preview SVG
watch(() => form.value.barcode, renderBarcodePreview)

async function saveProduct() {
  if (!form.value.nama || !form.value.kategori_id || !form.value.kode_produk || !form.value.barcode || form.value.harga_jual <= 0) {
    message.warning('Lengkapi kode produk, barcode, nama, kategori, dan harga jual')
    return
  }

  if (form.value.harga_beli > form.value.harga_jual) {
    message.warning('Harga beli lebih besar dari harga jual. Periksa lagi.')
    return
  }

  // Validasi duplikat kode produk
  const existingKode = productsStore.products.find(p =>
    p.kode_produk === form.value.kode_produk &&
    (!editingProduct.value || p.id !== editingProduct.value.id)
  )
  if (existingKode) {
    message.error(`Kode produk "${form.value.kode_produk}" sudah digunakan oleh "${existingKode.nama}"`)
    return
  }

  // Validasi duplikat barcode
  if (form.value.barcode) {
    const existingBarcode = productsStore.products.find(p =>
      p.barcode === form.value.barcode &&
      (!editingProduct.value || p.id !== editingProduct.value.id)
    )
    if (existingBarcode) {
      message.error(`Barcode "${form.value.barcode}" sudah digunakan oleh "${existingBarcode.nama}"`)
      return
    }
  }

  saving.value = true
  try {
    const data = {
      ...form.value,
      harga: form.value.harga_jual,
      barcode: form.value.barcode || null,
      stok: form.value.unlimited ? -1 : form.value.stok
    }

    if (editingProduct.value) {
      await window.api.produk.update(editingProduct.value.id, data)
      message.success('Produk berhasil diupdate')
    } else {
      await window.api.produk.create(data)
      message.success('Produk berhasil ditambahkan')
    }

    showForm.value = false
    await productsStore.loadProducts()
    await productsStore.loadStokMenipisCount()
  } catch (e) {
    message.error('Gagal menyimpan: ' + e.message)
  }
  saving.value = false
}

function deleteProduk(row) {
  dialog.warning({
    title: 'Hapus Produk',
    content: `Yakin hapus "${row.nama}"? Data produk akan dihapus permanen.`,
    positiveText: 'Hapus',
    negativeText: 'Batal',
    onPositiveClick: async () => {
      await window.api.produk.delete(row.id)
      message.success('Produk dihapus')
      await productsStore.loadProducts()
    }
  })
}

// Kategori
async function loadKategori() {
  kategoriList.value = await window.api.kategori.getAll()
}

async function addKategori() {
  if (!newKategori.value.trim()) return
  await window.api.kategori.create({ nama: newKategori.value.trim() })
  newKategori.value = ''
  await loadKategori()
  message.success('Kategori ditambahkan')
}

function editKategori(kat) {
  dialog.create({
    title: 'Edit Kategori',
    content: () => h('input', {
      value: kat.nama,
      style: 'width:100%;padding:8px;border:1px solid #ddd;border-radius:4px',
      onInput: (e) => { kat._newName = e.target.value }
    }),
    positiveText: 'Simpan',
    onPositiveClick: async () => {
      if (kat._newName) {
        await window.api.kategori.update(kat.id, { nama: kat._newName })
        await loadKategori()
        message.success('Kategori diupdate')
      }
    }
  })
}

async function deleteKategori(id) {
  const result = await window.api.kategori.delete(id)
  if (result?.error) {
    message.error(result.error)
    return
  }
  await loadKategori()
  message.success('Kategori dihapus')
}

async function setDefaultKategori(kat) {
  // Toggle: klik ⭐ pada yang sudah default → hapus default
  const newId = kat.is_default ? null : kat.id
  await window.api.kategori.setDefault(newId)
  await loadKategori()
  message.success(newId ? `"${kat.nama}" dijadikan kategori default` : 'Kategori default dihapus')
}

onMounted(async () => {
  await productsStore.loadProducts()
  await loadKategori()
})
</script>

<style scoped>
.produk-container {
  padding: 16px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.produk-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.produk-filters {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}

.foto-preview {
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

.foto-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.foto-preview:hover {
  border-color: #18a058;
}

.label-item-row {
  display: flex;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
  gap: 12px;
}

.label-item-row:last-child {
  border-bottom: none;
}

.form-hint {
  font-size: 12px;
  color: #8c8c8c;
}
</style>
