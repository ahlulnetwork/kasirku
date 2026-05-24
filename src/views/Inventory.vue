<template>
  <div class="inventory-container">
    <div class="inventory-header">
      <h2>Inventory Barang</h2>
      <n-space>
        <n-button type="success" @click="exportExcel" :loading="exportingExcel">
          📊 Download Excel
        </n-button>
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
          v-model:value="filterStatus"
          :options="statusOptions"
          placeholder="Status Stok"
          style="width: 180px"
        />
      </n-space>
    </div>

    <div class="summary-cards">
      <n-card class="summary-card">
        <n-statistic label="SKU Ready">
          <template #default>{{ summary.readySku }}</template>
        </n-statistic>
      </n-card>
      <n-card class="summary-card">
        <n-statistic label="Unit Ready (Terhitung)">
          <template #default>{{ summary.readyUnits }}</template>
        </n-statistic>
      </n-card>
      <n-card class="summary-card">
        <n-statistic label="Item Unlimited">
          <template #default>{{ summary.unlimitedSku }}</template>
        </n-statistic>
      </n-card>
      <n-card class="summary-card">
        <n-statistic label="Nilai Modal">
          <template #default>
            <span class="summary-value orange">{{ formatCurrency(summary.modalValue) }}</span>
          </template>
        </n-statistic>
      </n-card>
      <n-card class="summary-card">
        <n-statistic label="Potensi Jual Umum">
          <template #default>
            <span class="summary-value green">{{ formatCurrency(summary.retailValue) }}</span>
          </template>
        </n-statistic>
      </n-card>
    </div>

    <n-data-table
      :columns="columns"
      :data="filteredProducts"
      :pagination="{ pageSize: 15 }"
      :row-key="row => row.id"
      striped
      :scroll-x="scrollX"
      style="margin-top: 16px"
    />
  </div>
</template>

<script setup>
import { ref, computed, h, onMounted } from 'vue'
import { useMessage } from 'naive-ui'
import { NTag } from 'naive-ui'
import { SearchOutline } from '@vicons/ionicons5'
import { useProductsStore } from '../stores/products'
import { formatCurrency } from '../utils/formatCurrency'

const message = useMessage()
const productsStore = useProductsStore()

const search = ref('')
const filterKategori = ref(null)
const filterStatus = ref('ready')
const exportingExcel = ref(false)
const kategoriList = ref([])
const tipeCustomerList = ref([])
const customerPriceMap = ref({})

const statusOptions = [
  { label: 'Ready di Toko', value: 'ready' },
  { label: 'Semua Stok', value: 'all' },
  { label: 'Stok Menipis', value: 'menipis' },
  { label: 'Habis', value: 'habis' },
  { label: 'Unlimited', value: 'unlimited' }
]

const kategoriOptions = computed(() => [
  { label: 'Semua Kategori', value: null },
  ...kategoriList.value.map(k => ({ label: k.nama, value: k.id }))
])

function getCustomerPrice(produkId, tipeId, hargaJualDefault) {
  const harga = customerPriceMap.value[produkId]?.[tipeId]
  return harga != null && Number(harga) > 0 ? Number(harga) : Number(hargaJualDefault || 0)
}

const filteredProducts = computed(() => {
  let list = (productsStore.products || []).filter(p => p.aktif === 1)

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

  if (filterStatus.value === 'ready') {
    list = list.filter(p => p.stok === -1 || p.stok > 0)
  } else if (filterStatus.value === 'menipis') {
    list = list.filter(p => p.stok !== -1 && p.stok > 0 && p.stok <= p.stok_minimum)
  } else if (filterStatus.value === 'habis') {
    list = list.filter(p => p.stok === 0)
  } else if (filterStatus.value === 'unlimited') {
    list = list.filter(p => p.stok === -1)
  }

  return list
})

