<template>
  <div class="kasir-container">
    <!-- Panel Kiri: Daftar Produk -->
    <div class="kasir-products">
      <div class="products-header">
        <n-input
          ref="searchInput"
          v-model:value="searchQuery"
          placeholder="Cari produk / scan barcode... (F1)"
          size="large"
          clearable
          @keydown.enter="handleBarcodeEnter"
        >
          <template #prefix>
            <n-icon :component="SearchOutline" />
          </template>
        </n-input>
        <div class="kategori-tabs">
          <n-scrollbar x-scrollable style="max-width: 100%">
            <div class="kategori-list">
              <n-button
                :type="selectedKategori === null ? 'primary' : 'default'"
                :tertiary="selectedKategori !== null"
                size="small"
                @click="selectedKategori = null"
              >
                Semua
              </n-button>
              <n-button
                v-for="kat in kategoriList"
                :key="kat.id"
                :type="selectedKategori === kat.id ? 'primary' : 'default'"
                :tertiary="selectedKategori !== kat.id"
                size="small"
                @click="selectedKategori = kat.id"
              >
                {{ kat.nama }}
              </n-button>
            </div>
          </n-scrollbar>
        </div>
        <div class="view-toggle">
          <n-button-group size="small">
            <n-button :type="viewMode === 'grid' ? 'primary' : 'default'" @click="viewMode = 'grid'">
              <template #icon><n-icon :component="GridOutline" /></template>
            </n-button>
            <n-button :type="viewMode === 'list' ? 'primary' : 'default'" @click="viewMode = 'list'">
              <template #icon><n-icon :component="ListOutline" /></template>
            </n-button>
          </n-button-group>
        </div>
      </div>

      <n-scrollbar style="flex: 1">
        <!-- Grid View -->
        <div v-if="viewMode === 'grid'" class="products-grid">
          <div
            v-for="prod in filteredProducts"
            :key="prod.id"
            class="product-card"
            :class="{ disabled: prod.stok === 0 }"
            @click="addToCart(prod)"
          >
            <div class="product-img">
              <img v-if="prod.foto_path" :src="'media://' + prod.foto_path" alt="" />
              <div v-else class="product-img-placeholder">
                <n-icon :component="CubeOutline" size="32" />
              </div>
            </div>
            <div class="product-info">
              <div class="product-name">{{ prod.nama }}</div>
              <div v-if="prod.deskripsi" class="product-desc">{{ prod.deskripsi }}</div>
              <div class="product-price">{{ formatCurrency(prod.harga) }}</div>
              <n-tag v-if="prod.stok === -1" size="tiny" type="info">∞</n-tag>
              <n-tag v-else-if="prod.stok === 0" size="tiny" type="error">Habis</n-tag>
              <n-tag v-else-if="prod.stok <= prod.stok_minimum" size="tiny" type="warning">Sisa {{ prod.stok }}</n-tag>
              <n-tag v-else size="tiny">Stok {{ prod.stok }}</n-tag>
            </div>
          </div>
        </div>

        <!-- List View -->
        <div v-else class="products-list">
          <div
            v-for="prod in filteredProducts"
            :key="prod.id"
            class="product-list-item"
            :class="{ disabled: prod.stok === 0 }"
            @click="addToCart(prod)"
          >
            <div class="product-list-img">
              <img v-if="prod.foto_path" :src="'media://' + prod.foto_path" alt="" />
              <div v-else class="product-img-placeholder-sm">
                <n-icon :component="CubeOutline" size="20" />
              </div>
            </div>
            <div class="product-list-info">
              <div class="product-name">{{ prod.nama }}</div>
              <div v-if="prod.deskripsi" class="product-desc">{{ prod.deskripsi }}</div>
            </div>
            <div class="product-list-right">
              <div class="product-price">{{ formatCurrency(prod.harga) }}</div>
              <n-tag v-if="prod.stok === -1" size="tiny" type="info">∞</n-tag>
              <n-tag v-else size="tiny" :type="prod.stok <= prod.stok_minimum ? 'warning' : 'default'">
                {{ prod.stok === 0 ? 'Habis' : `Stok ${prod.stok}` }}
              </n-tag>
            </div>
          </div>
        </div>

        <n-empty v-if="filteredProducts.length === 0" description="Tidak ada produk ditemukan" style="padding: 40px" />
      </n-scrollbar>
    </div>

    <!-- Panel Kanan: Keranjang -->
    <div class="kasir-cart">
      <div class="cart-header">
        <h3>
          🛒 Keranjang
          <span v-if="cartStore.items.length > 0" class="cart-badge">{{ cartStore.items.length }} item</span>
        </h3>
        <n-button
          v-if="cartStore.items.length > 0"
          text
          type="error"
          size="small"
          @click="clearCart"
        >
          Hapus Semua (F3)
        </n-button>
      </div>

      <n-scrollbar class="cart-items">
        <div v-if="cartStore.items.length === 0" class="cart-empty">
          <p>Belum ada item</p>
          <p class="cart-hint">Klik produk atau scan barcode</p>
        </div>

        <div
          v-for="(item, index) in cartStore.items"
          :key="index"
          class="cart-item"
          :class="{ selected: selectedCartIndex === index }"
          @click="selectedCartIndex = index"
        >
          <div class="cart-item-top">
            <span class="cart-item-no">{{ index + 1 }}</span>
            <span class="cart-item-name">{{ item.nama }}</span>
            <n-button text type="error" size="tiny" @click="cartStore.removeItem(index)">
              <n-icon :component="TrashOutline" />
            </n-button>
          </div>
          <div class="cart-item-detail">
            <div class="cart-item-qty">
              <n-button size="small" @click="cartStore.decreaseQty(index)" style="min-width:28px;font-size:16px;font-weight:700">-</n-button>
              <n-input-number
                :value="item.qty"
                @update:value="(v) => cartStore.setQty(index, v)"
                :min="1"
                size="small"
                style="width: 60px"
                :show-button="false"
              />
              <n-button size="small" @click="cartStore.increaseQty(index)" style="min-width:28px;font-size:16px;font-weight:700">+</n-button>
            </div>
            <div class="cart-item-price">
              {{ formatCurrency(item.harga * item.qty) }}
            </div>
          </div>
          <div v-if="item.diskonPersen > 0 || item.diskonNominal > 0" class="cart-item-diskon">
            Diskon: {{ item.diskonPersen > 0 ? item.diskonPersen + '%' : formatCurrency(item.diskonNominal) }}
          </div>
          <n-button text size="tiny" type="info" @click="editDiskonItem(index)">
            + Diskon
          </n-button>
        </div>
      </n-scrollbar>

      <!-- Cart Summary -->
      <div class="cart-summary">
        <div class="cart-summary-row">
          <span>Subtotal</span>
          <span>{{ formatCurrency(cartStore.subtotal) }}</span>
        </div>

        <div class="cart-summary-row" v-if="cartStore.totalDiskon > 0">
          <n-button text type="info" size="tiny" @click="showDiskonModal = true">
            Diskon {{ cartStore.diskonTransaksiPersen > 0 ? `(${cartStore.diskonTransaksiPersen}%)` : '' }}
          </n-button>
          <span class="text-red">-{{ formatCurrency(cartStore.totalDiskon) }}</span>
        </div>
        <div class="cart-summary-row" v-else>
          <n-button text type="info" size="tiny" @click="showDiskonModal = true">+ Diskon</n-button>
          <span>-</span>
        </div>

        <div class="cart-summary-row" v-if="settingsStore.pajakPersen > 0">
          <span>Pajak ({{ settingsStore.pajakPersen }}%)</span>
          <span>{{ formatCurrency(cartStore.pajakNominal) }}</span>
        </div>

        <div class="cart-summary-total">
          <span>TOTAL</span>
          <span class="price-big">{{ formatCurrency(cartStore.total) }}</span>
        </div>

        <!-- Print Off toggle -->
        <div class="print-off-row">
          <n-switch v-model:value="printOff" size="small" />
          <span :style="{ color: printOff ? '#d03050' : '#18a058', fontSize: '13px', marginLeft: '8px' }">
            🖨️{{ printOff ? ' Print OFF' : ' Print ON' }}
          </span>
        </div>

        <n-button
          type="primary"
          size="large"
          block
          :disabled="cartStore.items.length === 0 || !kasStore.sudahBuka"
          @click="kasStore.sudahBuka ? showPayment = true : message.warning('Buka kas terlebih dahulu sebelum bertransaksi.')"
          style="height: 56px; font-size: 18px; font-weight: 700; margin-top: 8px"
        >
          {{ kasStore.sudahBuka ? '💰 BAYAR (F2)' : '🔒 Buka Kas Dulu' }}
        </n-button>
      </div>
    </div>

    <!-- Modal Diskon Transaksi -->
    <n-modal v-model:show="showDiskonModal" preset="dialog" title="Diskon Transaksi">
      <n-space vertical>
        <n-radio-group v-model:value="diskonType" size="medium">
          <n-radio value="persen">Persen (%)</n-radio>
          <n-radio value="nominal">Nominal (Rp)</n-radio>
        </n-radio-group>
        <n-input-number
          v-if="diskonType === 'persen'"
          v-model:value="diskonValue"
          :min="0" :max="100"
          placeholder="Diskon %"
          size="large"
          style="width: 100%"
        />
        <n-input-number
          v-else
          v-model:value="diskonValue"
          :min="0"
          placeholder="Diskon Rp"
          size="large"
          style="width: 100%"
        >
          <template #prefix>Rp</template>
        </n-input-number>
      </n-space>
      <template #action>
        <n-button type="primary" @click="applyDiskonTransaksi">Terapkan</n-button>
      </template>
    </n-modal>

    <!-- Modal Diskon Item -->
    <n-modal v-model:show="showDiskonItemModal" preset="dialog" title="Diskon Item">
      <n-space vertical>
        <n-radio-group v-model:value="diskonItemType" size="medium">
          <n-radio value="persen">Persen (%)</n-radio>
          <n-radio value="nominal">Nominal (Rp)</n-radio>
        </n-radio-group>
        <n-input-number
          v-if="diskonItemType === 'persen'"
          v-model:value="diskonItemValue"
          :min="0" :max="100"
          placeholder="Diskon %"
          size="large"
          style="width: 100%"
        />
        <n-input-number
          v-else
          v-model:value="diskonItemValue"
          :min="0"
          placeholder="Diskon Rp"
          size="large"
          style="width: 100%"
        >
          <template #prefix>Rp</template>
        </n-input-number>
      </n-space>
      <template #action>
        <n-button type="primary" @click="applyDiskonItem">Terapkan</n-button>
      </template>
    </n-modal>

    <!-- Modal Bayar -->
    <n-modal v-model:show="showPayment" :mask-closable="false" style="width: 500px">
      <n-card title="💰 Pembayaran" :bordered="false" size="huge">
        <div class="payment-total">
          <span>TOTAL</span>
          <span class="price-huge">{{ formatCurrency(cartStore.total) }}</span>
        </div>

        <n-divider />

        <n-space vertical size="large">
          <div>
            <label style="font-weight: 600; margin-bottom: 8px; display: block">Metode Bayar</label>
            <n-radio-group v-model:value="metodeBayar" size="large">
              <n-space>
                <n-radio value="tunai">💵 Tunai</n-radio>
                <n-radio
                  v-for="nt in nonTunaiList"
                  :key="nt.id"
                  :value="nt.nama"
                >
                  💳 {{ nt.nama }}
                </n-radio>
              </n-space>
            </n-radio-group>
          </div>

          <!-- Input Tunai -->
          <div v-if="metodeBayar === 'tunai'">
            <label style="font-weight: 600; margin-bottom: 8px; display: block">Nominal Bayar</label>
            <n-input-number
              v-model:value="nominalBayar"
              :min="0"
              size="large"
              placeholder="Masukkan nominal"
              style="width: 100%; font-size: 24px"
              :show-button="false"
            >
              <template #prefix>Rp</template>
            </n-input-number>

            <div v-if="kembalian >= 0" class="kembalian-box">
              <span>KEMBALIAN</span>
              <span class="kembalian-display">{{ formatCurrency(kembalian) }}</span>
            </div>
            <div v-else-if="nominalBayar > 0" class="kurang-box">
              <span>KURANG</span>
              <span style="font-size: 48px; font-weight: 800; color: #d03050">{{ formatCurrency(Math.abs(kembalian)) }}</span>
            </div>
          </div>
        </n-space>

        <template #footer>
          <n-space justify="space-between" style="width: 100%">
            <n-button @click="showPayment = false" size="large">Batal (Esc)</n-button>
            <n-button
              type="primary"
              size="large"
              :disabled="!canConfirmPayment"
              :loading="processing"
              @click="confirmPayment"
              style="min-width: 200px; height: 56px; font-size: 18px; font-weight: 700"
            >
              ✅ KONFIRMASI BAYAR (Enter)
            </n-button>
          </n-space>
        </template>
      </n-card>
    </n-modal>

  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useMessage, useDialog } from 'naive-ui'
