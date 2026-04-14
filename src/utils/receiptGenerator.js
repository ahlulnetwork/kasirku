/**
 * Generate HTML struk thermal — 100% kompatibel dengan Generic / Text Only
 * Men-generate formatted text (pasti sejajar) di dalam <pre> block
 * sehingga Chromium mencetak karakter persis ke print spooler text mode.
 */
export function generateReceiptHTML(transaksi, settings) {
  const is80 = settings.lebar_kertas === '80'
  const charWidth = is80 ? 42 : 30 // Driver Generic Text Only di 58mm maksimal 30 karakter agar tidak wrap

  const paperW        = is80 ? '80mm' : '58mm'
  const baseFontSize  = is80 ? '13px' : '12px'

  const formatRp = (n) =>
    'Rp ' + new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0 }).format(n ?? 0)

  const formatTanggal = (str) => {
    const d = new Date(str)
    return d.toLocaleString('id-ID', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  }

  // --- TEXT ALIGNMENT HELPERS ---
  const padRight = (str, len) => {
    if (str.length >= len) return str.substring(0, len)
    return str + ' '.repeat(len - str.length)
  }

  const padLeft = (str, len) => {
    if (str.length >= len) return str.substring(0, len)
    return ' '.repeat(len - str.length) + str
  }

  const centerText = (str) => {
    if (str.length <= charWidth) {
      const leftSpace = Math.floor((charWidth - str.length) / 2)
      return ' '.repeat(leftSpace) + str
    }
    // Word-wrap teks panjang agar tidak terpotong
    const result = []
    const words = str.split(' ')
    let line = ''
    for (const word of words) {
      if (line.length === 0) {
        line = word
      } else if (line.length + 1 + word.length <= charWidth) {
        line += ' ' + word
      } else {
        const pad = Math.floor((charWidth - line.length) / 2)
        result.push(' '.repeat(Math.max(0, pad)) + line)
        line = word
      }
    }
    if (line.length > 0) {
      const pad = Math.floor((charWidth - line.length) / 2)
      result.push(' '.repeat(Math.max(0, pad)) + line)
    }
    return result.join('\n')
  }

  const lrText = (left, right) => {
    const strL = String(left)
    const strR = String(right)
    const spaceCount = charWidth - strL.length - strR.length
    if (spaceCount > 0) {
      return strL + ' '.repeat(spaceCount) + strR
    }
    // Jika terlalu panjang, potong bagian kiri, sisakan minimal jarak 1 spasi
    const truncL = strL.substring(0, charWidth - strR.length - 1)
    return truncL + ' ' + strR
  }

  // --- BUILD TEXT LINES ---
  const lines = []
  
  // Header toko
  lines.push(centerText((settings.nama_usaha || 'Toko Saya').toUpperCase()))
  if (settings.alamat) lines.push(centerText(settings.alamat))
  if (settings.kota)   lines.push(centerText(settings.kota))
  if (settings.no_hp)  lines.push(centerText(`Telp: ${settings.no_hp}`))
  
  lines.push('-'.repeat(charWidth))

  // Info transaksi
  lines.push(`No     : ${transaksi.no_transaksi || '-'}`)
  lines.push(`Tanggal: ${formatTanggal(transaksi.tanggal)}`)
  lines.push(`Kasir  : ${transaksi.nama_kasir || '-'}`)
  if (transaksi.nama_customer) {
    lines.push(`Pelanggan: ${transaksi.nama_customer}`)
  }
  const metBayar = transaksi.metode_bayar === 'tunai' ? 'Tunai' : (transaksi.metode_bayar || '-')
  lines.push(`Pembayaran: ${metBayar}`)
  
  lines.push('-'.repeat(charWidth))

  // Items
  ;(transaksi.items || []).forEach((item, idx) => {
    lines.push(`${idx + 1}. ${item.nama_produk}`)
    const detLeft = `  ${item.qty} x ${formatRp(item.harga_satuan)}`
    lines.push(lrText(detLeft, formatRp(item.subtotal)))
    
    if ((item.diskon_item_nominal || 0) > 0) {
      lines.push(lrText(`  Diskon:`, `-${formatRp(item.diskon_item_nominal * item.qty)}`))
    } else if ((item.diskon_item_persen || 0) > 0) {
      lines.push(lrText(`  Diskon:`, `-${item.diskon_item_persen}%`))
    }
  })

  // Ringkasan
  lines.push('-'.repeat(charWidth))
  lines.push(lrText('Subtotal', formatRp(transaksi.subtotal)))
  if ((transaksi.diskon_nominal || 0) > 0) {
    const dl = 'Diskon' + (transaksi.diskon_persen > 0 ? ` (${transaksi.diskon_persen}%)` : '')
    lines.push(lrText(dl, `-${formatRp(transaksi.diskon_nominal)}`))
  }
  if (settings.tampil_pajak_struk !== '0' && (transaksi.pajak_nominal || 0) > 0) {
    lines.push(lrText(`Pajak (${transaksi.pajak_persen}%)`, formatRp(transaksi.pajak_nominal)))
  }

  lines.push('='.repeat(charWidth))
  lines.push(lrText('** TOTAL **', formatRp(transaksi.total)))
  lines.push('='.repeat(charWidth))

  // Tunai
  if (transaksi.metode_bayar === 'tunai') {
    lines.push(lrText('Bayar', formatRp(transaksi.bayar || 0)))
    lines.push(lrText('Kembalian', formatRp(transaksi.kembalian || 0)))
    lines.push('-'.repeat(charWidth))
  }

  // Footer
  if (settings.catatan_struk) {
    lines.push('') // Empty line
    const footerLines = settings.catatan_struk.split('\n')
    footerLines.forEach(fl => {
      lines.push(centerText(fl.trim()))
    })
  }

  // Escape HTML entities on the final text to prevent injection
  const e = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const finalPlainText = e(lines.join('\n'))

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html { background: #d8d8d8; }
  body {
    background: transparent;
    padding: 14px;
    display: flex;
    justify-content: center;
  }
  .paper {
    background: #fff;
    width: ${paperW};
    min-width: ${paperW};
    max-width: ${paperW};
    padding: 4mm 3mm 10mm 3mm;
    box-shadow: 0 4px 18px rgba(0,0,0,0.28);
  }
  pre {
    /* Wajib pakai monospace agar ASCII padding presisi di "Generic Text Only" */
    font-family: 'Courier New', Consolas, monospace, 'Menlo';
    font-size: ${baseFontSize};
    line-height: 1.25;
    white-space: pre-wrap;
    word-break: break-all;
    color: #000;
  }
  
  @media print {
    html { background: none; }
    body { padding: 0; display: block; }
    .paper {
      box-shadow: none;
      width: 100%;
      min-width: unset;
      max-width: unset;
      padding: 0;
    }
    @page { size: ${paperW} auto; margin: 0; }
  }
</style>
</head>
<body>
<div class="paper">
<pre>${finalPlainText}</pre>
</div>
</body>
</html>`
}

