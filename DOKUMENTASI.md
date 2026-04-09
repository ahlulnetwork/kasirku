# KasirKu — Dokumentasi Lengkap Aplikasi Kasir Desktop

> Aplikasi kasir desktop berbasis Electron untuk Windows (7/8/10/11)
> Bundled gratis bersama penjualan printer thermal

---

## Tech Stack

| Layer | Teknologi |
|---|---|
| Desktop container | Electron (latest stable) |
| Frontend | Vue 3 + Vite |
| UI Component | Naive UI |
| Database | SQLite via better-sqlite3 |
| Image processing | Sharp (kompres + grayscale otomatis) |
| Print struk | Electron `webContents.print()` (silent, tanpa dialog) |
| PDF laporan | jsPDF |
| Barcode generate | JsBarcode |
| Barcode scan | USB HID plug & play (baca sebagai keyboard input) |
| Packaging | electron-builder → installer .exe |

---

## Catatan Penting

### Logo & Foto Produk
- Semua gambar yang diupload **otomatis dikompres** via `sharp`
- Logo usaha **otomatis dikonversi ke grayscale** sebelum dicetak di struk thermal (printer thermal hanya hitam-putih)
- Foto produk disimpan di folder lokal dalam direktori aplikasi
- Ukuran maksimum setelah kompresi: logo ≤ 200px lebar, foto produk ≤ 400px lebar
- Format yang diterima: JPG, PNG, WEBP

### Printer Thermal
- Menggunakan **Windows Driver** (plug & play)
- Print via Electron `webContents.print()` — universal, semua brand printer
- Format struk menggunakan **HTML/CSS** → mudah dimodifikasi
- Mendukung semua printer dengan Windows driver: Epson TM series, Xprinter, Generic, dll

### Barcode Scanner
- USB HID plug & play — terbaca sebagai keyboard input
- Tidak perlu konfigurasi COM port
- Pada menu kasir, field pencarian otomatis menangkap input scanner

---

## Struktur Database (SQLite)

### Tabel: `settings`
| Field | Tipe | Keterangan |
|---|---|---|
| id | INTEGER PK | |
| key | TEXT UNIQUE | nama setting |
| value | TEXT | nilai setting |

Setting yang disimpan: logo_path, nama_usaha, alamat, kota, no_hp, nama_kasir, pajak_persen, catatan_struk, lebar_kertas, ukuran_label_stiker, nama_printer, printer_lebar_mm

### Tabel: `non_tunai`
| Field | Tipe | Keterangan |
|---|---|---|
| id | INTEGER PK | |
| nama | TEXT | BCA, QRIS, OVO, dll |
| aktif | INTEGER | 1=aktif, 0=nonaktif |
| urutan | INTEGER | urutan tampil |

### Tabel: `kategori`
| Field | Tipe | Keterangan |
|---|---|---|
| id | INTEGER PK | |
| nama | TEXT | Electronics, Makanan, dll |
| urutan | INTEGER | urutan tampil |

### Tabel: `produk`
| Field | Tipe | Keterangan |
|---|---|---|
| id | INTEGER PK | |
| nama | TEXT | |
| kategori_id | INTEGER FK | |
| foto_path | TEXT | path foto lokal |
| harga | REAL | |
| deskripsi | TEXT | opsional |
| barcode | TEXT UNIQUE | manual/auto-generated |
| stok | INTEGER | -1 = unlimited |
| stok_minimum | INTEGER | untuk alert, default 5 |
| satuan | TEXT | pcs, kg, liter, dll |
| aktif | INTEGER | 1=aktif |

### Tabel: `kas`
| Field | Tipe | Keterangan |
|---|---|---|
| id | INTEGER PK | |
| tipe | TEXT | buka / tutup |
| saldo | REAL | saldo awal / akhir |
| catatan | TEXT | |
| created_at | TEXT | datetime |