import { useCartStore } from '../stores/cart'
import { useSettingsStore } from '../stores/settings'
import { useProductsStore } from '../stores/products'
import { useAuthStore } from '../stores/auth'
import { useKasStore } from '../stores/kas'
import { formatCurrency } from '../utils/formatCurrency'
import { generateNoTransaksi } from '../utils/generateNoTransaksi'
import { generateReceiptHTML } from '../utils/receiptGenerator'
import {
  SearchOutline,
  GridOutline,
  ListOutline,
  CubeOutline,
  TrashOutline
} from '@vicons/ionicons5'

const message = useMessage()
const dialog = useDialog()
const cartStore = useCartStore()
const settingsStore = useSettingsStore()
const productsStore = useProductsStore()
const authStore = useAuthStore()
const kasStore = useKasStore()

const searchInput = ref(null)
const searchQuery = ref('')
const selectedKategori = ref(null)
const viewMode = ref('grid')

// Payment
const showPayment = ref(false)
const metodeBayar = ref('tunai')
const nominalBayar = ref(0)
const processing = ref(false)
const showPrintConfirm = ref(false)
const lastNoTransaksi = ref('')
const lastTransaksiData = ref(null)
const printOff = ref(false)

// Cart selection (untuk shortcut +/-/Delete/Arrow)
const selectedCartIndex = ref(-1)

