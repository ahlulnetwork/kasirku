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
    delete: (id) => ipcRenderer.invoke('db:kategori:delete', id),
    setDefault: (id) => ipcRenderer.invoke('db:kategori:setDefault', id)
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
    statusHariIni: () => ipcRenderer.invoke('db:kas:statusHariIni'),
    rekap: () => ipcRenderer.invoke('db:kas:rekap')
  },

  // Transaksi
  transaksi: {
    create: (data) => ipcRenderer.invoke('db:transaksi:create', data),
    getAll: (filters, actor) => ipcRenderer.invoke('db:transaksi:getAll', filters, actor),
    getKasirList: (actor) => ipcRenderer.invoke('db:transaksi:getKasirList', actor),
    getById: (id) => ipcRenderer.invoke('db:transaksi:getById', id),
    update: (id, data) => ipcRenderer.invoke('db:transaksi:update', id, data),
    delete: (id) => ipcRenderer.invoke('db:transaksi:delete', id),
    summary: (filters, actor) => ipcRenderer.invoke('db:transaksi:summary', filters, actor)
  },

  // Print
  print: {
    receipt: (html, printerName, paperWidth) => ipcRenderer.invoke('print:receipt', html, printerName, paperWidth),
    receiptRaw: (transaksi, settings) => ipcRenderer.invoke('print:receipt:raw', transaksi, settings),
    testPrint: (printerName) => ipcRenderer.invoke('print:test', printerName)
  },

  // Image
  image: {
    compressProduct: (sourcePath) => ipcRenderer.invoke('image:compressProduct', sourcePath)
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
  },

  // Aktivasi
  activation: {
    getDeviceId: () => ipcRenderer.invoke('activation:getDeviceId'),
    checkStatus: () => ipcRenderer.invoke('activation:checkStatus'),
    activate: (licenseKey) => ipcRenderer.invoke('activation:activate', licenseKey),
    checkAdminPass: (adminPass) => ipcRenderer.invoke('activation:checkAdminPass', adminPass),
    generateKey: (deviceId) => ipcRenderer.invoke('activation:generateKey', deviceId)
  },

  // Users
  users: {
    getAll: () => ipcRenderer.invoke('db:users:getAll'),
    login: (username, password) => ipcRenderer.invoke('db:users:login', username, password),
    create: (data) => ipcRenderer.invoke('db:users:create', data),
    update: (id, data) => ipcRenderer.invoke('db:users:update', id, data),
    changePassword: (id, oldPass, newPass) => ipcRenderer.invoke('db:users:changePassword', id, oldPass, newPass),
    resetPassword: (id, newPass) => ipcRenderer.invoke('db:users:resetPassword', id, newPass),
    delete: (id) => ipcRenderer.invoke('db:users:delete', id),
    isFirstRun: () => ipcRenderer.invoke('db:users:isFirstRun'),
    firstRunSetup: (data) => ipcRenderer.invoke('db:users:firstRunSetup', data)
  }
})
