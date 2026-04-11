/**
 * ESC/POS Encoder & Receipt Builder — Pure JS, tanpa dependensi external.
 * Mengirim perintah ESC/POS byte langsung ke printer thermal,
 * bypass Windows GDI sehingga gambar (logo, barcode) PASTI tercetak.
 */
const { nativeImage } = require('electron')
const path = require('path')
const fs = require('fs')
const { execFile } = require('child_process')
const os = require('os')

// ── ESC/POS Constants ───────────────────────────────────────────────
const ESC = 0x1B
const GS  = 0x1D
const LF  = 0x0A

// ── Encoder Class ───────────────────────────────────────────────────
class EscPos {
  constructor () { this.buf = [] }

  push (...bytes) { this.buf.push(...bytes); return this }

  // Initialize printer
  init () { return this.push(ESC, 0x40) }

  // Alignment: 0=left  1=center  2=right
  align (n) { return this.push(ESC, 0x61, n) }

  // Bold on/off
  bold (on) { return this.push(ESC, 0x45, on ? 1 : 0) }

  // Double-size:  0=normal  1=dblH  0x10=dblW  0x11=dblBoth
  size (n) { return this.push(GS, 0x21, n) }

  // Raw text (Latin-1 safe)
  text (s) {
    for (let i = 0; i < s.length; i++) this.buf.push(s.charCodeAt(i) & 0xFF)
    return this
  }

  // Line feed
  lf (n = 1) { for (let i = 0; i < n; i++) this.buf.push(LF); return this }

  // Print text + LF
  line (s) { return this.text(s).lf() }

  // Separator
  sep (ch = '-', w = 32) { return this.line(ch.repeat(w)) }

  // Two-column row: left ... right
  row (left, right, w = 32) {
    const sp = w - left.length - right.length
    if (sp < 1) return this.line(left).line(' '.repeat(Math.max(0, w - right.length)) + right)
    return this.line(left + ' '.repeat(sp) + right)
  }

  // ── Raster Bit Image (GS v 0) ──────────────────────────────────
  // monoPixels: Uint8Array where 0=white, 1=black  (1 byte per pixel)
  rasterImage (monoPixels, width, height) {
    const bytesPerRow = Math.ceil(width / 8)
    this.push(GS, 0x76, 0x30, 0x00) // GS v 0  mode=0 (normal)
    this.push(bytesPerRow & 0xFF, (bytesPerRow >> 8) & 0xFF)
    this.push(height & 0xFF, (height >> 8) & 0xFF)
    for (let y = 0; y < height; y++) {
      for (let bx = 0; bx < bytesPerRow; bx++) {
        let byte = 0
        for (let bit = 0; bit < 8; bit++) {
          const x = bx * 8 + bit
          if (x < width && monoPixels[y * width + x]) byte |= (0x80 >> bit)
        }
        this.buf.push(byte)
      }
    }
    return this
  }

  // ── Built-in Barcode (CODE128) ──────────────────────────────────
  barcode128 (data) {
    // Barcode height in dots
    this.push(GS, 0x68, 60)
    // Barcode width multiplier (2-6)
    this.push(GS, 0x77, 2)
    // HRI text position: 2 = below barcode
    this.push(GS, 0x48, 0x02)
    // HRI font: 0 = Font A
    this.push(GS, 0x66, 0x00)
    // Print CODE128: GS k 73 len data
    this.push(GS, 0x6B, 73, data.length)
    for (let i = 0; i < data.length; i++) this.buf.push(data.charCodeAt(i))
    return this.lf()
  }

  // Partial cut (with feed)
  cut (feed = 4) { return this.lf(feed).push(GS, 0x56, 0x01) }

  // Get final buffer
  toBuffer () { return Buffer.from(this.buf) }
}

