<template>
  <div class="laporan-container">
    <div class="laporan-header">
      <h2>Laporan Transaksi</h2>
      <n-space>
        <n-select
          v-model:value="pdfMetodeFilter"
          :options="pdfMetodeOptions"
          style="width: 220px"
        />
        <n-button type="primary" size="large" @click="exportPdf" :loading="exporting">
          📄 Download PDF
        </n-button>
      </n-space>
    </div>

    <!-- Filter Periode -->
    <div class="laporan-filters">
      <n-space>
        <n-button :type="periodeAktif === 'hari' ? 'primary' : 'default'" @click="setPeriode('hari')">Hari Ini</n-button>
        <n-button :type="periodeAktif === 'kemarin' ? 'primary' : 'default'" @click="setPeriode('kemarin')">Kemarin</n-button>
        <n-button :type="periodeAktif === 'minggu' ? 'primary' : 'default'" @click="setPeriode('minggu')">Minggu Ini</n-button>
        <n-button :type="periodeAktif === 'bulan' ? 'primary' : 'default'" @click="setPeriode('bulan')">Bulan Ini</n-button>
        <n-button :type="periodeAktif === 'custom' ? 'primary' : 'default'" @click="periodeAktif = 'custom'">Custom</n-button>
      </n-space>
      <n-select
        v-model:value="selectedKasir"
        :options="kasirOptions"
        :clearable="!kasirMode"
        :filterable="!kasirMode"
        :disabled="kasirMode"
        :placeholder="kasirMode ? 'Kasir Saya' : 'Semua Kasir'"
        style="width: 220px"
        @update:value="loadData"
      />
      <n-date-picker
        v-if="periodeAktif === 'custom'"
        v-model:value="dateRange"
        type="daterange"
        clearable
        @update:value="loadData"
        style="width: 300px"
      />
    </div>

    <!-- Summary Cards -->
    <div class="summary-cards">
      <n-card class="summary-card">
        <n-statistic label="Omzet">
          <template #default>
            <span class="summary-value green">{{ formatCurrency(filteredSummary.totalOmzet || 0) }}</span>
          </template>
        </n-statistic>
      </n-card>
      <n-card v-if="adminMode && filteredSummary.totalModal !== null" class="summary-card">
        <n-statistic label="Modal Terjual">
          <template #default>
            <span class="summary-value orange">{{ formatCurrency(filteredSummary.totalModal || 0) }}</span>
          </template>
        </n-statistic>
      </n-card>
      <n-card v-if="adminMode && filteredSummary.labaKotor !== null" class="summary-card">
        <n-statistic label="Laba Kotor">
          <template #default>
            <span class="summary-value green">{{ formatCurrency(filteredSummary.labaKotor || 0) }}</span>
          </template>
        </n-statistic>
      </n-card>
      <n-card class="summary-card">
        <n-statistic label="Total Transaksi" :value="filteredSummary.totalTransaksi || 0" />
      </n-card>
      <n-card class="summary-card">
        <n-statistic label="Total Pajak">
          <template #default>{{ formatCurrency(filteredSummary.totalPajak || 0) }}</template>
        </n-statistic>
      </n-card>
      <n-card class="summary-card">
        <n-statistic label="Total Diskon">
          <template #default>
            <span class="summary-value red">{{ formatCurrency(filteredSummary.totalDiskon || 0) }}</span>
          </template>
        </n-statistic>
      </n-card>
    </div>

    <!-- Per Metode Bayar -->
    <n-card size="small" v-if="filteredSummary.perMetode && filteredSummary.perMetode.length > 0" style="margin-bottom:16px">
      <div class="metode-row" v-for="m in filteredSummary.perMetode" :key="m.metode_bayar">
        <span class="metode-label">{{ m.metode_bayar === 'tunai' ? '💵 Tunai' : '💳 ' + m.metode_bayar.toUpperCase() }}</span>
        <span class="metode-count">{{ m.jumlah }} transaksi</span>
        <span class="metode-value">{{ formatCurrency(m.total) }}</span>
      </div>
    </n-card>

    <!-- Tabel Transaksi -->
    <n-data-table
      :columns="columns"
      :data="filteredTableList"
      :pagination="{ pageSize: 15 }"
      :row-key="row => row.id"
      striped
      style="margin-top: 16px"
      :scroll-x="1150"
      :row-props="(row) => ({ style: 'cursor: pointer', onClick: () => showDetail(row) })"
    />

    <!-- Detail Modal -->
    <n-modal v-model:show="showDetailModal" style="width: 550px">
      <n-card :title="'Detail Transaksi ' + (detailData?.no_transaksi || '')" :bordered="false">
        <template v-if="detailData">
          <!-- Badge BATAL -->
          <n-alert v-if="detailData.status === 'batal'" type="error" :show-icon="true" style="margin-bottom: 12px">
            <strong>TRANSAKSI DIBATALKAN</strong>
            <span v-if="detailData.alasan_batal"> — {{ detailData.alasan_batal }}</span>
          </n-alert>

          <n-descriptions bordered :column="2" size="small">
            <n-descriptions-item label="Tanggal">{{ formatDate(detailData.tanggal) }}</n-descriptions-item>
            <n-descriptions-item label="Kasir">{{ detailData.nama_kasir }}</n-descriptions-item>
            <n-descriptions-item label="Customer" v-if="detailData.nama_customer">{{ detailData.nama_customer }}</n-descriptions-item>
            <n-descriptions-item label="Metode">{{ detailData.metode_bayar === 'tunai' ? 'Tunai' : detailData.metode_bayar }}</n-descriptions-item>
            <n-descriptions-item label="Total">
              <strong :style="{ color: detailData.status === 'batal' ? '#d03050' : '#18a058' }">
                {{ detailData.status === 'batal' ? 'BATAL' : formatCurrency(detailData.total) }}
              </strong>
            </n-descriptions-item>
          </n-descriptions>

          <div style="max-height: 340px; overflow-y: auto; margin-top: 12px; border: 1px solid #e0e0e0; border-radius: 4px;">
            <n-table size="small" bordered style="margin: 0">
              <thead style="position: sticky; top: 0; z-index: 1; background: #fff;">
                <tr><th style="width:50px">No</th><th>Produk</th><th>Harga</th><th>Qty</th><th>Subtotal</th></tr>
              </thead>
              <tbody>
                <tr v-for="(item, index) in detailData.items" :key="item.id">
                  <td>{{ index + 1 }}</td>
                  <td>{{ item.nama_produk }}</td>
                  <td>{{ formatCurrency(item.harga_satuan) }}</td>
                  <td>{{ item.qty }}</td>
                  <td>{{ formatCurrency(item.subtotal) }}</td>
                </tr>
              </tbody>
            </n-table>
          </div>

          <n-space style="margin-top: 12px" justify="space-between" align="center">
            <n-space>
              <n-button v-if="detailData.status !== 'batal'" size="small" type="info" :loading="printing" @click="cetakStrukDetail(detailData)">🖨️ Cetak Ulang</n-button>
              <n-button v-if="detailData.status !== 'batal'" size="small" type="default" :loading="printing" @click="previewStruk(detailData)">👁️ Preview Struk</n-button>
              <n-button v-if="adminMode && detailData.status !== 'batal'" size="small" type="warning" @click="editTransaksi(detailData)">✏️ Edit</n-button>
              <n-button v-if="adminMode && detailData.status !== 'batal'" size="small" type="error" @click="openBatalModal(detailData)">🚫 Batalkan</n-button>
            </n-space>
            <n-button v-if="adminMode" size="small" type="error" @click="deleteTransaksi(detailData)">🗑️ Hapus</n-button>
          </n-space>
        </template>
      </n-card>
    </n-modal>

    <!-- Modal Konfirmasi Pembatalan -->
    <n-modal v-model:show="showBatalModal" :mask-closable="false" style="width: 420px">
      <n-card title="🚫 Batalkan Transaksi" :bordered="false" size="medium">
        <n-alert type="warning" :show-icon="true" style="margin-bottom: 16px">
          Transaksi yang dibatalkan tidak akan terhapus, tetapi <strong>tidak dihitung</strong> dalam total pendapatan. Stok produk akan dikembalikan.
        </n-alert>
        <n-form-item label="Alasan Pembatalan" required>
          <n-input
            v-model:value="batalAlasan"
            type="textarea"
            :rows="3"
            placeholder="Contoh: Pelanggan salah pilih produk, double order, dll."
          />
        </n-form-item>
        <n-space justify="end" style="margin-top: 8px">
          <n-button @click="showBatalModal = false">Batal</n-button>
          <n-button type="error" @click="konfirmasiBatal" :loading="batalLoading">Konfirmasi Batalkan</n-button>
        </n-space>
      </n-card>
    </n-modal>

    <!-- Preview Struk Modal -->
    <n-modal v-model:show="showPreviewModal" style="width: 360px">
      <n-card title="Preview Struk" :bordered="false" style="max-height: 85vh; overflow-y: auto">
        <iframe
          :srcdoc="previewHTML"
          class="struk-preview-frame"
          scrolling="no"
          @load="onPreviewLoad"
        />
        <template #footer>
          <n-space justify="end">
            <n-button @click="showPreviewModal = false">Tutup</n-button>
            <n-button type="info" :loading="printing" @click="cetakStrukDetail(detailData); showPreviewModal = false">🖨️ Cetak</n-button>
          </n-space>
        </template>
      </n-card>
    </n-modal>

    <!-- Edit Modal -->
    <n-modal v-model:show="showEditModal" :mask-closable="false" style="width: 620px">
      <n-card title="✏️ Edit Transaksi" :bordered="false" size="medium">
        <n-form label-placement="left" label-width="140">
          <n-form-item label="Nama Customer">
            <n-input v-model:value="editForm.nama_customer" placeholder="Nama customer (opsional)" />
          </n-form-item>
          <n-form-item label="Metode Bayar">
            <n-select v-model:value="editForm.metode_bayar" :options="metodeEditOptions" />
          </n-form-item>
          <n-form-item v-if="editForm.metode_bayar === 'tunai'" label="Bayar (Tunai)">
            <n-input-number v-model:value="editForm.bayar" :min="0" :precision="0" :format="v => v ? 'Rp ' + Number(v).toLocaleString('id-ID') : 'Rp 0'" style="width:100%" />
          </n-form-item>
          <n-form-item label="Diskon (%)">
            <n-input-number v-model:value="editForm.diskon_persen" :min="0" :max="100" :precision="2" style="width:100%" />
          </n-form-item>
          <n-form-item label="Diskon (Nominal)">
            <n-input-number v-model:value="editForm.diskon_nominal" :min="0" :precision="0" :format="v => v ? 'Rp ' + Number(v).toLocaleString('id-ID') : 'Rp 0'" style="width:100%" />
          </n-form-item>
          <n-form-item label="Catatan">
            <n-input v-model:value="editForm.catatan" type="textarea" :rows="2" />
          </n-form-item>
        </n-form>

        <!-- Edit Qty Item -->
        <div style="margin-top: 4px; margin-bottom: 8px; font-weight: 600; font-size: 14px; color: #555">Item Transaksi</div>
        <div style="max-height: 240px; overflow-y: auto; border: 1px solid #e0e0e0; border-radius: 4px;">
          <n-table size="small" :bordered="false">
            <thead style="position: sticky; top: 0; background: #fafafa; z-index: 1;">
              <tr><th>Produk</th><th style="width:80px">Harga</th><th style="width:110px">Qty</th><th style="width:40px"></th></tr>
            </thead>
            <tbody>
              <tr v-for="item in editForm.items" :key="item.id">
                <td>{{ item.nama_produk }}</td>
                <td>{{ formatCurrency(item.harga_satuan) }}</td>
                <td>
                  <n-input-number
                    v-model:value="item.qty"
                    :min="1"
                    :precision="0"
                    size="small"
                    style="width: 90px"
                  />
                </td>
                <td>
                  <n-button
                    text type="error" size="small"
                    @click="editForm.items = editForm.items.filter(i => i.id !== item.id); editForm.deletedItemIds.push(item.id)"
                  >🗑️</n-button>
                </td>
              </tr>
            </tbody>
          </n-table>
        </div>

        <n-space justify="end" style="margin-top: 16px">
          <n-button @click="showEditModal = false">Batal</n-button>
          <n-button type="primary" @click="saveEditTransaksi" :loading="savingEdit">Simpan</n-button>
        </n-space>
      </n-card>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, h, onMounted, computed, watch } from 'vue'
