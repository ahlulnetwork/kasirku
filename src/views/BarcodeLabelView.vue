<template>
  <div class="label-container">
    <!-- Header -->
    <div class="label-header">
      <h2>🏷️ Label Barcode</h2>
      <n-space align="center">
        <span style="color:#666;font-size:13px">Printer Label:</span>
        <n-select
          v-model:value="labelPrinter"
          :options="printerOptions"
          placeholder="Pilih printer label..."
          style="width:240px"
          size="small"
          filterable
        />
        <n-button size="small" @click="loadPrinters" :loading="loadingPrinters">🔄</n-button>
        <n-button size="small" type="success" @click="savePrinterSetting" :loading="savingPrinter">💾 Simpan</n-button>
        <n-divider vertical style="height:22px" />
        <n-tag size="small" type="info">33×15mm · 2-up</n-tag>
        <n-button
          type="primary"
          :disabled="checkedRowKeys.length === 0"
          @click="printLabels"
          :loading="printing"
        >
          🖨️ Cetak {{ totalLabels }} Label
        </n-button>
      </n-space>
    </div>

    <!-- Controls -->
    <div class="label-controls">
      <n-input
        v-model:value="search"
        placeholder="Cari nama / barcode..."
        clearable
        size="small"
        style="width:240px"
      >
        <template #prefix><n-icon><search-outline /></n-icon></template>
      </n-input>
      <n-select
        v-model:value="filterKategori"
        :options="kategoriOptions"
        placeholder="Semua Kategori"
        clearable
        size="small"
        style="width:180px"
      />
      <n-button size="small" text type="primary" @click="doSelectAll">Pilih Semua</n-button>
      <n-button size="small" text type="error" @click="doClearAll">Hapus Pilihan</n-button>
      <n-text depth="3" style="font-size:13px">
        {{ checkedRowKeys.length }} produk dipilih · {{ totalLabels }} label
      </n-text>
    </div>

    <!-- Product Table -->
    <n-data-table
      v-model:checked-row-keys="checkedRowKeys"
      :columns="columns"
      :data="filteredProducts"
      :pagination="{ pageSize: 25 }"
      :row-key="(row) => row.id"
      striped
      style="margin: 0 16px"
    />

    <!-- Preview -->
    <div v-if="previewItems.length > 0" class="preview-wrap">
      <div class="preview-title">Preview label ({{ Math.min(previewItems.length, 4) }} pertama):</div>
      <div class="preview-row">
        <div
          v-for="(item, i) in previewItems.slice(0, 4)"
          :key="i"
          class="preview-label"
        >
          <div class="prev-name">{{ truncateName(item.nama, 19) }}</div>
          <div class="prev-barcode">
            <img
              v-if="item.barcode"
              :src="barcodeToDataUrl(item.barcode)"
              style="max-width:100%;height:28px;display:block"
              alt="barcode"
            />
            <span v-else style="color:#bbb;font-size:9px">Tidak ada barcode</span>
          </div>
          <div class="prev-bottom">
            <span class="prev-barcode-num">{{ item.barcode || '' }}</span>
            <span class="prev-price">{{ formatCurrency(item.harga_jual || item.harga || 0) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, h, onMounted } from 'vue'
import { useMessage, NInputNumber } from 'naive-ui'
import { useProductsStore } from '../stores/products'
import { formatCurrency } from '../utils/formatCurrency'
import { SearchOutline } from '@vicons/ionicons5'
import JsBarcode from 'jsbarcode'

const message = useMessage()
const productsStore = useProductsStore()

// --- State ---
const search = ref('')
const filterKategori = ref(null)
const labelPrinter = ref(null)
const printerOptions = ref([])
const loadingPrinters = ref(false)
const savingPrinter = ref(false)
const printing = ref(false)
const checkedRowKeys = ref([])

// qty per product id
const qtyMap = ref({})

// --- Computed ---
const kategoriOptions = computed(() => {
  const seen = new Set()
  const opts = []
  for (const p of productsStore.products) {
    if (p.kategori_id && p.kategori_nama && !seen.has(p.kategori_id)) {
      seen.add(p.kategori_id)
      opts.push({ label: p.kategori_nama, value: p.kategori_id })
    }
  }
  return opts.sort((a, b) => a.label.localeCompare(b.label))
})

const filteredProducts = computed(() => {
  let list = productsStore.products.filter(p => p.aktif === 1)
  if (filterKategori.value) {
    list = list.filter(p => p.kategori_id === filterKategori.value)
  }
  if (search.value) {
    const q = search.value.toLowerCase()
    list = list.filter(p =>
      p.nama.toLowerCase().includes(q) ||
      (p.barcode && p.barcode.toLowerCase().includes(q)) ||
      (p.kode_produk && p.kode_produk.toLowerCase().includes(q))
    )
  }
  return list
})

const totalLabels = computed(() =>
  checkedRowKeys.value.reduce((s, id) => s + (qtyMap.value[id] || 1), 0)
)

const previewItems = computed(() =>
  checkedRowKeys.value
    .map(id => productsStore.products.find(p => p.id === id))
    .filter(Boolean)
)

// --- Table columns ---
const columns = [
  { type: 'selection' },
  {
    title: 'Nama Produk',
    key: 'nama',
    minWidth: 140,
    ellipsis: { tooltip: true }
  },
  {
    title: 'Kode Produk',
    key: 'kode_produk',
    width: 110,
    render(row) {
      return row.kode_produk
        ? h('span', { style: 'font-family:monospace;font-size:12px' }, row.kode_produk)
        : h('span', { style: 'color:#aaa;font-size:12px' }, '-')
    }
  },
  {
    title: 'Kategori',
    key: 'kategori_nama',
    width: 110,
    render(row) {
      return row.kategori_nama
        ? h('span', {}, row.kategori_nama)
        : h('span', { style: 'color:#aaa;font-size:12px' }, '-')
    }
  },
  {
    title: 'Deskripsi',
    key: 'deskripsi',
    minWidth: 120,
    ellipsis: { tooltip: true },
    render(row) {
      return row.deskripsi
        ? h('span', { style: 'font-size:12px;color:#666' }, row.deskripsi)
        : h('span', { style: 'color:#aaa;font-size:12px' }, '-')
    }
  },
  {
    title: 'Barcode',
    key: 'barcode',
    width: 140,
    render(row) {
      return row.barcode
        ? h('span', { style: 'font-family:monospace;font-size:12px' }, row.barcode)
        : h('span', { style: 'color:#aaa;font-size:12px' }, '-')
    }
  },
  {
    title: 'Harga Jual',
    key: 'harga_jual',
    width: 120,
    render(row) {
      return h('strong', { style: 'color:#18a058' }, formatCurrency(row.harga_jual || row.harga || 0))
    }
  },
  {
    title: 'Jml Label',
    key: 'qty',
    width: 120,
    render(row) {
      return h(NInputNumber, {
        value: qtyMap.value[row.id] || 1,
        min: 1,
        max: 999,
        size: 'small',
        style: 'width:80px',
        showButton: true,
        'onUpdate:value': (v) => {
          qtyMap.value[row.id] = v || 1
        }
      })
    }
  }
]

// --- Helpers ---
function truncateName(name, maxLen) {
  const s = String(name || '')
  return s.length > maxLen ? s.substring(0, maxLen) + '…' : s
}

function barcodeToSVGString(barcode) {
  if (!barcode) return ''
  try {
    const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    JsBarcode(svgEl, String(barcode), {
      format: 'CODE128',
      width: 1.0,
      height: 22,
      displayValue: false,
      margin: 0
    })
    return svgEl.outerHTML
  } catch {
    return ''
  }
}

function barcodeToDataUrl(barcode) {
  const svg = barcodeToSVGString(barcode)
  if (!svg) return ''
  return 'data:image/svg+xml,' + encodeURIComponent(svg)
}

// --- Select / Clear ---
function doSelectAll() {
  checkedRowKeys.value = filteredProducts.value.map(p => p.id)
}

function doClearAll() {
  checkedRowKeys.value = []
}

// --- Printer ---
async function loadPrinters() {
  loadingPrinters.value = true
  try {
    const list = await window.api.system.getPrinters()
    printerOptions.value = list.map(p => ({
      label: p.displayName || p.name,
      value: p.name
    }))
  } catch (e) {
    message.error('Gagal memuat daftar printer')
  }
  loadingPrinters.value = false
}

async function savePrinterSetting() {
  if (!labelPrinter.value) {
    message.warning('Pilih printer label terlebih dahulu')
    return
  }
  savingPrinter.value = true
  try {
    await window.api.settings.set('label_printer_name', labelPrinter.value)
    message.success('Printer label disimpan')
  } catch {
    message.error('Gagal menyimpan printer label')
  }
  savingPrinter.value = false
}

// --- Label HTML generator ---
function generateLabelHTML(expanded) {
  // Cache barcode SVG per value
  const barcodeCache = {}
  function getBarcodesvg(barcode) {
    if (!barcode) return ''
    if (barcodeCache[barcode]) return barcodeCache[barcode]
    barcodeCache[barcode] = barcodeToSVGString(barcode)
    return barcodeCache[barcode]
  }

  function esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
  }

  function labelDiv(item) {
    if (!item) return '<div class="label"></div>'
    const name = esc(String(item.nama || '').substring(0, 22))
    const price = 'Rp ' + new Intl.NumberFormat('id-ID').format(item.harga_jual || item.harga || 0)
    const barcodeSVG = getBarcodesvg(item.barcode)
    const barcodeNum = esc(String(item.barcode || ''))
    return `<div class="label">
      <div class="lname">${name}</div>
      <div class="lbarcode">${barcodeSVG}</div>
      <div class="lbottom">
        <span class="lbnum">${barcodeNum}</span>
        <span class="lprice">${esc(price)}</span>
      </div>
    </div>`
  }

  // Pair labels 2-up
  const rows = []
  for (let i = 0; i < expanded.length; i += 2) {
    rows.push([expanded[i], expanded[i + 1] || null])
  }

  const rowsHTML = rows
    .map(([a, b]) => `<div class="row">${labelDiv(a)}${labelDiv(b)}</div>`)
    .join('\n')

  return `<!DOCTYPE html>
<html><head>
<meta charset="UTF-8">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
@page { size: 66mm 15mm; margin: 0; }
html, body { width: 66mm; background: #fff; }
.row {
  width: 66mm;
  height: 15mm;
  display: flex;
  page-break-after: always;
  break-after: page;
}
.row:last-child { page-break-after: avoid; break-after: avoid; }
.label {
  width: 33mm;
  height: 15mm;
  padding: 0.5mm 1mm;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-right: 0.3mm dashed #999;
}
.label:last-child { border-right: none; }
.lname {
  font-family: Arial, Helvetica, sans-serif;
  font-size: 5.5pt;
  font-weight: 700;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-shrink: 0;
}
.lbarcode {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  min-height: 0;
}
.lbarcode svg {
  width: 100%;
  height: 100%;
  max-height: 100%;
}
.lbottom {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  flex-shrink: 0;
  line-height: 1.2;
}
.lbnum {
  font-family: monospace;
  font-size: 4.5pt;
  color: #444;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 60%;
}
.lprice {
  font-family: Arial, Helvetica, sans-serif;
  font-size: 5.5pt;
  font-weight: 700;
  text-align: right;
  line-height: 1.2;
  flex-shrink: 0;
}
</style>
</head>
<body>${rowsHTML}
</body></html>`
}