const summary = computed(() => {
  return filteredProducts.value.reduce((acc, product) => {
    const stok = Number(product.stok || 0)
    const isUnlimited = stok === -1
    const isReady = isUnlimited || stok > 0

    if (isReady) acc.readySku += 1
    if (isUnlimited) acc.unlimitedSku += 1
    if (stok > 0) {
      acc.readyUnits += stok
      acc.modalValue += stok * Number(product.harga_beli || 0)
      acc.retailValue += stok * Number(product.harga_jual || product.harga || 0)
    }

    return acc
  }, {
    readySku: 0,
    readyUnits: 0,
    unlimitedSku: 0,
    modalValue: 0,
    retailValue: 0
  })
})

const columns = computed(() => {
  const baseColumns = [
    {
      title: 'No',
      key: 'no',
      width: 55,
      render(_, index) {
        return index + 1
      }
    },
    { title: 'Nama', key: 'nama', width: 220 },
    { title: 'Kode', key: 'kode_produk', width: 120 },
    { title: 'Kategori', key: 'kategori_nama', width: 120 },
    {
      title: 'Stok',
      key: 'stok',
      width: 110,
      render(row) {
        if (row.stok === -1) return h(NTag, { size: 'small', type: 'info' }, () => '∞ Unlimited')
        if (row.stok === 0) return h(NTag, { size: 'small', type: 'error' }, () => 'Habis')
        if (row.stok <= row.stok_minimum) return h(NTag, { size: 'small', type: 'warning' }, () => `${row.stok} ${row.satuan || 'pcs'}`)
        return h(NTag, { size: 'small', type: 'success' }, () => `${row.stok} ${row.satuan || 'pcs'}`)
      }
    },
    {
      title: 'Harga Beli',
      key: 'harga_beli',
      width: 120,
      render(row) {
        return formatCurrency(row.harga_beli || 0)
      }
    },
    {
      title: 'Nilai Modal',
      key: 'nilai_modal',
      width: 130,
      render(row) {
        if (row.stok === -1) return '-'
        return formatCurrency(Number(row.stok || 0) * Number(row.harga_beli || 0))
      }
    },
    {
      title: 'Harga Jual Umum',
      key: 'harga_jual',
      width: 135,
      render(row) {
        return h('strong', { style: 'color:#18a058' }, formatCurrency(row.harga_jual || row.harga || 0))
      }
    },
    {
      title: 'Potensi Jual',
      key: 'potensi_jual',
      width: 130,
      render(row) {
        if (row.stok === -1) return '-'
        return formatCurrency(Number(row.stok || 0) * Number(row.harga_jual || row.harga || 0))
      }
    }
  ]

  const customerColumns = tipeCustomerList.value.map(tipe => ({
    title: `Harga ${tipe.nama}`,
    key: `tipe_${tipe.id}`,
    width: 135,
    render(row) {
      const harga = getCustomerPrice(row.id, tipe.id, row.harga_jual || row.harga || 0)
      const isCustom = customerPriceMap.value[row.id]?.[tipe.id] != null && Number(customerPriceMap.value[row.id]?.[tipe.id]) > 0
      if (isCustom) {
        return h('strong', { style: 'color:#2080f0' }, formatCurrency(harga))
      }
      return h('span', { style: 'color:#999' }, formatCurrency(harga))
    }
  }))

  return [...baseColumns, ...customerColumns, { title: 'Barcode', key: 'barcode', width: 140 }]
})

const scrollX = computed(() => 1160 + (tipeCustomerList.value.length * 135))