import { useMessage, useDialog, NTag } from 'naive-ui'
import { formatCurrency } from '../utils/formatCurrency'
import { generateReceiptHTML } from '../utils/receiptGenerator'
import { useAuthStore } from '../stores/auth'

const message = useMessage()
const mydialog = useDialog()
const authStore = useAuthStore()
const kasirMode = computed(() => authStore.currentUser?.role === 'kasir')
const adminMode = computed(() => authStore.currentUser?.role === 'admin')

const periodeAktif = ref('hari')
const dateRange = ref(null)
const selectedKasir = ref(null)
const kasirOptions = ref([])
const transaksiList = ref([])
const summary = ref({})
const exporting = ref(false)
const pdfMetodeFilter = ref('all')

const showDetailModal = ref(false)
const detailData = ref(null)
const showEditModal = ref(false)
const printing = ref(false)
const showPreviewModal = ref(false)
const previewHTML = ref('')

function onPreviewLoad(e) {
  try {
    const doc = e.target.contentDocument
    if (!doc) return
    const paper = doc.querySelector('.paper')
    if (paper) {
      e.target.style.height = (paper.scrollHeight + 28 + 12) + 'px'
    } else {
      e.target.style.height = doc.documentElement.scrollHeight + 'px'
    }
  } catch (_) {}
}
const editForm = ref({ metode_bayar: '', catatan: '', diskon_persen: 0, diskon_nominal: 0, nama_customer: '', bayar: 0, items: [], deletedItemIds: [] })
const editingId = ref(null)
const savingEdit = ref(false)
const showBatalModal = ref(false)
const batalAlasan = ref('')
const batalLoading = ref(false)
const batalTargetId = ref(null)