// --- Print ---
async function printLabels() {
  if (!labelPrinter.value) {
    message.warning('Pilih printer label terlebih dahulu')
    return
  }
  if (checkedRowKeys.value.length === 0) {
    message.warning('Pilih produk terlebih dahulu')
    return
  }

  printing.value = true
  try {
    // Expand by qty
    const expanded = []
    for (const id of checkedRowKeys.value) {
      const prod = productsStore.products.find(p => p.id === id)
      if (!prod) continue
      const qty = qtyMap.value[id] || 1
      for (let i = 0; i < qty; i++) {
        expanded.push(prod)
      }
    }

    if (expanded.length === 0) {
      message.warning('Tidak ada produk untuk dicetak')
      printing.value = false
      return
    }

    const html = generateLabelHTML(expanded)
    await window.api.print.label(html, labelPrinter.value)
    message.success(`${expanded.length} label berhasil dikirim ke printer`)
  } catch (e) {
    message.error('Gagal cetak label: ' + (e.message || e))
  }
  printing.value = false
}

// --- Mount ---
onMounted(async () => {
  await productsStore.loadProducts()
  await loadPrinters()
  // Load saved label printer
  const saved = await window.api.settings.get('label_printer_name')
  if (saved) labelPrinter.value = saved
})
</script>