### Tabel: `transaksi`
| Field | Tipe | Keterangan |
|---|---|---|
| id | INTEGER PK | |
| no_transaksi | TEXT UNIQUE | TRX-YYYYMMDD-XXXX |
| tanggal | TEXT | datetime |
| subtotal | REAL | sebelum diskon & pajak |
| diskon_persen | REAL | diskon keseluruhan % |
| diskon_nominal | REAL | diskon keseluruhan nominal |
| pajak_persen | REAL | dari setting saat itu |
| pajak_nominal | REAL | |
| total | REAL | final |
| metode_bayar | TEXT | tunai / nama_nontunai |
| bayar | REAL | nominal yang dibayarkan |
| kembalian | REAL | |
| nama_kasir | TEXT | dari setting saat itu |
| catatan | TEXT | |

### Tabel: `transaksi_item`
| Field | Tipe | Keterangan |
|---|---|---|
| id | INTEGER PK | |
| transaksi_id | INTEGER FK | |
| produk_id | INTEGER FK | |
| nama_produk | TEXT | snapshot nama saat transaksi |
| harga_satuan | REAL | snapshot harga saat transaksi |
| qty | INTEGER | |
| diskon_item_persen | REAL | diskon per item % |
| diskon_item_nominal | REAL | diskon per item nominal |
| subtotal | REAL | |

---

## A. Menu Pengaturan

### A1. Informasi Usaha
- **Upload logo usaha** (otomatis dikompres + grayscale saat print)
- Input: Nama Usaha, Alamat, Kota, No. HP
- Preview logo

### A2. Kasir & Pajak
- Input: Nama Kasir (aktif)
- Input: Pajak (% angka, bisa 0 untuk nonaktif)
- Pajak otomatis diterapkan ke setiap transaksi

### A3. Non Tunai
- CRUD metode pembayaran non tunai
- Contoh: BCA Transfer, QRIS, Kartu Debit, Kartu Kredit, OVO, GoPay, Dana
- Bisa aktifkan/nonaktifkan per metode
- Bisa atur urutan tampil

### A4. Struk
- Input: Catatan bawah struk (contoh: "Terima kasih atas kunjungan Anda!")
- Toggle: tampilkan logo di struk (ya/tidak)
- Toggle: tampilkan pajak di struk (ya/tidak)
- Preview struk real-time sesuai pengaturan

### A5. Lebar Kertas Thermal
- Pilihan: **58mm** / **80mm**
- Mempengaruhi layout struk
- Preview live width

### A6. Label Stiker Barcode
- Pilih ukuran kertas stiker: 
  - 30x20mm, 40x25mm, 50x30mm, 58x40mm, custom (input manual)
- Jumlah kolom label per baris: 1 / 2 / 3
- Preview label barcode

### A7. Koneksi Printer Thermal
- Pilih printer dari daftar printer Windows yang terinstall (dropdown)
- Tombol **Test Print** (cetak struk test)
- Info driver printer terdeteksi

### A8. Backup & Restore
- **Backup**: 
  - Export semua data (database SQLite) + folder gambar (logo + foto produk) ke satu file `.kasirku-backup` (format ZIP)
  - Auto nama file: `namaUsaha_YYYYMMDDHHMMSS.kasirku-backup`
- **Restore**:
  - Import file `.kasirku-backup`
  - Konfirmasi sebelum restore (data lama akan ditimpa)
  - Restore lengkap: database + semua gambar
- **Catatan**: Laporan & transaksi history ikut terbackup

---

## B. Menu Laporan

### B1. Filter Periode
- Pilihan cepat: **Hari Ini**, **Kemarin**, **Minggu Ini**, **Bulan Ini**
- Custom range: date picker dari-sampai
- Default: Hari Ini

### B2. Ringkasan Transaksi
- Total Pendapatan (setelah diskon, setelah pajak)
- Total Transaksi (jumlah transaksi)
- Rincian per metode bayar:
  - Tunai: Rp xxx (x transaksi)
  - BCA Transfer: Rp xxx (x transaksi)
  - QRIS: Rp xxx (x transaksi)
  - dst...
- Total Pajak terkumpul
- Total Diskon diberikan