function openBatalModal(trx) {
  batalTargetId.value = trx.id
  batalAlasan.value = ''
  showDetailModal.value = false
  showBatalModal.value = true
}

async function konfirmasiBatal() {
  if (!batalAlasan.value.trim()) {
    message.warning('Masukkan alasan pembatalan')
    return
  }
  batalLoading.value = true
  try {
    await window.api.transaksi.batal(batalTargetId.value, batalAlasan.value.trim())
    message.success('Transaksi berhasil dibatalkan, stok dikembalikan')
    showBatalModal.value = false
    await loadData()
  } catch (e) {
    message.error('Gagal membatalkan: ' + (e.message || e))
  }
  batalLoading.value = false
}
const nonTunaiList = ref([])

const metodeEditOptions = computed(() => [
  { label: 'Tunai', value: 'tunai' },
  ...nonTunaiList.value.map(n => ({ label: n.nama, value: n.nama }))
])

const filteredTableList = computed(() => getFilteredPdfRows())

const filteredSummary = computed(() => {
  const rows = filteredTableList.value
  const agg = rows.reduce((acc, t) => {
    acc.totalOmzet += Number(t.total || 0) - Number(t.pajak_nominal || 0)
    acc.totalTransaksi += 1
    acc.totalPajak += Number(t.pajak_nominal || 0)
    acc.totalDiskon += Number(t.diskon_nominal || 0)
    // group perMetode
    const m = t.metode_bayar || '-'
    if (!acc._metodeMap[m]) acc._metodeMap[m] = { metode_bayar: m, jumlah: 0, total: 0 }
    acc._metodeMap[m].jumlah += 1
    acc._metodeMap[m].total += Number(t.total || 0)
    return acc
  }, { totalOmzet: 0, totalTransaksi: 0, totalPajak: 0, totalDiskon: 0, _metodeMap: {} })

  // modal & laba hanya tersedia dari full summary (butuh async per-item),
  // tampilkan dari summary.value saat filter 'all', kosong saat difilter
  const isAll = pdfMetodeFilter.value === 'all'
  agg.totalModal = isAll ? (summary.value.totalModal || 0) : null
  agg.labaKotor  = isAll ? (summary.value.labaKotor  || 0) : null
  agg.perMetode  = Object.values(agg._metodeMap)
  return agg
})