<style scoped>
.label-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #f5f5f5;
}

.label-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #fff;
  border-bottom: 1px solid #eee;
}

.label-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
}

.label-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  background: #fff;
  border-bottom: 1px solid #eee;
  margin-bottom: 8px;
}

.preview-wrap {
  padding: 12px 16px;
  background: #fff;
  border-top: 1px solid #eee;
  margin-top: 12px;
}

.preview-title {
  font-weight: 600;
  font-size: 13px;
  color: #666;
  margin-bottom: 10px;
}

.preview-row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.preview-label {
  width: 165px;
  height: 75px;
  border: 1px solid #ddd;
  border-radius: 3px;
  padding: 4px 6px;
  display: flex;
  flex-direction: column;
  background: #fff;
  box-shadow: 0 1px 4px rgba(0,0,0,0.08);
  overflow: hidden;
}

.prev-name {
  font-size: 10px;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-shrink: 0;
  line-height: 1.3;
}

.prev-barcode {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  min-height: 0;
}

.prev-bottom {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  flex-shrink: 0;
  line-height: 1.3;
}

.prev-barcode-num {
  font-family: monospace;
  font-size: 8px;
  color: #888;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 55%;
}

.prev-price {
  font-size: 10px;
  font-weight: 700;
  text-align: right;
  color: #18a058;
  flex-shrink: 0;
  line-height: 1.3;
}
</style>
