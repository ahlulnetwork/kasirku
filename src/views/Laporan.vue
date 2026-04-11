<template>
  <div class="laporan-container">
    <div class="laporan-header">
      <h2>Laporan Transaksi</h2>
      <n-space>
        <n-select
          v-model:value="pdfMetodeFilter"
          :options="pdfMetodeOptions"
          size="small"
          style="width: 220px"
        />
        <n-button type="primary" @click="exportPdf" :loading="exporting">
          📄 Download PDF
        </n-button>
      </n-space>
    </div>

    <!-- Filter Periode -->
    <div class="laporan-filters">
      <n-space>
        <n-button :type="periodeAktif === 'hari' ? 'primary' : 'default'" size="small" @click="setPeriode('hari')">Hari Ini</n-button>
        <n-button :type="periodeAktif === 'kemarin' ? 'primary' : 'default'" size="small" @click="setPeriode('kemarin')">Kemarin</n-button>
        <n-button :type="periodeAktif === 'minggu' ? 'primary' : 'default'" size="small" @click="setPeriode('minggu')">Minggu Ini</n-button>
        <n-button :type="periodeAktif === 'bulan' ? 'primary' : 'default'" size="small" @click="setPeriode('bulan')">Bulan Ini</n-button>
        <n-button :type="periodeAktif === 'custom' ? 'primary' : 'default'" size="small" @click="periodeAktif = 'custom'">Custom</n-button>
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
            <span class="summary-value green">{{ formatCurrency(summary.totalOmzet || 0) }}</span>
          </template>
        </n-statistic>
      </n-card>
      <n-card v-if="adminMode" class="summary-card">
        <n-statistic label="Modal Terjual">
          <template #default>
            <span class="summary-value orange">{{ formatCurrency(summary.totalModal || 0) }}</span>
          </template>
        </n-statistic>
      </n-card>
      <n-card v-if="adminMode" class="summary-card">
        <n-statistic label="Laba Kotor">
          <template #default>
            <span class="summary-value green">{{ formatCurrency(summary.labaKotor || 0) }}</span>
          </template>
        </n-statistic>
      </n-card>
      <n-card class="summary-card">
        <n-statistic label="Total Transaksi" :value="summary.totalTransaksi || 0" />
      </n-card>
      <n-card class="summary-card">
        <n-statistic label="Total Pajak">
          <template #default>{{ formatCurrency(summary.totalPajak || 0) }}</template>
        </n-statistic>
      </n-card>
      <n-card class="summary-card">
        <n-statistic label="Total Diskon">
          <template #default>
            <span class="summary-value red">{{ formatCurrency(summary.totalDiskon || 0) }}</span>
          </template>
        </n-statistic>
      </n-card>
    </div>

    <!-- Per Metode Bayar -->
    <n-card size="small" v-if="summary.perMetode && summary.perMetode.length > 0" style="margin-bottom:16px">
      <div class="metode-row" v-for="m in summary.perMetode" :key="m.metode_bayar">
        <span class="metode-label">{{ m.metode_bayar === 'tunai' ? '💵 Tunai' : '💳 ' + m.metode_bayar.toUpperCase() }}</span>
        <span class="metode-count">{{ m.jumlah }} transaksi</span>
        <span class="metode-value">{{ formatCurrency(m.total) }}</span>
      </div>
    </n-card>

    <!-- Tabel Transaksi -->
    <n-data-table
      :columns="columns"
      :data="transaksiList"
      :pagination="{ pageSize: 15 }"
      :row-key="row => row.id"
      striped
      style="margin-top: 16px"
      :row-props="(row) => ({ style: 'cursor: pointer', onClick: () => showDetail(row) })"
    />

    <!-- Detail Modal -->
    <n-modal v-model:show="showDetailModal" style="width: 550px">
      <n-card :title="'Detail Transaksi ' + (detailData?.no_transaksi || '')" :bordered="false">
        <template v-if="detailData">
          <n-descriptions bordered :column="2" size="small">
            <n-descriptions-item label="Tanggal">{{ formatDate(detailData.tanggal) }}</n-descriptions-item>
            <n-descriptions-item label="Kasir">{{ detailData.nama_kasir }}</n-descriptions-item>
            <n-descriptions-item label="Metode">{{ detailData.metode_bayar === 'tunai' ? 'Tunai' : detailData.metode_bayar }}</n-descriptions-item>
            <n-descriptions-item label="Total">
              <strong style="color:#18a058">{{ formatCurrency(detailData.total) }}</strong>
            </n-descriptions-item>
          </n-descriptions>

          <n-table size="small" bordered style="margin-top: 12px">
            <thead>
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

          <n-space style="margin-top: 12px" justify="space-between" align="center">
            <n-space>
              <n-button size="small" type="info" :loading="printing" @click="cetakStrukDetail(detailData)">🖨️ Cetak Ulang</n-button>
              <n-button size="small" type="default" :loading="printing" @click="previewStruk(detailData)">👁️ Preview Struk</n-button>
            </n-space>
            <n-space>
              <n-button size="small" @click="editTransaksi(detailData)">✏️ Edit</n-button>
              <n-button size="small" type="error" @click="deleteTransaksi(detailData)">🗑️ Hapus</n-button>
            </n-space>
          </n-space>
        </template>
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
    <n-modal v-model:show="showEditModal" preset="dialog" title="Edit Transaksi">
      <n-form label-placement="left" label-width="130">
        <n-form-item label="Metode Bayar">
          <n-select v-model:value="editForm.metode_bayar" :options="metodeEditOptions" />
        </n-form-item>
        <n-form-item label="Diskon (%)">
          <n-input-number v-model:value="editForm.diskon_persen" :min="0" :max="100" :precision="2" style="width:100%" />
        </n-form-item>
        <n-form-item label="Diskon (Nominal)">
          <n-input-number v-model:value="editForm.diskon_nominal" :min="0" :precision="0" :format="v => v ? 'Rp ' + v.toLocaleString('id-ID') : 'Rp 0'" style="width:100%" />
        </n-form-item>
        <n-form-item label="Catatan">
          <n-input v-model:value="editForm.catatan" type="textarea" :rows="2" />
        </n-form-item>
      </n-form>
      <template #action>
        <n-button type="primary" @click="saveEditTransaksi">Simpan</n-button>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, h, onMounted, computed } from 'vue'
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
    const body = e.target.contentDocument?.body
    if (body) e.target.style.height = body.scrollHeight + 'px'
  } catch (_) {}
}
const editForm = ref({ metode_bayar: '', catatan: '', diskon_persen: 0, diskon_nominal: 0 })
const editingId = ref(null)
const nonTunaiList = ref([])

