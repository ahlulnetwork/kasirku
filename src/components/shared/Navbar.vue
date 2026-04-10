<template>
  <div class="navbar">
    <div class="navbar-left">
      <div class="navbar-brand">
        <img src="../../assets/logo.png" alt="" class="brand-icon" />
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
          <n-badge
            v-if="tab.badge && tab.badge > 0"
            :value="tab.badge"
            type="error"
            :offset="[12, -2]"
          >
            {{ tab.label }}
          </n-badge>
          <template v-else>{{ tab.label }}</template>
        </n-button>
      </div>
    </div>
    <div class="navbar-right">
      <template v-if="!authStore.isAdmin">
        <n-button
          v-if="!kasStatus.sudahBuka"
          type="success"
          size="medium"
          @click="showBukaKas = true"
        >
          🟡 Buka Kas
        </n-button>
        <template v-else-if="kasStatus.sudahTutup">
          <n-button
            size="small"
            type="default"
            @click="showBukaKas = true"
          >
            🔓 Buka Ulang Kas
          </n-button>
        </template>
        <template v-else>
          <n-tag type="success" size="medium" round>🟢 Kas Dibuka</n-tag>
          <n-button
            type="warning"
            size="medium"
            @click="openTutupKas"
          >
            Tutup Kas
          </n-button>
        </template>
        <n-divider vertical style="height:24px" />
      </template>

      <!-- Current user -->
      <n-tag size="medium" round>
        👤 {{ authStore.namaKasir }}
        <template v-if="authStore.isAdmin"> <n-badge dot type="warning" /></template>
      </n-tag>
      <n-button size="small" type="default" @click="doLogout">Keluar</n-button>
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
    <n-modal v-model:show="showTutupKas" preset="dialog" title="Tutup Kas" style="width:440px">
      <n-space vertical :size="12">
        <!-- Rekap -->
        <n-card size="small" style="background:#f8fdf9">
          <table class="rekap-kas-table">
            <tr>
              <td>Saldo Awal Kas</td>
              <td class="rekap-val">{{ formatCurrency(rekapKas.saldo_awal || 0) }}</td>
            </tr>
            <tr>
              <td>+ Total Transaksi Tunai</td>
              <td class="rekap-val text-green">{{ formatCurrency(rekapKas.total_tunai || 0) }}</td>
            </tr>
            <tr>
              <td>+ Total Non Tunai</td>
              <td class="rekap-val">{{ formatCurrency(rekapKas.total_non_tunai || 0) }}</td>
            </tr>
            <tr>
              <td>Total Transaksi Hari Ini</td>
              <td class="rekap-val">{{ rekapKas.total_transaksi || 0 }} transaksi</td>
            </tr>
            <tr class="rekap-divider">
              <td><strong>Ekspektasi Saldo Kas</strong></td>
              <td class="rekap-val"><strong>{{ formatCurrency(rekapKas.ekspektasi || 0) }}</strong></td>
            </tr>
          </table>
        </n-card>

        <!-- Input Saldo Aktual -->
        <n-form-item label="Saldo Aktual (hitung uang di laci)" :show-feedback="false">
          <n-input-number
            v-model:value="saldoAkhir"
            :min="0"
            placeholder="Masukkan jumlah uang di laci"
            size="large"
            style="width: 100%"
          >
            <template #prefix>Rp</template>
          </n-input-number>
        </n-form-item>

        <!-- Selisih -->
        <div v-if="saldoAkhir !== null && saldoAkhir !== 0" class="rekap-selisih" :class="selisihKas === 0 ? 'selisih-ok' : selisihKas < 0 ? 'selisih-minus' : 'selisih-plus'">
          <span>Selisih</span>
          <strong>{{ selisihKas >= 0 ? '+' : '' }}{{ formatCurrency(selisihKas) }}
            {{ selisihKas === 0 ? '✅' : selisihKas < 0 ? '⚠️ Kurang' : '⚠️ Lebih' }}
          </strong>
        </div>

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
import { useAuthStore } from '../../stores/auth'
import { useKasStore } from '../../stores/kas'
import { formatCurrency } from '../../utils/formatCurrency'
import {
  CartOutline,
  CubeOutline,
  StatsChartOutline,
  SettingsOutline,
  PeopleOutline
} from '@vicons/ionicons5'