watch(() => cartStore.items.length, (len) => {
  if (len === 0) {
    selectedCartIndex.value = -1
  } else if (selectedCartIndex.value === -1 || selectedCartIndex.value >= len) {
    selectedCartIndex.value = len - 1
  }
})

// Diskon
const showDiskonModal = ref(false)
const diskonType = ref('persen')
const diskonValue = ref(0)
const showDiskonItemModal = ref(false)
const diskonItemType = ref('persen')
const diskonItemValue = ref(0)
const editingDiskonIndex = ref(-1)

// Data
const kategoriList = ref([])
const nonTunaiList = ref([])

const filteredProducts = computed(() => {
  let products = productsStore.products.filter(p => p.aktif === 1)

  if (selectedKategori.value) {
    products = products.filter(p => p.kategori_id === selectedKategori.value)
  }

  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    products = products.filter(p =>
      p.nama.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.toLowerCase().includes(q)) ||
        (p.kode_produk && p.kode_produk.toLowerCase().includes(q))
    )
  }

  return products
})

const kembalian = computed(() => {
  if (metodeBayar.value !== 'tunai') return 0
  return nominalBayar.value - cartStore.total
})

const canConfirmPayment = computed(() => {
  if (cartStore.items.length === 0) return false
  if (metodeBayar.value === 'tunai') {
    return nominalBayar.value >= cartStore.total
  }
  return true
})

