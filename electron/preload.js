const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  // Settings
  settings: {
    get: (key) => ipcRenderer.invoke('db:settings:get', key),
    set: (key, value) => ipcRenderer.invoke('db:settings:set', key, value),
    getAll: () => ipcRenderer.invoke('db:settings:getAll')
  },

  // Non Tunai
  nontunai: {
    getAll: () => ipcRenderer.invoke('db:nontunai:getAll'),
    create: (data) => ipcRenderer.invoke('db:nontunai:create', data),
    update: (id, data) => ipcRenderer.invoke('db:nontunai:update', id, data),
    delete: (id) => ipcRenderer.invoke('db:nontunai:delete', id),
    reorder: (items) => ipcRenderer.invoke('db:nontunai:reorder', items)
  },

  // Kategori
  kategori: {
    getAll: () => ipcRenderer.invoke('db:kategori:getAll'),
    create: (data) => ipcRenderer.invoke('db:kategori:create', data),
    update: (id, data) => ipcRenderer.invoke('db:kategori:update', id, data),
    delete: (id) => ipcRenderer.invoke('db:kategori:delete', id)
  },

  // Produk
  produk: {
    getAll: (filters) => ipcRenderer.invoke('db:produk:getAll', filters),
    getById: (id) => ipcRenderer.invoke('db:produk:getById', id),
    getByBarcode: (barcode) => ipcRenderer.invoke('db:produk:getByBarcode', barcode),
    create: (data) => ipcRenderer.invoke('db:produk:create', data),
    update: (id, data) => ipcRenderer.invoke('db:produk:update', id, data),
    delete: (id) => ipcRenderer.invoke('db:produk:delete', id),
    updateStok: (id, qty) => ipcRenderer.invoke('db:produk:updateStok', id, qty),
    countStokMenipis: () => ipcRenderer.invoke('db:produk:countStokMenipis')
  },

  // Kas
  kas: {
    buka: (saldo, catatan) => ipcRenderer.invoke('db:kas:buka', saldo, catatan),
    tutup: (saldo, catatan) => ipcRenderer.invoke('db:kas:tutup', saldo, catatan),
    statusHariIni: () => ipcRenderer.invoke('db:kas:statusHariIni')
  },

  // Transaksi
  transaksi: {
    create: (data) => ipcRenderer.invoke('db:transaksi:create', data),
    getAll: (filters) => ipcRenderer.invoke('db:transaksi:getAll', filters),
    getById: (id) => ipcRenderer.invoke('db:transaksi:getById', id),
    update: (id, data) => ipcRenderer.invoke('db:transaksi:update', id, data),
    delete: (id) => ipcRenderer.invoke('db:transaksi:delete', id),
    summary: (filters) => ipcRenderer.invoke('db:transaksi:summary', filters)
  },

  // Print
  print: {
    receipt: (html, printerName) => ipcRenderer.invoke('print:receipt', html, printerName),
    label: (html, printerName) => ipcRenderer.invoke('print:label', html, printerName),
    testPrint: (printerName) => ipcRenderer.invoke('print:test', printerName)
  },

  // Image
  image: {
    compressLogo: (sourcePath) => ipcRenderer.invoke('image:compressLogo', sourcePath),
    compressProduct: (sourcePath) => ipcRenderer.invoke('image:compressProduct', sourcePath),
    toGrayscale: (sourcePath) => ipcRenderer.invoke('image:toGrayscale', sourcePath)
  },

  // Backup
  backup: {
    create: (savePath) => ipcRenderer.invoke('backup:create', savePath),
    restore: (filePath) => ipcRenderer.invoke('backup:restore', filePath),
    getInfo: (filePath) => ipcRenderer.invoke('backup:getInfo', filePath)
  },

  // System
  system: {
    getPrinters: () => ipcRenderer.invoke('system:getPrinters'),
    getDataDir: () => ipcRenderer.invoke('app:getDataDir'),
    getVersion: () => ipcRenderer.invoke('app:getVersion')
  },

  // Dialog
  dialog: {
    openFile: (options) => ipcRenderer.invoke('dialog:openFile', options),
    saveFile: (options) => ipcRenderer.invoke('dialog:saveFile', options)
  }
})