const metodeEditOptions = computed(() => [
  { label: 'Tunai', value: 'tunai' },
  ...nonTunaiList.value.map(n => ({ label: n.nama, value: n.nama }))
])

const pdfMetodeOptions = computed(() => {
  const base = [
    { label: 'Semua Metode (PDF)', value: 'all' },
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
  const list = transaksiList.value || []
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
    width: 60,
    render(row) {
      const idx = transaksiList.value.findIndex(t => t.id === row.id)
      return idx >= 0 ? idx + 1 : '-'
    }
  },
  { title: 'No. Transaksi', key: 'no_transaksi', width: 180 },
  {
    title: 'Tanggal',
    key: 'tanggal',
    width: 160,
    render(row) { return formatDate(row.tanggal) }
  },
  { title: 'Kasir', key: 'nama_kasir', width: 100 },
  {
    title: 'Metode',
    key: 'metode_bayar',
    width: 100,
    render(row) {
      const type = row.metode_bayar === 'tunai' ? 'success' : 'info'
      const label = row.metode_bayar === 'tunai' ? 'Tunai' : row.metode_bayar
      return h(NTag, { size: 'small', type }, () => label)
    }
  },
  {
    title: 'Total',
    key: 'total',
    width: 140,
    sorter: (a, b) => a.total - b.total,
    render(row) { return h('strong', { style: 'color:#18a058;font-size:15px' }, formatCurrency(row.total)) }
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
    let logoBase64 = null
    if (settings.logo_path && settings.tampil_logo_struk === '1') {
      try { logoBase64 = await window.api.image.toGrayscale(settings.logo_path) } catch (e) { console.warn('Gagal memuat logo preview laporan:', e) }
    }
    previewHTML.value = generateReceiptHTML(trx, settings, logoBase64)
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
    let logoBase64 = null
    if (settings.logo_path && settings.tampil_logo_struk === '1') {
      try { logoBase64 = await window.api.image.toGrayscale(settings.logo_path) } catch (e) { console.warn('Gagal memuat logo ekspor laporan:', e) }
    }
    const html = generateReceiptHTML(trx, settings, logoBase64)
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
    diskon_nominal: trx.diskon_nominal
  }
  showDetailModal.value = false
  showEditModal.value = true
}

async function saveEditTransaksi() {
  await window.api.transaksi.update(editingId.value, editForm.value)
  message.success('Transaksi diupdate')
  showEditModal.value = false
  await loadData()
}

function deleteTransaksi(trx) {
  mydialog.warning({
    title: 'Hapus Transaksi',
    content: `Yakin hapus transaksi ${trx.no_transaksi}? Stok produk akan dikembalikan.`,
    positiveText: 'Hapus',
    negativeText: 'Batal',
    onPositiveClick: async () => {
      await window.api.transaksi.delete(trx.id)
      message.success('Transaksi dihapus, stok dikembalikan')
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
    const doc = new jsPDF()

    doc.setFontSize(16)
    doc.text(settings.nama_usaha || 'KasirKu', 14, 20)
    doc.setFontSize(10)
    doc.text(`Laporan: ${getDateRange().dari} s/d ${getDateRange().sampai}`, 14, 28)
    const kasirLabel = kasirMode.value ? authStore.namaKasir : (selectedKasir.value || 'Semua kasir')
    doc.text(`Kasir: ${kasirLabel || 'Semua kasir'}`, 14, 34)
    doc.text(`Metode: ${getPdfMetodeLabel()}`, 14, 40)

    const pdfRows = getFilteredPdfRows()
    if (pdfRows.length === 0) {
      message.warning('Tidak ada transaksi untuk metode bayar yang dipilih')
      return
    }

    const pdfSummary = await buildPdfSummary(pdfRows)

    doc.setFontSize(11)
    doc.text(`Omzet: ${formatCurrency(pdfSummary.totalOmzet)}`, 14, 48)
    doc.text(`Total Transaksi: ${pdfSummary.totalTransaksi}`, 14, 55)
    doc.text(`Total Pajak: ${formatCurrency(pdfSummary.totalPajak)}`, 14, 62)
    doc.text(`Total Diskon: ${formatCurrency(pdfSummary.totalDiskon)}`, 14, 69)
    if (adminMode.value) {
      doc.text(`Modal Terjual: ${formatCurrency(pdfSummary.totalModal)}`, 14, 76)
      doc.text(`Laba Kotor: ${formatCurrency(pdfSummary.labaKotor)}`, 14, 83)
    }

    const tableData = pdfRows.map((t, i) => [
      i + 1,
      t.no_transaksi,
      formatDate(t.tanggal),
      t.nama_kasir,
      formatMetodeLabel(t.metode_bayar),
      formatCurrency(t.total)
    ])

    doc.autoTable({
      startY: adminMode.value ? 92 : 78,
      head: [['No', 'No. Transaksi', 'Tanggal', 'Kasir', 'Metode', 'Total']],
      body: tableData,
      styles: { fontSize: 9 }
    })

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
  border: 1px solid #e8e8e8;
  border-radius: 4px;
  background: #fff;
  display: block;
}

.laporan-container {
  padding: 16px;
  height: 100%;
  overflow: auto;
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

.metode-label { font-weight: 600; font-size: 13px; min-width: 120px; }
.metode-value { font-weight: 700; color: #18a058; }
.metode-count { font-size: 12px; color: #999; }
</style>