async function exportExcel() {
  exportingExcel.value = true
  try {
    const rows = filteredProducts.value
    if (rows.length === 0) {
      message.warning('Tidak ada data inventory untuk diexport')
      return
    }

    const { utils, writeFile } = await import('xlsx')

    const customerHeaders = tipeCustomerList.value.map(tipe => `Harga ${tipe.nama}`)
    const tableHeaders = [
      'No',
      'Nama',
      'Kode',
      'Kategori',
      'Stok',
      'Satuan',
      'Harga Beli',
      'Nilai Modal',
      'Harga Jual Umum',
      'Potensi Jual Umum',
      ...customerHeaders,
      'Barcode'
    ]

    const tableRows = rows.map((row, index) => {
      const stok = Number(row.stok || 0)
      const hargaBeli = Number(row.harga_beli || 0)
      const hargaJual = Number(row.harga_jual || row.harga || 0)
      const customerValues = tipeCustomerList.value.map(tipe => getCustomerPrice(row.id, tipe.id, hargaJual))

      return [
        index + 1,
        row.nama,
        row.kode_produk || '',
        row.kategori_nama || '',
        stok === -1 ? 'Unlimited' : stok,
        row.satuan || 'pcs',
        hargaBeli,
        stok === -1 ? '' : stok * hargaBeli,
        hargaJual,
        stok === -1 ? '' : stok * hargaJual,
        ...customerValues,
        row.barcode || ''
      ]
    })

    const summaryRows = [
      ['RINGKASAN INVENTORY'],
      [],
      ['Filter Kategori', kategoriOptions.value.find(k => k.value === filterKategori.value)?.label || 'Semua Kategori'],
      ['Filter Status', statusOptions.find(s => s.value === filterStatus.value)?.label || 'Semua Stok'],
      ['Pencarian', search.value || '-'],
      [],
      ['SKU Ready', summary.value.readySku],
      ['Unit Ready (Terhitung)', summary.value.readyUnits],
      ['Item Unlimited', summary.value.unlimitedSku],
      ['Nilai Modal', summary.value.modalValue],
      ['Potensi Jual Umum', summary.value.retailValue]
    ]

    const workbook = utils.book_new()
    const wsSummary = utils.aoa_to_sheet(summaryRows)
    wsSummary['!cols'] = [{ wch: 24 }, { wch: 24 }]
    utils.book_append_sheet(workbook, wsSummary, 'Ringkasan')

    const wsTable = utils.aoa_to_sheet([tableHeaders, ...tableRows])
    wsTable['!cols'] = [
      { wch: 6 },
      { wch: 24 },
      { wch: 14 },
      { wch: 14 },
      { wch: 12 },
      { wch: 10 },
      { wch: 14 },
      { wch: 16 },
      { wch: 16 },
      { wch: 18 },
      ...tipeCustomerList.value.map(() => ({ wch: 16 })),
      { wch: 18 }
    ]
    utils.book_append_sheet(workbook, wsTable, 'Inventory')

    const filename = `inventory_barang_${new Date().toISOString().slice(0, 10)}.xlsx`
    writeFile(workbook, filename)
    message.success('Excel inventory berhasil didownload')
  } catch (e) {
    message.error('Gagal export Excel: ' + (e.message || e))
  } finally {
    exportingExcel.value = false
  }
}

async function loadData() {
  await productsStore.loadProducts()
  kategoriList.value = await window.api.kategori.getAll()
  tipeCustomerList.value = await window.api.tipeCustomer.getAll()

  const allPrices = await window.api.hargaCustomer.getAll()
  const priceMap = {}
  for (const row of allPrices) {
    if (!priceMap[row.produk_id]) priceMap[row.produk_id] = {}
    priceMap[row.produk_id][row.tipe_customer_id] = row.harga
  }
  customerPriceMap.value = priceMap
}

onMounted(async () => {
  await loadData()
})
</script>

<style scoped>
.inventory-container {
  padding: 16px;
  height: 100%;
  overflow: auto;
  font-size: 16px;
}

.inventory-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.summary-cards {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
}

.summary-card {
  min-height: 96px;
}

.summary-value.green {
  color: #18a058;
  font-weight: 700;
}

.summary-value.orange {
  color: #d97706;
  font-weight: 700;
}

@media (max-width: 1200px) {
  .inventory-header {
    flex-direction: column;
    align-items: stretch;
  }

  .summary-cards {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>