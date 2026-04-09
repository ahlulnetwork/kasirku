import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useProductsStore = defineStore('products', () => {
  const products = ref([])
  const stokMenipisCount = ref(0)

  async function loadProducts(filters) {
    products.value = await window.api.produk.getAll(filters || { aktif: 1 })
  }

  async function loadStokMenipisCount() {
    stokMenipisCount.value = await window.api.produk.countStokMenipis()
  }

  return {
    products,
    stokMenipisCount,
    loadProducts,
    loadStokMenipisCount
  }
})