const pdfMetodeOptions = computed(() => {
  const base = [
    { label: 'Semua Metode', value: 'all' },
    { label: 'Hanya Tunai', value: 'tunai' },
    { label: 'Semua Non Tunai', value: 'non_tunai' }
  ]

  const metodeUnik = Array.from(
    new Set((summary.value.perMetode || []).map(m => m.metode_bayar).filter(Boolean))
  )

  const metodeSpesifik = metodeUnik
    .filter(m => m !== 'tunai')
    .map(m => ({ label: `Non Tunai: ${m}`, value: `metode:${m}` }))

  return [...base, ...metodeSpesifik]
})

function getDateRange() {
  const now = new Date()
  const today = now.toISOString().split('T')[0]

  if (periodeAktif.value === 'hari') {
    return { dari: today, sampai: today }
  }
  if (periodeAktif.value === 'kemarin') {
    const y = new Date(now); y.setDate(y.getDate() - 1)
    const yStr = y.toISOString().split('T')[0]
    return { dari: yStr, sampai: yStr }
  }
  if (periodeAktif.value === 'minggu') {
    const start = new Date(now); start.setDate(start.getDate() - start.getDay())
    return { dari: start.toISOString().split('T')[0], sampai: today }
  }
  if (periodeAktif.value === 'bulan') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    return { dari: start.toISOString().split('T')[0], sampai: today }
  }
  if (periodeAktif.value === 'custom' && dateRange.value) {
    return {
      dari: new Date(dateRange.value[0]).toISOString().split('T')[0],
      sampai: new Date(dateRange.value[1]).toISOString().split('T')[0]
    }
  }
  return { dari: today, sampai: today }
}