### B3. Tabel Transaksi
- Kolom: No. Transaksi, Tanggal, Kasir, Metode Bayar, Diskon, Pajak, Total
- Klik baris → detail item transaksi (expand / modal)
- **Edit transaksi**: ubah metode bayar, catatan, diskon keseluruhan
- **Hapus transaksi**: dengan konfirmasi, stok dikembalikan

### B4. Cetak Laporan PDF
- Tombol **Download PDF**
- Auto nama file: `namaUsaha_YYYYMMDDHHMMSS.pdf`
- Konten PDF: header usaha, periode, ringkasan, tabel transaksi
- Generate langsung tanpa dialog print

---

## C. Menu Produk

### C1. Daftar Produk
- Tampilan grid atau list (toggle)
- Filter: **Semua Kategori** / pilih kategori
- Filter: **Semua Stok** / Stok Aktif / Stok Menipis / Unlimited
- Search: nama produk atau barcode
- Sort: nama, harga, stok, terbaru

### C2. Tambah / Edit Produk
- Upload foto produk (otomatis dikompres)
- Input: Nama Produk (wajib)
- Pilih Kategori (wajib)
- Input: Harga (wajib)
- Input: Deskripsi (opsional)
- Input: Barcode — manual ketik atau klik **Generate Otomatis**
- Tombol **Cetak Label Barcode** (langsung dari form)
- Input: Stok — angka atau checkbox **Unlimited**
- Input: Stok Minimum (untuk alert, default 5) — aktif jika stok bukan unlimited
- Input: Satuan (pcs, kg, liter, lusin, dll)
- Toggle: Produk Aktif / Nonaktif

### C3. Kelola Kategori
- CRUD kategori
- Atur urutan tampil
- Tidak bisa hapus kategori yang masih punya produk aktif (warning)

### C4. Alert Stok Menipis
- Badge notifikasi di icon menu Produk
- Menampilkan jumlah produk yang stoknya ≤ stok minimum
- Filter cepat "Stok Menipis" di daftar produk

### C5. Cetak Label Barcode (Batch)
- Pilih produk (multi-select / checkbox)
- Input jumlah label per produk
- Preview label sebelum cetak
- Cetak ke printer sesuai ukuran stiker yang di-setting

---

## D. Menu Kasir (Menu Utama)

### D1. Layout Utama
```
┌─────────────────────────────────┬──────────────────────┐
│        DAFTAR PRODUK            │    KERANJANG         │
│  [Search / Scan Barcode]        │                      │
│  [Filter Kategori]              │  Item 1 ... Rp xxx   │
│                                 │  Item 2 ... Rp xxx   │
│  [Produk] [Produk] [Produk]     │                      │
│  [Produk] [Produk] [Produk]     │  ──────────────────  │
│                                 │  Subtotal: Rp xxx    │
│  Toggle: Grid | List            │  Diskon:   Rp xxx    │
│                                 │  Pajak:    Rp xxx    │
│                                 │  TOTAL:    Rp xxx    │
│                                 │                      │
│                                 │  [BAYAR] F2          │
└─────────────────────────────────┴──────────────────────┘
```

### D2. Daftar Produk (Panel Kiri)
- **Grid mode**: foto produk, nama, harga, badge stok
- **List mode**: foto kecil, nama, deskripsi singkat, harga, stok
- Filter kategori: tab horizontal dengan scroll
- Produk stok habis: ditampilkan tapi disabled (tidak bisa klik)
- **Search / Scan barcode**: field selalu aktif, tinggal scan langsung muncul

### D3. Keranjang Belanja (Panel Kanan)
- Klik produk → langsung masuk keranjang, qty +1 jika sudah ada
- Per item di keranjang:
  - Nama produk
  - Harga satuan
  - Input qty (klik angka langsung edit)
  - Tombol + / -
  - Diskon per item: klik → input % atau nominal
  - Tombol hapus item
- **Diskon keseluruhan transaksi**: input % atau nominal di bawah daftar item
- Subtotal, diskon, pajak, **TOTAL** tampil jelas dengan angka besar

