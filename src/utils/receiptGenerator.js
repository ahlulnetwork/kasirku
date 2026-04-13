/**
 * Generate HTML struk thermal — monospace plain-text layout
 * Menggunakan div per baris agar bekerja di semua driver thermal printer.
 */
export function generateReceiptHTML(transaksi, settings) {
  const is80 = settings.lebar_kertas === '80'
  const lebarMm = is80 ? '80mm' : '58mm'
  const fontPx  = is80 ? '14px' : '12px' // Diperbesar 1px agar tulisan lebih mengisi lebar kertas dan lebih rapi
  const W = is80 ? 42 : 30

  const formatRp = (n) =>
    'Rp ' + new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0 }).format(n ?? 0)

  const formatTanggal = (str) => {
    const d = new Date(str)
    return d.toLocaleString('id-ID', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    })
  }

  // Escape HTML chars untuk <pre>
  const e = (s) => String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  // Garis separator
  function sep(ch = '-') { return ch.repeat(W) }

  // Teks tengah
  function center(text) {
    const t = String(text ?? '')
    if (t.length >= W) return t
    const pad = Math.floor((W - t.length) / 2)
    return ' '.repeat(pad) + t
  }

  // Dua kolom: label kiri, nilai kanan — label+nilai jadi 1 baris
  function row(label, value) {
    const l = String(label ?? '')
    const v = String(value ?? '')
    const spaces = W - l.length - v.length
    if (spaces < 1) {
      // nilai tidak muat → turun baris, rata kanan
      return l + '\n' + ' '.repeat(Math.max(0, W - v.length)) + v
    }
    return l + ' '.repeat(spaces) + v
  }

  // Kumpulkan baris teks
  const lines = []

  // Header toko
  lines.push(center(settings.nama_usaha || 'Toko Saya'))
  if (settings.alamat) lines.push(center(settings.alamat))
  if (settings.kota)   lines.push(center(settings.kota))
  if (settings.no_hp)  lines.push(center('Telp: ' + settings.no_hp))
  lines.push(sep())

  // Info transaksi
  lines.push(row('No', transaksi.no_transaksi || '-'))
  lines.push(row('Tanggal', formatTanggal(transaksi.tanggal)))
  lines.push(row('Kasir', transaksi.nama_kasir || '-'))
  lines.push(row('Bayar via', transaksi.metode_bayar === 'tunai' ? 'Tunai' : (transaksi.metode_bayar || '-')))
  lines.push(sep())

  // Item
  ;(transaksi.items || []).forEach((item, idx) => {
    lines.push(`${idx + 1}. ${item.nama_produk}`)
    lines.push(row(`  ${item.qty} x ${formatRp(item.harga_satuan)}`, formatRp(item.subtotal)))
    if ((item.diskon_item_nominal || 0) > 0) {
      lines.push(`  Diskon: -${formatRp(item.diskon_item_nominal * item.qty)}`)
    } else if ((item.diskon_item_persen || 0) > 0) {
      lines.push(`  Diskon: -${item.diskon_item_persen}%`)
    }
  })
  lines.push(sep())

  // Ringkasan harga
  lines.push(row('Subtotal', formatRp(transaksi.subtotal)))
  if ((transaksi.diskon_nominal || 0) > 0) {
    const dl = 'Diskon' + (transaksi.diskon_persen > 0 ? ` (${transaksi.diskon_persen}%)` : '')
    lines.push(row(dl, `-${formatRp(transaksi.diskon_nominal)}`))
  }
  // Tampilkan baris pajak hanya jika setting tampil_pajak_struk !== '0'
  if (settings.tampil_pajak_struk !== '0' && (transaksi.pajak_nominal || 0) > 0) {
    lines.push(row(`Pajak (${transaksi.pajak_persen}%)`, formatRp(transaksi.pajak_nominal)))
  }
  lines.push(sep('='))
  lines.push(row('** TOTAL **', formatRp(transaksi.total)))
  lines.push(sep('='))

  if (transaksi.metode_bayar === 'tunai') {
    lines.push(row('Bayar', formatRp(transaksi.bayar || 0)))
    lines.push(row('Kembalian', formatRp(transaksi.kembalian || 0)))
    lines.push(sep())
  }

  if (settings.catatan_struk) {
    lines.push('')
    lines.push(center(settings.catatan_struk))
  }

  // Tambahkan spasi kosong di akhir agar tulisan terakhir melewati pisau pemotong kertas (Tear bar)
  // Tear bar pada VSC POS-58 berjarak ~20mm dari head = ~6 baris. Tambah 10 untuk safety margin.
  lines.push(' ')
  lines.push(' ')
  lines.push(' ')
  lines.push(' ')
  lines.push(' ')
  lines.push(' ')
  lines.push(' ')
  lines.push(' ')
  lines.push(' ')
  lines.push(' ')

  const preContentHtml = lines.map(l => `<div class="line">${e(l) || ' '}</div>`).join('\n')

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Courier New', Courier, monospace;
    font-size: ${fontPx};
    width: 100%;
    max-width: ${lebarMm};
    padding: 0 2mm;
    color: #000;
  }
  .line {
    font-family: 'Courier New', Courier, monospace;
    font-size: inherit;
    font-weight: 600;
    white-space: pre;
    line-height: 1.2;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  @media print {
    @page { size: ${lebarMm} auto; }
    html, body { width: 100%; max-width: ${lebarMm}; }
  }
</style>
</head>
<body>
<div style="width: 100%; overflow: hidden;">
${preContentHtml}
</div>
</body>
</html>`
}

