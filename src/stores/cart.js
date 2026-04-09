import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useCartStore = defineStore('cart', () => {
  const items = ref([])
  const diskonTransaksiPersen = ref(0)
  const diskonTransaksiNominal = ref(0)

  const subtotal = computed(() => {
    return items.value.reduce((sum, item) => sum + item.subtotalAfterDiskon, 0)
  })

  const totalDiskonItems = computed(() => {
    return items.value.reduce((sum, item) => {
      const hargaTotal = item.harga * item.qty
      return sum + (hargaTotal - item.subtotalAfterDiskon)
    }, 0)
  })

  const diskonTransaksiCalc = computed(() => {
    if (diskonTransaksiPersen.value > 0) {
      return subtotal.value * (diskonTransaksiPersen.value / 100)
    }
    return diskonTransaksiNominal.value
  })

  const totalDiskon = computed(() => {
    return totalDiskonItems.value + diskonTransaksiCalc.value
  })

  const subtotalAfterDiskon = computed(() => {
    return subtotal.value - diskonTransaksiCalc.value
  })

  // Pajak diset dari luar (Kasir.vue) untuk hindari circular import
  const pajakPersen = ref(0)

  function setPajakPersen(val) {
    pajakPersen.value = val
  }

  const pajakNominal = computed(() => {
    return subtotalAfterDiskon.value * (pajakPersen.value / 100)
  })

  const total = computed(() => {
    return subtotalAfterDiskon.value + pajakNominal.value
  })

  function addItem(product) {
    const existing = items.value.find(i => i.produk_id === product.produk_id)
    if (existing) {
      // Check stok
      if (product.stok !== -1 && existing.qty >= product.stok) {
        return false
      }
      existing.qty++
      recalcItem(existing)
    } else {
      items.value.push({
        produk_id: product.produk_id,
        nama: product.nama,
        harga: product.harga,
        stok: product.stok,
        satuan: product.satuan,
        qty: 1,
        diskonPersen: 0,
        diskonNominal: 0,
        subtotalAfterDiskon: product.harga
      })
    }
    return true
  }

  function removeItem(index) {
    items.value.splice(index, 1)
  }

  function increaseQty(index) {
    const item = items.value[index]
    if (item.stok !== -1 && item.qty >= item.stok) return
    item.qty++
    recalcItem(item)
  }

  function decreaseQty(index) {
    const item = items.value[index]
    if (item.qty <= 1) {
      removeItem(index)
      return
    }
    item.qty--
    recalcItem(item)
  }

  function setQty(index, qty) {
    const item = items.value[index]
    if (qty < 1) qty = 1
    if (item.stok !== -1 && qty > item.stok) qty = item.stok
    item.qty = qty
    recalcItem(item)
  }

  function setItemDiskon(index, persen, nominal) {
    const item = items.value[index]
    item.diskonPersen = persen
    item.diskonNominal = nominal
    recalcItem(item)
  }

  function recalcItem(item) {
    const hargaTotal = item.harga * item.qty
    let diskon = 0
    if (item.diskonPersen > 0) {
      diskon = hargaTotal * (item.diskonPersen / 100)
    } else {
      diskon = item.diskonNominal * item.qty
    }
    item.subtotalAfterDiskon = hargaTotal - diskon
  }

  function setTransaksiDiskon(persen, nominal) {
    diskonTransaksiPersen.value = persen
    diskonTransaksiNominal.value = nominal
  }

  function clearCart() {
    items.value = []
    diskonTransaksiPersen.value = 0
    diskonTransaksiNominal.value = 0
  }

  return {
    items,
    subtotal,
    totalDiskon,
    totalDiskonItems,
    diskonTransaksiPersen,
    diskonTransaksiNominal,
    diskonTransaksiCalc,
    pajakPersen,
    pajakNominal,
    total,
    addItem,
    removeItem,
    increaseQty,
    decreaseQty,
    setQty,
    setItemDiskon,
    setTransaksiDiskon,
    setPajakPersen,
    clearCart
  }
})