### D4. Proses Bayar (Modal/Popup)
1. Tampil TOTAL besar
2. Pilih metode: **Tunai** atau daftar non-tunai (BCA, QRIS, dll)
3. Jika **Tunai**:
   - Input nominal bayar (numpad besar)
   - Quick buttons: uang pas, Rp 5.000 lebih, Rp 10.000 lebih, Rp 50.000 lebih
   - Tampil **KEMBALIAN** otomatis real-time dengan angka sangat besar
4. Jika **Non Tunai**: langsung bisa konfirmasi
5. Tombol **KONFIRMASI BAYAR** → transaksi tersimpan
6. Pilihan: Cetak Struk / Tidak Cetak → selesai

### D5. Struk
- Format HTML sesuai lebar kertas yang di-setting (58mm / 80mm)
- Konten struk:
  - Logo usaha (grayscale)
  - Nama usaha, alamat, kota, no HP
  - No. transaksi, tanggal, jam, nama kasir
  - Daftar item (nama, qty x harga, subtotal)
  - Garis pemisah
  - Subtotal, diskon, pajak, **TOTAL**
  - Metode bayar, nominal bayar, kembalian
  - Catatan bawah struk
- **Silent print** (tidak muncul dialog printer)
- Bisa **cetak ulang** struk dari history transaksi

### D6. Shortcut Keyboard
| Shortcut | Fungsi |
|---|---|
| `F1` | Fokus ke search/scan produk |
| `F2` | Buka dialog bayar |
| `F3` | Hapus semua keranjang (dengan konfirmasi) |
| `F4` | Cetak ulang struk terakhir |
| `Escape` | Tutup dialog / batalkan |
| `Enter` | Konfirmasi di dialog bayar |
| `+` / `-` | Tambah/kurang qty item terpilih di keranjang |
| `Delete` | Hapus item terpilih di keranjang |

---

## E. Navbar & Layout Aplikasi

```
┌──────────────────────────────────────────────────────────┐
│  🏪 KasirKu  │ [Kasir] [Produk] [Laporan] [Pengaturan]  │
│              │                              [Buka Kas]   │
└──────────────────────────────────────────────────────────┘
```

- Tab aktif: Kasir (default saat buka aplikasi)
- Badge merah di Produk: jumlah produk stok menipis
- **Buka Kas / Tutup Kas**: tombol di navbar kanan atas
  - Buka kas: input saldo awal + catatan → konfirmasi
  - Tutup kas: tampil ringkasan hari ini, input saldo akhir → konfirmasi
- Theme: Light (default), bisa Dark mode di pengaturan

---

## F. Alur Buka Tutup Kas

```
Buka Aplikasi
    ↓
Cek status kas hari ini
    ↓
Belum buka kas? → Muncul dialog "Buka Kas Hari Ini"
Sudah buka? → Langsung ke menu Kasir
    ↓
Transaksi berjalan...
    ↓
Tombol "Tutup Kas"
    ↓
Dialog: Ringkasan hari ini (total transaksi, total uang masuk)
Input saldo akhir kas + catatan
Konfirmasi → Tutup Kas tersimpan
```

---

## G. Backup & Restore — Detail Teknis

### Format Backup
- File: `.kasirku-backup` (sebenarnya ZIP)
- Isi ZIP:
  ```
  kasirku-backup/
  ├── database.db          ← SQLite database lengkap
  ├── images/
  │   ├── logo/            ← logo usaha
  │   └── products/        ← foto-foto produk
  └── backup-info.json     ← versi app, tanggal backup, nama usaha
  ```

### Restore
- Baca file `.kasirku-backup`
- Validasi `backup-info.json` (versi kompatibel)
- Tampil info: "Backup dari [Nama Usaha] tanggal [tgl], berisi [X] transaksi, [Y] produk"
- Konfirmasi user → replace database + images
- Restart aplikasi otomatis setelah restore

---

## H. Penanganan Error & Edge Cases

