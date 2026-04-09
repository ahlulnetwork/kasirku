<template>
  <div class="laporan-container">
    <div class="laporan-header">
      <h2>Laporan Transaksi</h2>
      <n-button type="primary" @click="exportPdf" :loading="exporting">
        📄 Download PDF
      </n-button>
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
        <n-statistic label="Total Pendapatan">
          <template #default>
            <span class="summary-value green">{{ formatCurrency(summary.totalPendapatan || 0) }}</span>
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
    <div class="metode-cards" v-if="summary.perMetode && summary.perMetode.length > 0">
      <n-card size="small" v-for="m in summary.perMetode" :key="m.metode_bayar">
        <div class="metode-item">
          <span class="metode-label">{{ m.metode_bayar === 'tunai' ? '💵 Tunai' : '💳 ' + m.metode_bayar }}</span>
          <span class="metode-value">{{ formatCurrency(m.total) }}</span>
          <span class="metode-count">{{ m.jumlah }} transaksi</span>
        </div>
      </n-card>
    </div>

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
            <n-descriptions-item label="Metode">{{ detailData.metode_bayar }}</n-descriptions-item>
            <n-descriptions-item label="Total">
              <strong style="color:#18a058">{{ formatCurrency(detailData.total) }}</strong>
            </n-descriptions-item>
          </n-descriptions>

          <n-table size="small" bordered style="margin-top: 12px">
            <thead>
              <tr><th>Produk</th><th>Harga</th><th>Qty</th><th>Subtotal</th></tr>
            </thead>
            <tbody>
              <tr v-for="item in detailData.items" :key="item.id">
                <td>{{ item.nama_produk }}</td>
                <td>{{ formatCurrency(item.harga_satuan) }}</td>
                <td>{{ item.qty }}</td>
                <td>{{ formatCurrency(item.subtotal) }}</td>
              </tr>
            </tbody>
          </n-table>

          <n-space style="margin-top: 12px" justify="end">
            <n-button size="small" @click="editTransaksi(detailData)">✏️ Edit</n-button>
            <n-button size="small" type="error" @click="deleteTransaksi(detailData)">🗑️ Hapus</n-button>
          </n-space>
        </template>
      </n-card>
    </n-modal>

    <!-- Edit Modal -->
    <n-modal v-model:show="showEditModal" preset="dialog" title="Edit Transaksi">
      <n-form label-placement="left" label-width="120">
        <n-form-item label="Metode Bayar">
          <n-input v-model:value="editForm.metode_bayar" />
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
import { ref, h, onMounted } from 'vue'
import { useMessage, useDialog, NTag } from 'naive-ui'
import { formatCurrency } from '../utils/formatCurrency'

const message = useMessage()
const mydialog = useDialog()

const periodeAktif = ref('hari')
const dateRange = ref(null)
const transaksiList = ref([])
const summary = ref({})
const exporting = ref(false)

const showDetailModal = ref(false)
const detailData = ref(null)
const showEditModal = ref(false)
const editForm = ref({ metode_bayar: '', catatan: '', diskon_persen: 0, diskon_nominal: 0 })
const editingId = ref(null)

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

async function loadData() {
  const filters = getDateRange()
  transaksiList.value = await window.api.transaksi.getAll(filters)
  summary.value = await window.api.transaksi.summary(filters)
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

const columns = [
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
      return h(NTag, { size: 'small', type }, () => row.metode_bayar)
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

    doc.setFontSize(11)
    doc.text(`Total Pendapatan: ${formatCurrency(summary.value.totalPendapatan || 0)}`, 14, 38)
    doc.text(`Total Transaksi: ${summary.value.totalTransaksi || 0}`, 14, 45)
    doc.text(`Total Pajak: ${formatCurrency(summary.value.totalPajak || 0)}`, 14, 52)
    doc.text(`Total Diskon: ${formatCurrency(summary.value.totalDiskon || 0)}`, 14, 59)

    const tableData = transaksiList.value.map(t => [
      t.no_transaksi,
      formatDate(t.tanggal),
      t.nama_kasir,
      t.metode_bayar,
      formatCurrency(t.total)
    ])

    doc.autoTable({
      startY: 68,
      head: [['No. Transaksi', 'Tanggal', 'Kasir', 'Metode', 'Total']],
      body: tableData,
      styles: { fontSize: 9 }
    })

    const now = new Date()
    const timestamp = now.toISOString().replace(/[-:T]/g, '').split('.')[0]
    const filename = `${(settings.nama_usaha || 'kasirku').replace(/\s+/g, '_')}_${timestamp}.pdf`

    doc.save(filename)
    message.success('PDF berhasil didownload')
  } catch (e) {
    message.error('Gagal export PDF: ' + e.message)
  }
  exporting.value = false
}

onMounted(() => loadData())
</script>

<style scoped>
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
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.summary-card {
  text-align: center;
}

.summary-value.green { color: #18a058; }
.summary-value.red { color: #d03050; }

.metode-cards {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.metode-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.metode-label { font-weight: 600; font-size: 13px; }
.metode-value { font-weight: 700; color: #18a058; }
.metode-count { font-size: 12px; color: #999; }
</style>
