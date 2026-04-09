const Database = require('better-sqlite3')
const path = require('path')

function initDatabase(dataDir) {
  const dbPath = path.join(dataDir, 'kasirku.db')
  const db = new Database(dbPath)

  // Enable WAL mode for better performance
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS non_tunai (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nama TEXT NOT NULL,
      aktif INTEGER DEFAULT 1,
      urutan INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS kategori (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nama TEXT NOT NULL,
      urutan INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS produk (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nama TEXT NOT NULL,
      kategori_id INTEGER,
      foto_path TEXT,
      harga REAL NOT NULL DEFAULT 0,
      deskripsi TEXT,
      barcode TEXT UNIQUE,
      stok INTEGER DEFAULT 0,
      stok_minimum INTEGER DEFAULT 5,
      satuan TEXT DEFAULT 'pcs',
      aktif INTEGER DEFAULT 1,
      FOREIGN KEY (kategori_id) REFERENCES kategori(id)
    );

    CREATE TABLE IF NOT EXISTS kas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tipe TEXT NOT NULL,
      saldo REAL DEFAULT 0,
      catatan TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS transaksi (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      no_transaksi TEXT UNIQUE NOT NULL,
      tanggal TEXT DEFAULT (datetime('now','localtime')),
      subtotal REAL DEFAULT 0,
      diskon_persen REAL DEFAULT 0,
      diskon_nominal REAL DEFAULT 0,
      pajak_persen REAL DEFAULT 0,
      pajak_nominal REAL DEFAULT 0,
      total REAL DEFAULT 0,
      metode_bayar TEXT DEFAULT 'tunai',
      bayar REAL DEFAULT 0,
      kembalian REAL DEFAULT 0,
      nama_kasir TEXT,
      catatan TEXT
    );

    CREATE TABLE IF NOT EXISTS transaksi_item (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaksi_id INTEGER NOT NULL,
      produk_id INTEGER,
      nama_produk TEXT NOT NULL,
      harga_satuan REAL DEFAULT 0,
      qty INTEGER DEFAULT 1,
      diskon_item_persen REAL DEFAULT 0,
      diskon_item_nominal REAL DEFAULT 0,
      subtotal REAL DEFAULT 0,
      FOREIGN KEY (transaksi_id) REFERENCES transaksi(id)
    );

    CREATE INDEX IF NOT EXISTS idx_produk_barcode ON produk(barcode);
    CREATE INDEX IF NOT EXISTS idx_produk_kategori ON produk(kategori_id);
    CREATE INDEX IF NOT EXISTS idx_transaksi_tanggal ON transaksi(tanggal);
    CREATE INDEX IF NOT EXISTS idx_transaksi_item_transaksi ON transaksi_item(transaksi_id);
  `)

  // Insert default settings if empty
  const settingsCount = db.prepare('SELECT COUNT(*) as c FROM settings').get()
  if (settingsCount.c === 0) {
    const defaults = {
      nama_usaha: 'Toko Saya',
      alamat: '',
      kota: '',
      no_hp: '',
      nama_kasir: 'Kasir',
      pajak_persen: '0',
      catatan_struk: 'Terima kasih atas kunjungan Anda!',
      lebar_kertas: '58',
      ukuran_label: '40x25',
      label_kolom: '2',
      logo_path: '',
      nama_printer: '',
      tampil_logo_struk: '1',
      tampil_pajak_struk: '1'
    }

    const stmt = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)')
    const insertMany = db.transaction((entries) => {
      for (const [key, value] of entries) {
        stmt.run(key, value)
      }
    })
    insertMany(Object.entries(defaults))
  }

  return db
}

module.exports = { initDatabase }