| Kasus | Penanganan |
|---|---|
| Printer tidak ditemukan | Warning notifikasi, transaksi tetap bisa jalan tanpa cetak |
| Stok habis saat di keranjang | Notifikasi, item dinonaktifkan |
| Koneksi database error | Alert + restart otomatis |
| Foto produk tidak ditemukan | Tampilkan placeholder image |
| Backup file korup | Validasi sebelum restore, tampil error jelas |
| Input harga/qty bukan angka | Validasi real-time, tidak bisa submit |

---

## I. Struktur Folder Project

```
kasirku/
├── electron/
│   ├── main.js              ← entry point Electron
│   ├── preload.js           ← bridge renderer ↔ main
│   └── handlers/
│       ├── database.js      ← SQLite operations
│       ├── print.js         ← print struk & label
│       ├── backup.js        ← backup & restore
│       └── image.js         ← compress & process image
├── src/                     ← Vue 3 frontend
│   ├── main.js
│   ├── App.vue
│   ├── views/
│   │   ├── Kasir.vue        ← menu utama kasir
│   │   ├── Produk.vue       ← manajemen produk
│   │   ├── Laporan.vue      ← laporan & history
│   │   └── Pengaturan.vue   ← semua pengaturan
│   ├── components/
│   │   ├── kasir/
│   │   │   ├── ProductGrid.vue
│   │   │   ├── ProductList.vue
│   │   │   ├── Cart.vue
│   │   │   ├── PaymentModal.vue
│   │   │   └── Receipt.vue
│   │   ├── produk/
│   │   │   ├── ProductForm.vue
│   │   │   ├── CategoryManager.vue
│   │   │   └── BarcodeLabel.vue
│   │   ├── laporan/
│   │   │   ├── SummaryCard.vue
│   │   │   ├── TransactionTable.vue
│   │   │   └── TransactionDetail.vue
│   │   └── shared/
│   │       ├── Navbar.vue
│   │       ├── KasModal.vue
│   │       └── ConfirmDialog.vue
│   ├── stores/              ← Pinia state management
│   │   ├── cart.js
│   │   ├── settings.js
│   │   └── products.js
│   └── utils/
│       ├── formatCurrency.js
│       ├── generateNoTransaksi.js
│       └── generateBarcode.js
├── data/                    ← runtime (gitignore)
│   ├── kasirku.db
│   └── images/
├── package.json
├── vite.config.js
└── electron-builder.config.js
```

---

## J. Checklist Development

### Phase 1 — Foundation
- [ ] Setup project Electron + Vue 3 + Vite
- [ ] Setup SQLite + migrasi tabel
- [ ] Layout navbar + routing antar menu
- [x] Buka/Tutup Kas

### Phase 2 — Produk
- [x] CRUD kategori
- [x] CRUD produk (dengan foto, barcode, stok, satuan)
- [x] Alert stok menipis
- [x] Cetak label barcode (preview SVG live, modal qty, silent print)

### Phase 3 — Kasir (Core)
- [x] Tampil daftar produk (grid + list)
- [x] Keranjang belanja + diskon per item
- [x] Diskon keseluruhan + pajak
- [x] Modal bayar + kembalian
- [x] Simpan transaksi
- [x] Cetak struk silent (F4 reprint, grayscale logo, 58mm/80mm)

### Phase 4 — Laporan
- [x] Filter periode
- [x] Ringkasan per metode bayar
- [x] Tabel transaksi + detail
- [ ] Edit & hapus transaksi
- [x] Export PDF

### Phase 5 — Pengaturan
- [x] Informasi usaha + upload logo
- [x] Kasir & pajak
- [x] CRUD non tunai
- [x] Pengaturan struk
- [x] Pilih lebar kertas
- [x] Pengaturan label stiker
- [x] Deteksi printer + test print
- [x] Backup & Restore

### Phase 6 — Polish
- [x] Shortcut keyboard lengkap (F1-F4, Escape, Enter)
- [x] Dark mode (toggle di tab Tampilan)
- [ ] Validasi semua form
- [ ] Error handling
- [x] Build installer .exe (GitHub Actions workflows/build.yml)