// ── Convert image file → monochrome pixel array ─────────────────────
function imageToMono (filePath, maxWidth = 180) {
  const img = nativeImage.createFromPath(filePath)
  if (img.isEmpty()) return null

  const orig = img.getSize()
  const tw = Math.min(maxWidth, orig.width || maxWidth)
  const resized = img.resize({ width: tw, quality: 'best' })
  const { width, height } = resized.getSize()
  const bitmap = resized.toBitmap() // BGRA

  const mono = new Uint8Array(width * height)
  for (let i = 0; i < width * height; i++) {
    const off = i * 4
    const b = bitmap[off], g = bitmap[off + 1], r = bitmap[off + 2], a = bitmap[off + 3]
    const af = a / 255
    const lum = ((r * af + 255 * (1 - af)) * 0.299) +
                ((g * af + 255 * (1 - af)) * 0.587) +
                ((b * af + 255 * (1 - af)) * 0.114)
    mono[i] = lum < 180 ? 1 : 0 // 1 = black dot
  }
  return { data: mono, width, height }
}

// ── Format helpers ──────────────────────────────────────────────────
function formatRp (n) {
  return 'Rp ' + new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0 }).format(n ?? 0)
}
function formatTanggal (str) {
  const d = new Date(str)
  return d.toLocaleString('id-ID', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  })
}