function getActorContext() {
  const user = authStore.currentUser || {}
  return {
    id: user.id || null,
    role: user.role || null,
    username: user.username || null,
    nama_kasir: user.nama_kasir || user.username || null
  }
}

function buildReportFilters() {
  const filters = getDateRange()

  if (kasirMode.value) {
    const kasirSaya = authStore.namaKasir
    selectedKasir.value = kasirSaya
    filters.nama_kasir = kasirSaya
  } else if (selectedKasir.value) {
    filters.nama_kasir = selectedKasir.value
  }

  return filters
}

async function loadData() {
  const filters = buildReportFilters()
  const actor = getActorContext()
  transaksiList.value = await window.api.transaksi.getAll(filters, actor)
  summary.value = await window.api.transaksi.summary(filters, actor)
}

async function loadKasirOptions() {
  if (kasirMode.value) {
    const kasirSaya = authStore.namaKasir
    selectedKasir.value = kasirSaya
    kasirOptions.value = kasirSaya ? [{ label: kasirSaya, value: kasirSaya }] : []
    return
  }

  const rows = await window.api.transaksi.getKasirList(getActorContext())
  kasirOptions.value = rows.map(r => ({ label: r.nama_kasir, value: r.nama_kasir }))
}

function setPeriode(p) {
  periodeAktif.value = p
  loadData()
}

