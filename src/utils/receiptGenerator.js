/**
 * Generate HTML struk thermal — monospace plain-text layout
 * Menggunakan <pre> + spasi manual agar bekerja di semua driver thermal printer.
 * CSS table / text-align:right sering diabaikan oleh driver thermal.
 */
export function generateReceiptHTML(transaksi, settings, logoBase64 = null) {
  const is80 = settings.lebar_kertas === '80'
  const lebarMm = is80 ? '80mm' : '58mm'
  const fontPx  = is80 ? '13px' : '11px'
  // jumlah karakter per baris (Courier New monospace)
  const W = is80 ? 46 : 32

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
  if ((transaksi.pajak_nominal || 0) > 0) {
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

  const preContent = lines.map(l => e(l)).join('\n')

  const logoHtml = logoBase64
    ? `<div style="text-align:center;margin-bottom:3px"><img src="${logoBase64}" style="max-width:60px;max-height:50px;display:inline-block" /></div>`
    : ''

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; }
  body {
    font-family: 'Courier New', Courier, monospace;
    font-size: ${fontPx};
    width: ${lebarMm};
    padding: 2mm 1mm;
    color: #000;
  }
  pre {
    font-family: 'Courier New', Courier, monospace;
    font-size: inherit;
    white-space: pre;
    line-height: 1.45;
    overflow: hidden;
  }
  @media print {
    @page { margin: 0; size: ${lebarMm} auto; }
    html, body { width: ${lebarMm}; }
  }
</style>
</head>
<body>
${logoHtml}<pre>${preContent}</pre>
</body>
</html>`
}


/**
 * Generate HTML label barcode stiker
 * @param {Array} items - array of { nama, barcode, harga }
 * @param {Object} settings - label settings
 */
export function generateLabelHTML(items, settings) {
  const [w, h] = (settings.ukuran_label || '40x25').split('x').map(Number)
  const kolom = parseInt(settings.label_kolom || '2')

  const labelStyle = `
    width: ${w}mm;
    height: ${h}mm;
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 1mm;
    overflow: hidden;
    page-break-inside: avoid;
    box-sizing: border-box;
  `

  const labelsHtml = items.map(item => `
    <div style="${labelStyle}">
      <div style="font-family:Arial,sans-serif;font-size:8px;font-weight:bold;text-align:center;
                  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;width:100%;max-width:${w - 2}mm">
        ${item.nama}
      </div>
      <svg id="barcode-${item.barcode}" style="max-width:${w - 2}mm;height:auto"></svg>
      <div style="font-family:Arial,sans-serif;font-size:8px;text-align:center">
        ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(item.harga)}
      </div>
    </div>
  `).join('')

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; }
  .labels-container {
    display: grid;
    grid-template-columns: repeat(${kolom}, ${w}mm);
    gap: 0;
  }
  @media print {
    @page { margin: 3mm; }
    .labels-container { gap: 0; }
  }
</style>
</head>
<body>
  <div class="labels-container">
    ${labelsHtml}
  </div>
</body>
</html>`
}