function roundUp(val) {
  if (val <= 1000) return Math.ceil(val / 100) * 100
  if (val <= 10000) return Math.ceil(val / 1000) * 1000
  if (val <= 100000) return Math.ceil(val / 5000) * 5000
  return Math.ceil(val / 10000) * 10000
}

function addToCart(prod) {
  if (prod.stok === 0) {
    message.warning('Stok habis!')
    return
  }
  const success = cartStore.addItem({
    produk_id: prod.id,
    nama: prod.nama,
    harga: prod.harga,
    stok: prod.stok,
    satuan: prod.satuan
  })
  if (!success) {
    message.warning(`Stok tidak cukup! Maks: ${prod.stok} ${prod.satuan || 'pcs'}`)
  }
  nextTick(() => searchInput.value?.focus())
}

async function handleBarcodeEnter() {
  if (!searchQuery.value) return
  const prod = await window.api.produk.getByBarcode(searchQuery.value.trim())
  if (prod) {
    addToCart(prod)
    searchQuery.value = ''
  }
}

function clearCart() {
  if (cartStore.items.length === 0) return
  dialog.warning({
    title: 'Hapus Semua Item?',
    content: `${cartStore.items.length} item akan dihapus dari keranjang.`,
    positiveText: 'Ya, Hapus',
    negativeText: 'Batal',
    onPositiveClick: () => {
      cartStore.clearCart()
      message.info('Keranjang dikosongkan')
    }
  })
}

