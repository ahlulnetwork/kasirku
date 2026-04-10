const { app, BrowserWindow, ipcMain, dialog, protocol, net } = require('electron')
const path = require('path')
const fs = require('fs')

// Handlers
const { initDatabase } = require('./handlers/database')
const { registerPrintHandlers } = require('./handlers/print')
const { registerBackupHandlers } = require('./handlers/backup')
const { registerImageHandlers } = require('./handlers/image')
const { registerActivationHandlers } = require('./handlers/activation')
const { registerUserHandlers } = require('./handlers/users')

const isDev = process.env.NODE_ENV === 'development'

// Data directory - in production use userData, in dev use project/data
const dataDir = isDev
  ? path.join(__dirname, '..', 'data')
  : path.join(app.getPath('userData'), 'data')

const imagesDir = path.join(dataDir, 'images')
const logoDir = path.join(imagesDir, 'logo')
const productsDir = path.join(imagesDir, 'products')
const activationFile = isDev
  ? path.join(__dirname, '..', 'data', 'activation.json')
  : path.join(app.getPath('userData'), 'activation.json')

// Ensure directories exist
;[dataDir, imagesDir, logoDir, productsDir].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
})

// Register custom media:// protocol to serve local image files in renderer
// (file:// is blocked when app loads from http://localhost:5173 in dev mode)
protocol.registerSchemesAsPrivileged([
  { scheme: 'media', privileges: { bypassCSP: true, stream: true, supportFetchAPI: true } }
])

let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    title: 'KasirKu',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    },
    autoHideMenuBar: true,
    show: false
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
    mainWindow.maximize()
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
    // Blokir semua cara membuka DevTools di production
    mainWindow.webContents.on('before-input-event', (event, input) => {
      if (
        input.key === 'F12' ||
        (input.control && input.shift && input.key === 'I') ||
        (input.control && input.shift && input.key === 'J') ||
        (input.control && input.shift && input.key === 'C') ||
        (input.control && input.key === 'U')
      ) {
        event.preventDefault()
      }
    })
    mainWindow.webContents.on('devtools-opened', () => {
      mainWindow.webContents.closeDevTools()
    })
  }
}

