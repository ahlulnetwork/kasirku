<template>
  <div class="navbar">
    <div class="navbar-left">
      <div class="navbar-brand">
        <span class="brand-icon">🏪</span>
        <span class="brand-name">KasirKu</span>
      </div>
      <div class="navbar-tabs">
        <n-button
          v-for="tab in tabs"
          :key="tab.key"
          :type="activeTab === tab.key ? 'primary' : 'default'"
          :tertiary="activeTab !== tab.key"
          size="large"
          @click="goTo(tab.key)"
          class="nav-tab"
        >
          <template #icon>
            <n-icon :component="tab.icon" />
          </template>
          {{ tab.label }}
          <n-badge
            v-if="tab.badge && tab.badge > 0"
            :value="tab.badge"
            :offset="[-10, -5]"
            type="error"
          />
        </n-button>
      </div>
    </div>
    <div class="navbar-right">
      <n-tag :type="kasStatus.sudahBuka ? 'success' : 'warning'" size="medium" round>
        {{ kasStatus.sudahBuka ? (kasStatus.sudahTutup ? '🔒 Kas Ditutup' : '🟢 Kas Dibuka') : '🟡 Belum Buka Kas' }}
      </n-tag>
      <n-button
        v-if="!kasStatus.sudahBuka"
        type="success"
        size="medium"
        @click="showBukaKas = true"
      >
        Buka Kas
      </n-button>
      <n-button
        v-else-if="!kasStatus.sudahTutup"
        type="warning"
        size="medium"
        @click="showTutupKas = true"
      >
        Tutup Kas
      </n-button>
    </div>

    <!-- Modal Buka Kas -->
    <n-modal v-model:show="showBukaKas" preset="dialog" title="Buka Kas Hari Ini">
      <n-space vertical>
        <n-input-number
          v-model:value="saldoAwal"
          :min="0"
          placeholder="Saldo awal kas"
          size="large"
          style="width: 100%"
        >
          <template #prefix>Rp</template>
        </n-input-number>
        <n-input
          v-model:value="catatanKas"
          placeholder="Catatan (opsional)"
          type="textarea"
          :rows="2"
        />
      </n-space>
      <template #action>
        <n-button type="success" @click="bukaKas" :loading="loading">
          Buka Kas
        </n-button>
      </template>
    </n-modal>

    <!-- Modal Tutup Kas -->
    <n-modal v-model:show="showTutupKas" preset="dialog" title="Tutup Kas">
      <n-space vertical>
        <n-statistic label="Total Transaksi Hari Ini" :value="summaryHarian.totalTransaksi || 0" />
        <n-statistic label="Total Pendapatan" :value="formatCurrency(summaryHarian.totalPendapatan || 0)" />
        <n-input-number
          v-model:value="saldoAkhir"
          :min="0"
          placeholder="Saldo akhir kas"
          size="large"
          style="width: 100%"
        >
          <template #prefix>Rp</template>
        </n-input-number>
        <n-input
          v-model:value="catatanKas"
          placeholder="Catatan (opsional)"
          type="textarea"
          :rows="2"
        />
      </n-space>
      <template #action>
        <n-button type="warning" @click="tutupKas" :loading="loading">
          Tutup Kas
        </n-button>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useMessage } from 'naive-ui'
import { useProductsStore } from '../../stores/products'
import { formatCurrency } from '../../utils/formatCurrency'
import {
  CartOutline,
  CubeOutline,
  StatsChartOutline,
  SettingsOutline
} from '@vicons/ionicons5'

const router = useRouter()
const route = useRoute()
const message = useMessage()
const productsStore = useProductsStore()

const tabs = computed(() => [
  { key: 'kasir', label: 'Kasir (F1)', icon: CartOutline, badge: 0 },
  { key: 'produk', label: 'Produk', icon: CubeOutline, badge: productsStore.stokMenipisCount },
  { key: 'laporan', label: 'Laporan', icon: StatsChartOutline, badge: 0 },
  { key: 'pengaturan', label: 'Pengaturan', icon: SettingsOutline, badge: 0 }
])

const activeTab = computed(() => route.name || 'kasir')

const kasStatus = ref({ sudahBuka: false, sudahTutup: false })
const showBukaKas = ref(false)
const showTutupKas = ref(false)
const saldoAwal = ref(0)
const saldoAkhir = ref(0)
const catatanKas = ref('')
const loading = ref(false)
const summaryHarian = ref({})

function goTo(key) {
  router.push({ name: key })
}

async function loadKasStatus() {
  kasStatus.value = await window.api.kas.statusHariIni()
}

async function bukaKas() {
  loading.value = true
  try {
    await window.api.kas.buka(saldoAwal.value, catatanKas.value)
    message.success('Kas berhasil dibuka')
    showBukaKas.value = false
    saldoAwal.value = 0
    catatanKas.value = ''
    await loadKasStatus()
  } catch (e) {
    message.error('Gagal membuka kas')
  }
  loading.value = false
}

async function tutupKas() {
  loading.value = true
  try {
    await window.api.kas.tutup(saldoAkhir.value, catatanKas.value)
    message.success('Kas berhasil ditutup')
    showTutupKas.value = false
    saldoAkhir.value = 0
    catatanKas.value = ''
    await loadKasStatus()
  } catch (e) {
    message.error('Gagal menutup kas')
  }
  loading.value = false
}

async function loadSummaryHarian() {
  const today = new Date().toISOString().split('T')[0]
  summaryHarian.value = await window.api.transaksi.summary({ dari: today, sampai: today })
}

// Keyboard shortcut
function handleKeydown(e) {
  if (e.key === 'F1') { e.preventDefault(); goTo('kasir') }
}

onMounted(async () => {
  await loadKasStatus()
  await loadSummaryHarian()
  await productsStore.loadStokMenipisCount()
  window.addEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
.navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background: #fff;
  border-bottom: 1px solid #e8e8e8;
  height: 56px;
  flex-shrink: 0;
}

.navbar-left {
  display: flex;
  align-items: center;
  gap: 20px;
}

.navbar-brand {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  font-size: 18px;
}

.brand-icon {
  font-size: 24px;
}

.navbar-tabs {
  display: flex;
  gap: 4px;
}

.nav-tab {
  position: relative;
}

.navbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}
</style>