function editDiskonItem(index) {
  editingDiskonIndex.value = index
  const item = cartStore.items[index]
  diskonItemType.value = item.diskonPersen > 0 ? 'persen' : 'nominal'
  diskonItemValue.value = item.diskonPersen > 0 ? item.diskonPersen : item.diskonNominal
  showDiskonItemModal.value = true
}

function applyDiskonItem() {
  if (editingDiskonIndex.value < 0) return
  if (diskonItemType.value === 'persen') {
    cartStore.setItemDiskon(editingDiskonIndex.value, diskonItemValue.value, 0)
  } else {
    cartStore.setItemDiskon(editingDiskonIndex.value, 0, diskonItemValue.value)
  }
  showDiskonItemModal.value = false
}

function applyDiskonTransaksi() {
  if (diskonType.value === 'persen') {
    cartStore.setTransaksiDiskon(diskonValue.value, 0)
  } else {
    cartStore.setTransaksiDiskon(0, diskonValue.value)
  }
  showDiskonModal.value = false
}

async function confirmPayment() {
  processing.value = true
  try {
    const noTrx = generateNoTransaksi()
    const data = {
      no_transaksi: noTrx,
      subtotal: cartStore.subtotal,
      diskon_persen: cartStore.diskonTransaksiPersen,
      diskon_nominal: cartStore.totalDiskon,
      pajak_persen: settingsStore.pajakPersen,
      pajak_nominal: cartStore.pajakNominal,
      total: cartStore.total,
      metode_bayar: metodeBayar.value,
      bayar: metodeBayar.value === 'tunai' ? nominalBayar.value : cartStore.total,
      kembalian: metodeBayar.value === 'tunai' ? kembalian.value : 0,
      nama_kasir: authStore.namaKasir,
      items: cartStore.items.map(item => ({
        produk_id: item.produk_id,
        nama_produk: item.nama,
        harga_satuan: item.harga,
        qty: item.qty,
        diskon_item_persen: item.diskonPersen || 0,
        diskon_item_nominal: item.diskonNominal || 0,
        subtotal: item.subtotalAfterDiskon
      }))
    }

    const trxId = await window.api.transaksi.create(data)
    // Fetch full data including items for receipt
    lastTransaksiData.value = await window.api.transaksi.getById(trxId)
    lastNoTransaksi.value = noTrx
    showPayment.value = false
    message.success(`Transaksi berhasil! ${noTrx}`)

    if (printOff.value) {
      // Toggle Print Off: langsung selesai tanpa cetak
      await finishTransaction(false)
    } else {
      // Toggle Print On: langsung cetak tanpa tanya
      await finishTransaction(true)
    }

    // Reload products for updated stock
    await productsStore.loadProducts()
    await productsStore.loadStokMenipisCount()
  } catch (e) {
    message.error('Gagal menyimpan transaksi: ' + e.message)
  }
  processing.value = false
}