// ── Build receipt ESC/POS buffer ────────────────────────────────────
function buildReceipt (transaksi, settings, logoPath) {
  const is80 = settings.lebar_kertas === '80'
  const W = is80 ? 46 : 32
  const enc = new EscPos()

  enc.init()

  // Logo (raster image)
  if (logoPath && settings.tampil_logo_struk === '1') {
    try {
      const realPath = logoPath.replace(/\//g, path.sep)
      const mono = imageToMono(realPath, is80 ? 300 : 200)
      if (mono) {
        enc.align(1)
        enc.rasterImage(mono.data, mono.width, mono.height)
        enc.lf()
      }
    } catch (_) { /* skip logo on error */ }
  }

  // Header toko
  enc.align(1).bold(true)
  enc.line(settings.nama_usaha || 'Toko Saya')
  enc.bold(false)
  if (settings.alamat) enc.line(settings.alamat)
  if (settings.kota)   enc.line(settings.kota)
  if (settings.no_hp)  enc.line('Telp: ' + settings.no_hp)

  enc.align(0).sep('-', W)

  // Info transaksi
  enc.row('No',        transaksi.no_transaksi || '-', W)
  enc.row('Tanggal',   formatTanggal(transaksi.tanggal), W)
  enc.row('Kasir',     transaksi.nama_kasir || '-', W)
  enc.row('Bayar via', transaksi.metode_bayar === 'tunai' ? 'Tunai' : (transaksi.metode_bayar || '-'), W)
  enc.sep('-', W)

  // Items
  ;(transaksi.items || []).forEach((item, idx) => {
    enc.line(`${idx + 1}. ${item.nama_produk}`)
    enc.row(`  ${item.qty} x ${formatRp(item.harga_satuan)}`, formatRp(item.subtotal), W)
    if ((item.diskon_item_nominal || 0) > 0) {
      enc.line(`  Diskon: -${formatRp(item.diskon_item_nominal * item.qty)}`)
    } else if ((item.diskon_item_persen || 0) > 0) {
      enc.line(`  Diskon: -${item.diskon_item_persen}%`)
    }
  })
  enc.sep('-', W)

  // Subtotal, diskon, pajak
  enc.row('Subtotal', formatRp(transaksi.subtotal), W)
  if ((transaksi.diskon_nominal || 0) > 0) {
    const dl = 'Diskon' + (transaksi.diskon_persen > 0 ? ` (${transaksi.diskon_persen}%)` : '')
    enc.row(dl, `-${formatRp(transaksi.diskon_nominal)}`, W)
  }
  if ((transaksi.pajak_nominal || 0) > 0) {
    enc.row(`Pajak (${transaksi.pajak_persen}%)`, formatRp(transaksi.pajak_nominal), W)
  }
  enc.sep('=', W)
  enc.bold(true).row('** TOTAL **', formatRp(transaksi.total), W).bold(false)
  enc.sep('=', W)

  // Bayar / kembalian
  if (transaksi.metode_bayar === 'tunai') {
    enc.row('Bayar',     formatRp(transaksi.bayar || 0), W)
    enc.row('Kembalian', formatRp(transaksi.kembalian || 0), W)
    enc.sep('-', W)
  }

  // Catatan
  if (settings.catatan_struk) {
    enc.lf()
    enc.align(1).line(settings.catatan_struk).align(0)
  }

  enc.cut()
  return enc.toBuffer()
}

// ── Send raw bytes ke printer Windows via PowerShell + winspool.drv ──
function sendRawToPrinter (printerName, dataBuffer) {
  return new Promise((resolve, reject) => {
    const tmpFile = path.join(os.tmpdir(), `kasirku_raw_${Date.now()}.bin`)
    fs.writeFileSync(tmpFile, dataBuffer)

    // PowerShell script yang memanggil winspool.drv secara langsung (P/Invoke).
    // Tipe data "RAW" memastikan byte dikirim apa adanya tanpa melewati driver GDI.
    const ps1 = `
$ErrorActionPreference="Stop"
Add-Type -TypeDefinition @"
using System;using System.IO;using System.Runtime.InteropServices;
public class RP{
 [StructLayout(LayoutKind.Sequential,CharSet=CharSet.Unicode)]
 public struct DI{[MarshalAs(UnmanagedType.LPWStr)]public string n;[MarshalAs(UnmanagedType.LPWStr)]public string o;[MarshalAs(UnmanagedType.LPWStr)]public string d;}
 [DllImport("winspool.drv",CharSet=CharSet.Unicode,SetLastError=true)]public static extern bool OpenPrinter(string p,out IntPtr h,IntPtr x);
 [DllImport("winspool.drv")]public static extern bool ClosePrinter(IntPtr h);
 [DllImport("winspool.drv",CharSet=CharSet.Unicode,SetLastError=true)]public static extern bool StartDocPrinter(IntPtr h,int l,ref DI d);
 [DllImport("winspool.drv")]public static extern bool EndDocPrinter(IntPtr h);
 [DllImport("winspool.drv")]public static extern bool StartPagePrinter(IntPtr h);
 [DllImport("winspool.drv")]public static extern bool EndPagePrinter(IntPtr h);
 [DllImport("winspool.drv",SetLastError=true)]public static extern bool WritePrinter(IntPtr h,IntPtr b,int c,out int w);
 public static bool Send(string pn,byte[] d){
  IntPtr h;if(!OpenPrinter(pn,out h,IntPtr.Zero))return false;
  DI di=new DI();di.n="KasirKu";di.d="RAW";
  if(!StartDocPrinter(h,1,ref di)){ClosePrinter(h);return false;}
  StartPagePrinter(h);
  IntPtr p=Marshal.AllocCoTaskMem(d.Length);Marshal.Copy(d,0,p,d.Length);int w;
  WritePrinter(h,p,d.Length,out w);Marshal.FreeCoTaskMem(p);
  EndPagePrinter(h);EndDocPrinter(h);ClosePrinter(h);return true;
 }
}
"@
$bytes=[IO.File]::ReadAllBytes("${tmpFile.replace(/\\/g, '\\\\')}")
$r=[RP]::Send("${printerName.replace(/"/g, '`"')}",$bytes)
Write-Output $r
`
    execFile('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', ps1], { timeout: 15000 }, (err, stdout, stderr) => {
      try { fs.unlinkSync(tmpFile) } catch (_) {}
      if (err) return reject(new Error(stderr || err.message))
      resolve(stdout.trim() === 'True')
    })
  })
}

module.exports = { EscPos, imageToMono, buildReceipt, sendRawToPrinter }