app.whenReady().then(() => {
  // Serve local image files via media:// protocol
  // Linux: /home/... → file:///home/...  |  Windows: C:/Users/... → file:///C:/Users/...
  protocol.handle('media', (request) => {
    let filePath = decodeURIComponent(request.url.replace('media://', ''))
    filePath = filePath.replace(/\\/g, '/')  // normalize Windows backslashes to forward slashes
    const url = filePath.startsWith('/') ? `file://${filePath}` : `file:///${filePath}`
    return net.fetch(url)
  })

  // Initialize database
  const db = initDatabase(dataDir)

  // Create window first
  createWindow()

  // Register handlers — pass getter so mainWindow is always current
  registerPrintHandlers(() => mainWindow)
  registerBackupHandlers(dataDir, db)
  registerImageHandlers(dataDir)
  registerActivationHandlers(activationFile)
  registerUserHandlers(db)

  // Database IPC handlers
  registerDatabaseHandlers(db)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// ===== DATABASE IPC HANDLERS =====
function registerDatabaseHandlers(db) {

  // --- Settings ---
  ipcMain.handle('db:settings:get', (event, key) => {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key)
    return row ? row.value : null
  })

  ipcMain.handle('db:settings:set', (event, key, value) => {
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value)
    return true
  })

  ipcMain.handle('db:settings:getAll', () => {
    const rows = db.prepare('SELECT key, value FROM settings').all()
    const settings = {}
    rows.forEach(r => settings[r.key] = r.value)
    return settings
  })

  // --- Non Tunai ---
  ipcMain.handle('db:nontunai:getAll', () => {
    return db.prepare('SELECT * FROM non_tunai ORDER BY urutan ASC').all()
  })

  ipcMain.handle('db:nontunai:create', (event, data) => {
    const maxUrutan = db.prepare('SELECT MAX(urutan) as max FROM non_tunai').get()
    const urutan = (maxUrutan.max || 0) + 1
    const result = db.prepare('INSERT INTO non_tunai (nama, aktif, urutan) VALUES (?, 1, ?)').run(data.nama, urutan)
    return result.lastInsertRowid
  })

  ipcMain.handle('db:nontunai:update', (event, id, data) => {
    db.prepare('UPDATE non_tunai SET nama = ?, aktif = ? WHERE id = ?').run(data.nama, data.aktif, id)
    return true
  })

  ipcMain.handle('db:nontunai:delete', (event, id) => {
    db.prepare('DELETE FROM non_tunai WHERE id = ?').run(id)
    return true
  })

  ipcMain.handle('db:nontunai:reorder', (event, items) => {
    const stmt = db.prepare('UPDATE non_tunai SET urutan = ? WHERE id = ?')
    const transaction = db.transaction((items) => {
      items.forEach((item, index) => stmt.run(index + 1, item.id))
    })
    transaction(items)
    return true
  })

  // --- Kategori ---
  ipcMain.handle('db:kategori:getAll', () => {
    return db.prepare('SELECT * FROM kategori ORDER BY urutan ASC').all()
  })

  ipcMain.handle('db:kategori:create', (event, data) => {
    const maxUrutan = db.prepare('SELECT MAX(urutan) as max FROM kategori').get()
    const urutan = (maxUrutan.max || 0) + 1
    const result = db.prepare('INSERT INTO kategori (nama, urutan) VALUES (?, ?)').run(data.nama, urutan)
    return result.lastInsertRowid
  })

  ipcMain.handle('db:kategori:update', (event, id, data) => {
    db.prepare('UPDATE kategori SET nama = ? WHERE id = ?').run(data.nama, id)
    return true
  })

  ipcMain.handle('db:kategori:setDefault', (event, id) => {
    db.prepare('UPDATE kategori SET is_default = 0').run()
    if (id) db.prepare('UPDATE kategori SET is_default = 1 WHERE id = ?').run(id)
    return true
  })

  ipcMain.handle('db:kategori:delete', (event, id) => {
    const count = db.prepare('SELECT COUNT(*) as c FROM produk WHERE kategori_id = ? AND aktif = 1').get(id)
    if (count.c > 0) {
      return { error: 'Tidak bisa hapus kategori yang masih memiliki produk aktif' }
    }
    db.prepare('DELETE FROM kategori WHERE id = ?').run(id)
    return true
  })

  // --- Produk ---
  ipcMain.handle('db:produk:getAll', (event, filters) => {
    let sql = 'SELECT p.*, k.nama as kategori_nama FROM produk p LEFT JOIN kategori k ON p.kategori_id = k.id WHERE 1=1'
    const params = []

    if (filters?.kategori_id) {
      sql += ' AND p.kategori_id = ?'
      params.push(filters.kategori_id)
    }
    if (filters?.aktif !== undefined) {
      sql += ' AND p.aktif = ?'
      params.push(filters.aktif)
    }
    if (filters?.search) {
      sql += ' AND (p.nama LIKE ? OR p.barcode LIKE ? OR p.kode_produk LIKE ?)'
      params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`)
    }
    if (filters?.stokMenipis) {
      sql += ' AND p.stok != -1 AND p.stok <= p.stok_minimum'
    }

    sql += ' ORDER BY p.nama ASC'
    return db.prepare(sql).all(...params)
  })

  ipcMain.handle('db:produk:getById', (event, id) => {
    return db.prepare('SELECT p.*, k.nama as kategori_nama FROM produk p LEFT JOIN kategori k ON p.kategori_id = k.id WHERE p.id = ?').get(id)
  })

  ipcMain.handle('db:produk:getByBarcode', (event, barcode) => {
    return db.prepare('SELECT p.*, k.nama as kategori_nama FROM produk p LEFT JOIN kategori k ON p.kategori_id = k.id WHERE (p.barcode = ? OR p.kode_produk = ?) AND p.aktif = 1').get(barcode, barcode)
  })

  ipcMain.handle('db:produk:create', (event, data) => {
    const hargaJual = data.harga_jual ?? data.harga ?? 0
    const hargaBeli = data.harga_beli ?? 0
    const barcode = (data.barcode || '').trim() || null
    const result = db.prepare(
      `INSERT INTO produk (kode_produk, nama, kategori_id, foto_path, harga, harga_beli, harga_jual, deskripsi, barcode, stok, stok_minimum, satuan, aktif)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`
    ).run(data.kode_produk || null, data.nama, data.kategori_id, data.foto_path || null, hargaJual, hargaBeli, hargaJual, data.deskripsi || null, barcode, data.stok, data.stok_minimum || 5, data.satuan || 'pcs')
    return result.lastInsertRowid
  })

  ipcMain.handle('db:produk:update', (event, id, data) => {
    const hargaJual = data.harga_jual ?? data.harga ?? 0
    const hargaBeli = data.harga_beli ?? 0
    const barcode = (data.barcode || '').trim() || null
    db.prepare(
      `UPDATE produk SET kode_produk=?, nama=?, kategori_id=?, foto_path=?, harga=?, harga_beli=?, harga_jual=?, deskripsi=?, barcode=?, stok=?, stok_minimum=?, satuan=?, aktif=? WHERE id=?`
    ).run(data.kode_produk || null, data.nama, data.kategori_id, data.foto_path || null, hargaJual, hargaBeli, hargaJual, data.deskripsi || null, barcode, data.stok, data.stok_minimum || 5, data.satuan || 'pcs', data.aktif, id)
    return true
  })

  ipcMain.handle('db:produk:delete', (event, id) => {
    db.prepare('DELETE FROM produk WHERE id = ?').run(id)
    return true
  })

  ipcMain.handle('db:produk:updateStok', (event, id, qty) => {
    db.prepare('UPDATE produk SET stok = stok - ? WHERE id = ? AND stok != -1').run(qty, id)
    return true
  })

  ipcMain.handle('db:produk:countStokMenipis', () => {
    const row = db.prepare('SELECT COUNT(*) as c FROM produk WHERE aktif = 1 AND stok != -1 AND stok <= stok_minimum').get()
    return row.c
  })

  // --- Kas ---
  ipcMain.handle('db:kas:buka', (event, saldo, catatan) => {
    const result = db.prepare("INSERT INTO kas (tipe, saldo, catatan, created_at) VALUES (?, ?, ?, datetime('now', 'localtime'))").run('buka', saldo, catatan || '')
    return result.lastInsertRowid
  })

  ipcMain.handle('db:kas:tutup', (event, saldo, catatan) => {
    const result = db.prepare("INSERT INTO kas (tipe, saldo, catatan, created_at) VALUES (?, ?, ?, datetime('now', 'localtime'))").run('tutup', saldo, catatan || '')
    return result.lastInsertRowid
  })

  ipcMain.handle('db:kas:statusHariIni', () => {
    const today = new Date().toISOString().split('T')[0]
    const buka = db.prepare("SELECT * FROM kas WHERE tipe = 'buka' AND date(created_at) = ? ORDER BY id DESC LIMIT 1").get(today)
    const tutup = db.prepare("SELECT * FROM kas WHERE tipe = 'tutup' AND date(created_at) = ? ORDER BY id DESC LIMIT 1").get(today)
    // sudahTutup hanya true jika record tutup lebih baru daripada record buka terakhir
    const sudahTutup = !!(tutup && buka && tutup.id > buka.id)
    return { buka, tutup, sudahBuka: !!buka, sudahTutup }
  })

  ipcMain.handle('db:kas:rekap', () => {
    const today = new Date().toISOString().split('T')[0]
    const buka = db.prepare("SELECT * FROM kas WHERE tipe = 'buka' AND date(created_at) = ? ORDER BY id DESC LIMIT 1").get(today)
    const saldo_awal = buka ? (buka.saldo || 0) : 0
    const totalTunai = db.prepare("SELECT COALESCE(SUM(total), 0) as total FROM transaksi WHERE metode_bayar = 'tunai' AND date(tanggal) = ?").get(today)
    const totalNonTunai = db.prepare("SELECT COALESCE(SUM(total), 0) as total FROM transaksi WHERE metode_bayar != 'tunai' AND date(tanggal) = ?").get(today)
    const totalTransaksi = db.prepare("SELECT COUNT(*) as count FROM transaksi WHERE date(tanggal) = ?").get(today)
    const tunai = totalTunai ? totalTunai.total : 0
    const nonTunai = totalNonTunai ? totalNonTunai.total : 0
    return {
      saldo_awal,
      total_tunai: tunai,
      total_non_tunai: nonTunai,
      total_transaksi: totalTransaksi ? totalTransaksi.count : 0,
      ekspektasi: saldo_awal + tunai
    }
  })

  // --- Transaksi ---
  ipcMain.handle('db:transaksi:create', (event, data) => {
    const trx = db.transaction(() => {
      // Insert transaksi
      const result = db.prepare(
        `INSERT INTO transaksi (no_transaksi, tanggal, subtotal, diskon_persen, diskon_nominal, pajak_persen, pajak_nominal, total, metode_bayar, bayar, kembalian, nama_kasir, catatan)
         VALUES (?, datetime('now','localtime'), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(data.no_transaksi, data.subtotal, data.diskon_persen, data.diskon_nominal, data.pajak_persen, data.pajak_nominal, data.total, data.metode_bayar, data.bayar, data.kembalian, data.nama_kasir, data.catatan || '')

      const transaksiId = result.lastInsertRowid

      // Insert items
      const stmtItem = db.prepare(
        `INSERT INTO transaksi_item (transaksi_id, produk_id, nama_produk, harga_satuan, qty, diskon_item_persen, diskon_item_nominal, subtotal)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )

      const stmtStok = db.prepare('UPDATE produk SET stok = stok - ? WHERE id = ? AND stok != -1')

      for (const item of data.items) {
        stmtItem.run(transaksiId, item.produk_id, item.nama_produk, item.harga_satuan, item.qty, item.diskon_item_persen || 0, item.diskon_item_nominal || 0, item.subtotal)
        stmtStok.run(item.qty, item.produk_id)
      }

      return transaksiId
    })

    return trx()
  })

  function getLockedKasir(actor) {
    if (!actor || actor.role !== 'kasir') return null
    const namaKasir = (actor.nama_kasir || actor.username || '').trim()
    return namaKasir || null
  }

  ipcMain.handle('db:transaksi:getAll', (event, filters = {}, actor = null) => {
    let sql = 'SELECT * FROM transaksi WHERE 1=1'
    const params = []
    const lockedKasir = getLockedKasir(actor)
    const effectiveKasir = lockedKasir || filters.nama_kasir

    if (filters.dari) {
      sql += ' AND date(tanggal) >= ?'
      params.push(filters.dari)
    }
    if (filters.sampai) {
      sql += ' AND date(tanggal) <= ?'
      params.push(filters.sampai)
    }
    if (filters.metode_bayar) {
      sql += ' AND metode_bayar = ?'
      params.push(filters.metode_bayar)
    }
    if (effectiveKasir) {
      sql += ' AND nama_kasir = ?'
      params.push(effectiveKasir)
    }

    sql += ' ORDER BY tanggal DESC'
    return db.prepare(sql).all(...params)
  })

  ipcMain.handle('db:transaksi:getKasirList', (event, actor = null) => {
    const lockedKasir = getLockedKasir(actor)
    if (lockedKasir) return [{ nama_kasir: lockedKasir }]

    return db.prepare("SELECT DISTINCT nama_kasir FROM transaksi WHERE nama_kasir IS NOT NULL AND TRIM(nama_kasir) != '' ORDER BY nama_kasir ASC").all()
  })

  ipcMain.handle('db:transaksi:getById', (event, id) => {
    const transaksi = db.prepare('SELECT * FROM transaksi WHERE id = ?').get(id)
    if (!transaksi) return null
    const items = db.prepare('SELECT * FROM transaksi_item WHERE transaksi_id = ?').all(id)
    return { ...transaksi, items }
  })

  ipcMain.handle('db:transaksi:update', (event, id, data) => {
    db.prepare('UPDATE transaksi SET metode_bayar=?, catatan=?, diskon_persen=?, diskon_nominal=? WHERE id=?')
      .run(data.metode_bayar, data.catatan, data.diskon_persen, data.diskon_nominal, id)
    return true
  })

  ipcMain.handle('db:transaksi:delete', (event, id) => {
    const trx = db.transaction(() => {
      // Kembalikan stok
      const items = db.prepare('SELECT produk_id, qty FROM transaksi_item WHERE transaksi_id = ?').all(id)
      const stmtStok = db.prepare('UPDATE produk SET stok = stok + ? WHERE id = ? AND stok != -1')
      for (const item of items) {
        stmtStok.run(item.qty, item.produk_id)
      }
      db.prepare('DELETE FROM transaksi_item WHERE transaksi_id = ?').run(id)
      db.prepare('DELETE FROM transaksi WHERE id = ?').run(id)
    })
    trx()
    return true
  })

  ipcMain.handle('db:transaksi:summary', (event, filters = {}, actor = null) => {
    let whereClause = 'WHERE 1=1'
    const params = []
    const lockedKasir = getLockedKasir(actor)
    const effectiveKasir = lockedKasir || filters.nama_kasir

    if (filters.dari) {
      whereClause += ' AND date(tanggal) >= ?'
      params.push(filters.dari)
    }
    if (filters.sampai) {
      whereClause += ' AND date(tanggal) <= ?'
      params.push(filters.sampai)
    }
    if (effectiveKasir) {
      whereClause += ' AND nama_kasir = ?'
      params.push(effectiveKasir)
    }

    const total = db.prepare(`SELECT COALESCE(SUM(total),0) as totalPendapatan, COUNT(*) as totalTransaksi, COALESCE(SUM(pajak_nominal),0) as totalPajak, COALESCE(SUM(diskon_nominal),0) as totalDiskon FROM transaksi ${whereClause}`).get(...params)

    const perMetode = db.prepare(`SELECT metode_bayar, COALESCE(SUM(total),0) as total, COUNT(*) as jumlah FROM transaksi ${whereClause} GROUP BY metode_bayar`).all(...params)

    return { ...total, perMetode }
  })

  // --- Printer ---
  ipcMain.handle('system:getPrinters', async () => {
    const win = mainWindow
    if (win) {
      return await win.webContents.getPrintersAsync()
    }
    return []
  })

  // --- Dialog ---
  ipcMain.handle('dialog:openFile', async (event, options) => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: options?.filters || [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp'] }]
    })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle('dialog:saveFile', async (event, options) => {
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: options?.defaultPath,
      filters: options?.filters || [{ name: 'All Files', extensions: ['*'] }]
    })
    return result.canceled ? null : result.filePath
  })

  // --- App info ---
  ipcMain.handle('app:getDataDir', () => dataDir)
  ipcMain.handle('app:getVersion', () => app.getVersion())
}