async function finishTransaction(cetakStruk) {
  if (cetakStruk && lastTransaksiData.value) {
    await cetakStruk_(lastTransaksiData.value)
  }
  showPrintConfirm.value = false
  cartStore.clearCart()
  nominalBayar.value = 0
  metodeBayar.value = 'tunai'
  diskonValue.value = 0
  lastTransaksiData.value = null
}

async function cetakStruk_(trxData) {
  try {
    const settings = settingsStore.allSettings
    let logoBase64 = null

    // Konversi logo ke grayscale base64 jika ada
    if (settings.logo_path && settings.tampil_logo_struk === '1') {
      try {
        logoBase64 = await window.api.image.toGrayscale(settings.logo_path)
      } catch (e) {
        // Logo tidak wajib, lanjut tanpa logo
      }
    }

    const html = generateReceiptHTML(trxData, settings, logoBase64)
    await window.api.print.receipt(html, settings.nama_printer || undefined)
    message.success('Struk berhasil dicetak')
  } catch (e) {
    message.error('Gagal cetak struk: ' + (e.message || e))
  }
}

// Cetak ulang struk terakhir (F4)
async function cetakUlang() {
  if (!lastTransaksiData.value) {
    message.warning('Tidak ada struk untuk dicetak ulang')
    return
  }
  await cetakStruk_(lastTransaksiData.value)
}

// Keyboard shortcuts
function handleKeydown(e) {
  // Abaikan shortcut cart jika sedang fokus di input/textarea
  const inInput = ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)

  if (e.key === 'F1') {
    e.preventDefault()
    searchInput.value?.focus()
  }
  if (e.key === 'F2') {
    e.preventDefault()
    if (cartStore.items.length > 0 && kasStore.sudahBuka) showPayment.value = true
    else if (!kasStore.sudahBuka) message.warning('Buka kas terlebih dahulu sebelum bertransaksi.')
  }
  if (e.key === 'F3') {
    e.preventDefault()
    clearCart()
  }
  if (e.key === 'F4') {
    e.preventDefault()
    cetakUlang()
  }
  if (e.key === 'Escape') {
    showPayment.value = false
    showDiskonModal.value = false
    showDiskonItemModal.value = false
  }
  if (e.key === 'Enter' && showPayment.value && canConfirmPayment.value) {
    e.preventDefault()
    confirmPayment()
  }

  // Navigasi & edit cart (hanya saat tidak di input dan tidak ada modal terbuka)
  if (!showPayment.value && !showDiskonModal.value && !showDiskonItemModal.value && !inInput) {
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (selectedCartIndex.value > 0) selectedCartIndex.value--
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (selectedCartIndex.value < cartStore.items.length - 1) selectedCartIndex.value++
    }
    if ((e.key === '+' || e.key === '=') && selectedCartIndex.value >= 0) {
      e.preventDefault()
      cartStore.increaseQty(selectedCartIndex.value)
    }
    if (e.key === '-' && selectedCartIndex.value >= 0) {
      e.preventDefault()
      cartStore.decreaseQty(selectedCartIndex.value)
    }
    if (e.key === 'Delete' && selectedCartIndex.value >= 0) {
      e.preventDefault()
      const idx = selectedCartIndex.value
      cartStore.removeItem(idx)
      const len = cartStore.items.length
      selectedCartIndex.value = len > 0 ? Math.min(idx, len - 1) : -1
    }
  }
}