function formatDate(str) {
  return new Date(str).toLocaleString('id-ID', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

function formatMetodeLabel(metode) {
  return metode === 'tunai' ? 'Tunai' : metode
}

function getFilteredPdfRows() {
  // Selalu exclude transaksi batal dari summary & PDF
  const list = (transaksiList.value || []).filter(t => !t.status || t.status === 'aktif')
  const mode = pdfMetodeFilter.value

  if (mode === 'tunai') return list.filter(t => t.metode_bayar === 'tunai')
  if (mode === 'non_tunai') return list.filter(t => t.metode_bayar !== 'tunai')
  if (mode && mode.startsWith('metode:')) {
    const metode = mode.slice(7)
    return list.filter(t => t.metode_bayar === metode)
  }
  return list
}

function getPdfMetodeLabel() {
  const mode = pdfMetodeFilter.value
  if (mode === 'tunai') return 'Tunai'
  if (mode === 'non_tunai') return 'Semua Non Tunai'
  if (mode && mode.startsWith('metode:')) return mode.slice(7)
  return 'Semua Metode'
}

async function buildPdfSummary(pdfRows) {
  const totals = pdfRows.reduce((acc, transaksi) => {
    acc.totalPendapatan += Number(transaksi.total || 0)
    acc.totalOmzet += Number(transaksi.total || 0) - Number(transaksi.pajak_nominal || 0)
    acc.totalTransaksi += 1
    acc.totalPajak += Number(transaksi.pajak_nominal || 0)
    acc.totalDiskon += Number(transaksi.diskon_nominal || 0)
    return acc
  }, {
    totalPendapatan: 0,
    totalOmzet: 0,
    totalTransaksi: 0,
    totalPajak: 0,
    totalDiskon: 0,
    totalModal: 0,
    labaKotor: 0
  })

  if (adminMode.value) {
    const detailList = await Promise.all(
      pdfRows.map(row => window.api.transaksi.getById(row.id))
    )

    totals.totalModal = detailList.reduce((sum, detail) => {
      const modalItem = (detail?.items || []).reduce((itemSum, item) => {
        return itemSum + (Number(item.harga_beli || 0) * Number(item.qty || 0))
      }, 0)

      return sum + modalItem
    }, 0)

    totals.labaKotor = totals.totalOmzet - totals.totalModal
  }

  return totals
}

const columns = [
  {
    title: 'No',
    key: 'no_urut',
    width: 55,
    render(row) {
      const idx = filteredTableList.value.findIndex(t => t.id === row.id)
      return idx >= 0 ? idx + 1 : '-'
    }
  },
  { title: 'No. Transaksi', key: 'no_transaksi', width: 160,
    render(row) { return row.no_transaksi?.replace(/^TRX-/, '') || '-' }
  },
  {
    title: 'Tanggal',
    key: 'tanggal',
    width: 145,
    render(row) { return formatDate(row.tanggal) }
  },
  { title: 'Kasir', key: 'nama_kasir', width: 90 },
  {
    title: 'Metode',
    key: 'metode_bayar',
    width: 90,
    render(row) {
      const type = row.metode_bayar === 'tunai' ? 'success' : 'info'
      const label = row.metode_bayar === 'tunai' ? 'Tunai' : row.metode_bayar
      return h(NTag, { size: 'small', type }, () => label)
    }
  },
  {
    title: 'Total',
    key: 'total',
    width: 120,
    sorter: (a, b) => a.total - b.total,
    render(row) {
      if (row.status === 'batal') return h(NTag, { size: 'small', type: 'error' }, () => 'BATAL')
      return h('strong', { style: 'color:#18a058; font-size:18px' }, formatCurrency(row.total))
    }
  },
  {
    title: 'Bayar (Tunai)',
    key: 'bayar',
    width: 120,
    render(row) {
      if (row.metode_bayar !== 'tunai') return h('span', { style: 'color:#aaa' }, '-')
      return h('strong', { style: 'font-size:17px' }, formatCurrency(row.bayar || 0))
    }
  },
  {
    title: 'Kembalian (Tunai)',
    key: 'kembalian',
    width: 130,
    render(row) {
      if (row.metode_bayar !== 'tunai') return h('span', { style: 'color:#aaa' }, '-')
      return h('strong', { style: 'font-size:17px' }, formatCurrency(row.kembalian || 0))
    }
  },
  {
    title: 'Pajak',
    key: 'pajak_nominal',
    width: 130,
    render(row) {
      if (!row.pajak_nominal || row.pajak_nominal === 0)
        return h('span', { style: 'color:#aaa' }, '-')
      return h('strong', { style: 'font-size:17px' }, `${formatCurrency(row.pajak_nominal)} (${row.pajak_persen}%)`)
    }
  },
  {
    title: 'Diskon',
    key: 'diskon_nominal',
    width: 130,
    render(row) {
      if ((row.diskon_persen || 0) > 0)
        return h('strong', { style: 'color:#d03050; font-size:17px' }, `${row.diskon_persen}% (${formatCurrency(row.diskon_nominal)})`)
      if ((row.diskon_nominal || 0) > 0)
        return h('strong', { style: 'color:#d03050; font-size:17px' }, `Nominal: ${formatCurrency(row.diskon_nominal)}`)
      return h('span', { style: 'color:#aaa' }, '-')
    }
  }
]

async function showDetail(row) {
  detailData.value = await window.api.transaksi.getById(row.id)
  showDetailModal.value = true
}

async function previewStruk(trx) {
  printing.value = true
  try {
    const settings = await window.api.settings.getAll()
    previewHTML.value = generateReceiptHTML(trx, settings)
    showPreviewModal.value = true
  } catch (e) {
    message.error('Gagal memuat preview: ' + (e.message || e))
  }
  printing.value = false
}

async function cetakStrukDetail(trx) {
  printing.value = true
  try {
    const settings = await window.api.settings.getAll()
    const html = generateReceiptHTML(trx, settings)
    await window.api.print.receipt(html, settings.nama_printer || undefined, settings.lebar_kertas || '58')
    message.success('Struk berhasil dicetak')
  } catch (e) {
    message.error('Gagal cetak: ' + (e.message || e))
  }
  printing.value = false
}

function editTransaksi(trx) {
  editingId.value = trx.id
  editForm.value = {
    metode_bayar: trx.metode_bayar,
    catatan: trx.catatan || '',
    diskon_persen: trx.diskon_persen,
    diskon_nominal: trx.diskon_nominal,
    nama_customer: trx.nama_customer || '',
    bayar: trx.bayar || 0,
    items: (trx.items || []).map(i => ({ ...i })),
    deletedItemIds: []
  }
  showDetailModal.value = false
  showEditModal.value = true
}

async function saveEditTransaksi() {
  savingEdit.value = true
  try {
    // Serialize ke plain object agar bisa di-clone oleh Electron IPC
    const payload = JSON.parse(JSON.stringify(editForm.value))
    await window.api.transaksi.update(editingId.value, payload)
    message.success('Transaksi diupdate')
    showEditModal.value = false
    await loadData()
  } catch (e) {
    message.error('Gagal update: ' + (e.message || e))
  }
  savingEdit.value = false
}

function deleteTransaksi(trx) {
  const isBatal = trx.status === 'batal'
  const msg = isBatal
    ? `Yakin hapus permanen transaksi ${trx.no_transaksi}? (Transaksi ini sudah dibatalkan sebelumnya)`
    : `Yakin hapus permanen transaksi ${trx.no_transaksi}? Stok produk akan dikembalikan.`

  mydialog.warning({
    title: 'Hapus Transaksi',
    content: msg,
    positiveText: 'Hapus',
    negativeText: 'Batal',
    onPositiveClick: async () => {
      await window.api.transaksi.delete(trx.id)
      message.success('Transaksi dihapus permanen')
      showDetailModal.value = false
      await loadData()
    }
  })
}

async function exportPdf() {
  exporting.value = true
  try {
    const { jsPDF } = await import('jspdf')
    await import('jspdf-autotable')

    const settings = await window.api.settings.getAll()
    const pdfRows = getFilteredPdfRows()
    if (pdfRows.length === 0) {
      message.warning('Tidak ada transaksi untuk metode bayar yang dipilih')
      exporting.value = false
      return
    }
    const pdfSummary = await buildPdfSummary(pdfRows)

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    const W = doc.internal.pageSize.getWidth()   // 297
    const margin = 14

    // ── Warna tema ──────────────────────────────────────────────────
    const PRIMARY   = [26, 86, 219]   // biru tua
    const PRIMARY_L = [219, 234, 254] // biru muda
    const ACCENT    = [22, 163, 74]   // hijau (omzet/laba)
    const MUTED     = [107, 114, 128] // abu
    const WHITE     = [255, 255, 255]
    const DARK      = [17, 24, 39]

    // ── Header bar ─────────────────────────────────────────────────
    doc.setFillColor(...PRIMARY)
    doc.rect(0, 0, W, 32, 'F')

    // Logo jika ada
    let headerTextX = margin
    if (settings.logo_path) {
      try {
        const img = await window.api.image.getBase64(settings.logo_path).catch(() => null)
        if (img) {
          doc.addImage(img, 'JPEG', margin, 6, 20, 20)
          headerTextX = margin + 24
        }
      } catch (_) {}
    }

    // Nama usaha
    doc.setTextColor(...WHITE)
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text(settings.nama_usaha || 'KasirKu', headerTextX, 17)

    // Sub-line: alamat
    const subLine = [settings.alamat, settings.kota, settings.no_hp ? `Telp: ${settings.no_hp}` : '']
      .filter(Boolean).join('  |  ')
    if (subLine) {
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.text(subLine, headerTextX, 25)
    }

    // Judul laporan di kanan
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('LAPORAN PENJUALAN', W - margin, 14, { align: 'right' })
    doc.setFont('helvetica', 'normal')
    const kasirLabel = kasirMode.value ? authStore.namaKasir : (selectedKasir.value || 'Semua Kasir')
    doc.text(`${getDateRange().dari}  s/d  ${getDateRange().sampai}`, W - margin, 21, { align: 'right' })
    doc.text(`Kasir: ${kasirLabel}  |  Metode: ${getPdfMetodeLabel()}`, W - margin, 27, { align: 'right' })

    // ── Divider ────────────────────────────────────────────────────
    let y = 40

    // ── Kartu ringkasan ────────────────────────────────────────────
    const cards = [
      { label: 'Total Transaksi', value: `${pdfSummary.totalTransaksi}`, color: PRIMARY },
      { label: 'Omzet',           value: formatCurrency(pdfSummary.totalOmzet), color: ACCENT },
      { label: 'Total Diskon',    value: formatCurrency(pdfSummary.totalDiskon), color: [234, 88, 12] },
      { label: 'Total Pajak',     value: formatCurrency(pdfSummary.totalPajak), color: [109, 40, 217] },
    ]
    if (adminMode.value) {
      cards.push({ label: 'Modal Terjual', value: formatCurrency(pdfSummary.totalModal), color: MUTED })
      cards.push({ label: 'Laba Kotor',    value: formatCurrency(pdfSummary.labaKotor),  color: ACCENT })
    }

    const colCount  = Math.min(cards.length, 4)
    const cardW     = (W - margin * 2 - (colCount - 1) * 4) / colCount
    const cardH     = 22

    let cx = margin
    cards.forEach((card, i) => {
      if (i > 0 && i % colCount === 0) { cx = margin; y += cardH + 4 }
      // Card background
      doc.setFillColor(...PRIMARY_L)
      doc.roundedRect(cx, y, cardW, cardH, 2, 2, 'F')
      // Accent strip kiri
      doc.setFillColor(...card.color)
      doc.roundedRect(cx, y, 3, cardH, 1, 1, 'F')
      // Label
      doc.setTextColor(...MUTED)
      doc.setFontSize(7.5)
      doc.setFont('helvetica', 'normal')
      doc.text(card.label.toUpperCase(), cx + 6, y + 8)
      // Value
      doc.setTextColor(...DARK)
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text(card.value, cx + 6, y + 17)
      cx += cardW + 4
    })

    y += cardH + 8

    // ── Tabel transaksi ────────────────────────────────────────────
    const tableData = pdfRows.map((t, i) => [
      i + 1,
      t.no_transaksi?.replace(/^TRX-/, '') || t.no_transaksi,
      formatDate(t.tanggal),
      t.nama_kasir,
      formatMetodeLabel(t.metode_bayar),
      formatCurrency(t.total),
      t.metode_bayar === 'tunai' ? formatCurrency(t.bayar || 0) : '-',
      t.metode_bayar === 'tunai' ? formatCurrency(t.kembalian || 0) : '-',
      (t.pajak_nominal || 0) > 0 ? `${formatCurrency(t.pajak_nominal)} (${t.pajak_persen}%)` : '-',
      (t.diskon_persen || 0) > 0
        ? `${t.diskon_persen}% (${formatCurrency(t.diskon_nominal)})`
        : (t.diskon_nominal || 0) > 0
          ? `Nominal: ${formatCurrency(t.diskon_nominal)}`
          : '-'
    ])

    doc.autoTable({
      startY: y,
      head: [['No', 'No. Transaksi', 'Tanggal', 'Kasir', 'Metode', 'Total', 'Bayar', 'Kembalian', 'Pajak', 'Diskon']],
      body: tableData,
      margin: { left: margin, right: margin },
      headStyles: {
        fillColor: PRIMARY,
        textColor: WHITE,
        fontStyle: 'bold',
        fontSize: 8,
        halign: 'center',
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
        1: { cellWidth: 30 },
        2: { cellWidth: 32 },
        3: { cellWidth: 22 },
        4: { cellWidth: 22 },
        5: { halign: 'right', fontStyle: 'bold', cellWidth: 30 },
        6: { halign: 'right', cellWidth: 28 },
        7: { halign: 'right', cellWidth: 28 },
        8: { halign: 'right', cellWidth: 28 },
        9: { halign: 'right', cellWidth: 28 },
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      styles: { fontSize: 8.5, cellPadding: 3, lineColor: [226, 232, 240], lineWidth: 0.1 },
      didDrawPage: (data) => {
        // ── Footer tiap halaman ──
        const pageH = doc.internal.pageSize.getHeight()
        doc.setFillColor(...PRIMARY)
        doc.rect(0, pageH - 12, W, 12, 'F')
        doc.setTextColor(...WHITE)
        doc.setFontSize(7.5)
        doc.setFont('helvetica', 'normal')
        const printDate = new Date().toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })
        doc.text(`Dicetak: ${printDate}`, margin, pageH - 4)
        doc.text(
          `Halaman ${doc.internal.getCurrentPageInfo().pageNumber}`,
          W - margin, pageH - 4, { align: 'right' }
        )
      }
    })

    // ── Simpan ─────────────────────────────────────────────────────
    const now = new Date()
    const timestamp = now.toISOString().replace(/[-:T]/g, '').split('.')[0]
    const metodeSlug = getPdfMetodeLabel().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') || 'semua_metode'
    const filename = `${(settings.nama_usaha || 'kasirku').replace(/\s+/g, '_')}_${metodeSlug}_${timestamp}.pdf`

    doc.save(filename)
    message.success('PDF berhasil didownload')
  } catch (e) {
    message.error('Gagal export PDF: ' + e.message)
  }
  exporting.value = false
}

onMounted(async () => {
  await loadKasirOptions()
  nonTunaiList.value = (await window.api.nontunai.getAll()).filter(n => n.aktif === 1)
  await loadData()
})
</script>

<style scoped>
.struk-preview-frame {
  width: 100%;
  min-height: 200px;
  border: none;
  border-radius: 6px;
  background: #d8d8d8;
  display: block;
  overflow: hidden;
}

.laporan-container {
  padding: 16px;
  height: 100%;
  overflow: auto;
  font-size: 16px;
}

.laporan-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.laporan-filters {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 16px;
}

.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.summary-card {
  text-align: center;
}

.summary-value.green { color: #18a058; }
.summary-value.orange { color: #d97706; }
.summary-value.red { color: #d03050; }

.metode-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 0;
  border-bottom: 1px solid #f0f0f0;
}
.metode-row:last-child { border-bottom: none; }

.metode-label { font-weight: 700; font-size: 17px; min-width: 140px; }
.metode-value { font-weight: 800; color: #18a058; font-size: 18px; }
.metode-count { font-size: 16px; font-weight: 700; color: #555; }

/* Perbesar font tabel */
:deep(.n-data-table-th) {
  font-size: 17px !important;
  font-weight: 700 !important;
}
:deep(.n-data-table-td) {
  font-size: 17px !important;
  font-weight: 600 !important;
}
:deep(.n-data-table-th__title) {
  font-size: 17px !important;
  font-weight: 700 !important;
}
</style>