const router = useRouter()
const route = useRoute()
const message = useMessage()
const productsStore = useProductsStore()
const authStore = useAuthStore()
const kasStore = useKasStore()

const emit = defineEmits(['logout'])

function doLogout() {
  authStore.logout()
  emit('logout')
}

// Tab admin: Kelola User, Produk, Laporan, Pengaturan
// Tab kasir: Kasir, Laporan
const tabs = computed(() => {
  if (authStore.isAdmin) {
    return [
      { key: 'produk', label: 'Produk', icon: CubeOutline, badge: productsStore.stokMenipisCount },
      { key: 'laporan', label: 'Laporan', icon: StatsChartOutline, badge: 0 },
      { key: 'pengaturan', label: 'Pengaturan', icon: SettingsOutline, badge: 0 }
    ]
  }
  return [
    { key: 'kasir', label: 'Kasir (F1)', icon: CartOutline, badge: 0 },
    { key: 'laporan', label: 'Laporan', icon: StatsChartOutline, badge: 0 }
  ]
})

const activeTab = computed(() => route.name || 'kasir')

const kasStatus = computed(() => kasStore.status)
const showBukaKas = ref(false)
const showTutupKas = ref(false)
const saldoAwal = ref(0)
const saldoAkhir = ref(0)
const catatanKas = ref('')
const loading = ref(false)
const summaryHarian = ref({})
const rekapKas = ref({})

const selisihKas = computed(() => {
  if (!saldoAkhir.value) return 0
  return saldoAkhir.value - (rekapKas.value.ekspektasi || 0)
})

function goTo(key) {
  router.push({ name: key })
}

async function loadKasStatus() {
  await kasStore.loadStatus()
}

async function bukaKas() {
  loading.value = true
  try {
    await window.api.kas.buka(saldoAwal.value, catatanKas.value)
    message.success('Kas berhasil dibuka')
    showBukaKas.value = false
    saldoAwal.value = 0
    catatanKas.value = ''
    await kasStore.loadStatus()
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
    await kasStore.loadStatus()
  } catch (e) {
    message.error('Gagal menutup kas')
  }
  loading.value = false
}

async function loadSummaryHarian() {
  const today = new Date().toISOString().split('T')[0]
  summaryHarian.value = await window.api.transaksi.summary({ dari: today, sampai: today })
}

async function openTutupKas() {
  try {
    rekapKas.value = window.api.kas.rekap ? await window.api.kas.rekap() : {}
  } catch (e) {
    rekapKas.value = {}
  }
  saldoAkhir.value = 0
  catatanKas.value = ''
  showTutupKas.value = true
}

// Keyboard shortcut
function handleKeydown(e) {
  if (e.key === 'F1') { e.preventDefault(); goTo('kasir') }
}

onMounted(async () => {
  await kasStore.loadStatus()
  await loadSummaryHarian()
  await productsStore.loadStokMenipisCount()
  window.addEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
.rekap-kas-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.rekap-kas-table td {
  padding: 5px 4px;
}
.rekap-kas-table .rekap-val {
  text-align: right;
  font-weight: 600;
  white-space: nowrap;
}
.rekap-kas-table .text-green { color: #18a058; }
.rekap-divider td {
  border-top: 1px solid #d0e8d8;
  padding-top: 8px;
  font-size: 14px;
  color: #18a058;
}
.rekap-selisih {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 14px;
}
.selisih-ok { background: #f0fff4; color: #18a058; }
.selisih-minus { background: #fff1f0; color: #d03050; }
.selisih-plus { background: #fffbe6; color: #d4870a; }

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
  width: 28px;
  height: 28px;
  object-fit: contain;
  border-radius: 6px;
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