onMounted(async () => {
  window.addEventListener('keydown', handleKeydown)
  await settingsStore.loadSettings()
  cartStore.setPajakPersen(settingsStore.pajakPersen)
  await productsStore.loadProducts()
  kategoriList.value = await window.api.kategori.getAll()
  nonTunaiList.value = (await window.api.nontunai.getAll()).filter(n => n.aktif === 1)
  await nextTick()
  searchInput.value?.focus()
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
.kasir-container {
  display: flex;
  height: 100%;
}

.kasir-products {
  flex: 1;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #e8e8e8;
  background: #fff;
}

.products-header {
  padding: 12px;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.kategori-list {
  display: flex;
  gap: 4px;
  white-space: nowrap;
  padding: 2px 0;
}

.view-toggle {
  display: flex;
  justify-content: flex-end;
}

/* Grid View */
.products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 8px;
  padding: 12px;
}

.product-card {
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  cursor: pointer;
  overflow: hidden;
  transition: all 0.15s;
}

.product-card:hover {
  border-color: #18a058;
  box-shadow: 0 2px 8px rgba(24, 160, 88, 0.15);
}

.product-card.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.product-img {
  height: 100px;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.product-img img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.product-img-placeholder {
  color: #ccc;
}

.product-info {
  padding: 8px;
}

.product-name {
  font-weight: 600;
  font-size: 13px;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.product-price {
  font-weight: 700;
  color: #18a058;
  font-size: 15px;
  margin-bottom: 4px;
}

/* List View */
.products-list {
  padding: 8px 12px;
}

.product-list-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  border-radius: 6px;
}

.product-list-item:hover {
  background: #f0faf4;
}

.product-list-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.product-list-img {
  width: 48px;
  height: 48px;
  border-radius: 6px;
  overflow: hidden;
  flex-shrink: 0;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.product-list-img img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.product-img-placeholder-sm {
  color: #ccc;
}

.product-list-info {
  flex: 1;
  min-width: 0;
}

.product-desc {
  font-size: 12px;
  color: #999;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.product-list-right {
  text-align: right;
  flex-shrink: 0;
}

/* Cart */
.kasir-cart {
  width: 380px;
  display: flex;
  flex-direction: column;
  background: #fff;
  flex-shrink: 0;
}

.cart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
}

.cart-badge {
  display: inline-block;
  background: #18a058;
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  padding: 1px 7px;
  border-radius: 10px;
  margin-left: 6px;
  vertical-align: middle;
}

.cart-items {
  flex: 1;
  min-height: 0;
}

.cart-empty {
  text-align: center;
  padding: 40px 20px;
  color: #999;
}

.cart-hint {
  font-size: 12px;
  margin-top: 4px;
}

.cart-item {
  padding: 10px 16px;
  border-bottom: 1px solid #f8f8f8;
  cursor: pointer;
  transition: background 0.1s;
}

.cart-item.selected {
  background: #f0faf4;
  border-left: 3px solid #18a058;
  padding-left: 13px;
}

.cart-item-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.cart-item-no {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  background: #18a058;
  color: #fff;
  border-radius: 50%;
  font-size: 11px;
  font-weight: 700;
  flex-shrink: 0;
  margin-right: 6px;
}

.cart-item-name {
  font-weight: 600;
  font-size: 13px;
  flex: 1;
}

.cart-item-detail {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 6px;
}

.cart-item-qty {
  display: flex;
  align-items: center;
  gap: 4px;
}

.cart-item-price {
  font-weight: 700;
  font-size: 14px;
}

.cart-item-diskon {
  font-size: 12px;
  color: #d03050;
  margin-top: 2px;
}

/* Cart Summary */
.cart-summary {
  padding: 12px 16px;
  border-top: 2px solid #e8e8e8;
  background: #fafafa;
}

.cart-summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
  font-size: 14px;
}

.text-red {
  color: #d03050;
}

.print-off-row {
  display: flex;
  align-items: center;
  padding: 6px 0 4px;
  border-top: 1px dashed #e0e0e0;
  margin-top: 4px;
}

.cart-summary-total {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-top: 1px solid #e0e0e0;
  margin-top: 4px;
  font-weight: 800;
  font-size: 18px;
}

/* Payment Modal */
.payment-total {
  text-align: center;
  padding: 16px 0;
}

.payment-total span:first-child {
  display: block;
  font-size: 16px;
  color: #666;
  margin-bottom: 4px;
}

.quick-cash {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 12px;
}

.kembalian-box, .kurang-box {
  text-align: center;
  margin-top: 16px;
  padding: 16px;
  border-radius: 12px;
}

.kembalian-box {
  background: #f0faf4;
}

.kurang-box {
  background: #fff1f0;
}

.kembalian-box span:first-child,
.kurang-box span:first-child {
  display: block;
  font-size: 14px;
  color: #666;
  margin-bottom: 4px;
}
</style>
