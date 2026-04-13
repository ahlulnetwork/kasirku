import JsBarcode from 'jsbarcode'

// Generate barcode SVG secara inline agar printer thermal (khusus driver lawas/Windows) dapat me-render vector shape tanpa drop raster image.
function generateBarcodeSVG(value, barHeight = 40) {
  try {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
    JsBarcode(svg, String(value), {
      format: 'CODE128',
      width: 2,
      height: barHeight,
      displayValue: false, // Matikan teks default
      margin: 0
    })
    const serializer = new XMLSerializer()
    return serializer.serializeToString(svg)
  } catch (e) {
    return null
  }
}

/**
 * Generate HTML struk thermal — monospace plain-text layout
 * Menggunakan <pre> + spasi manual agar bekerja di semua driver thermal printer.
 * CSS table / text-align:right sering diabaikan oleh driver thermal.
 */
export function generateReceiptHTML(transaksi, settings, logoBase64 = null) {
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
  lines.push(' ')
  lines.push(' ')
  lines.push(' ')
  lines.push(' ')
  lines.push(' ')

  const preContentHtml = lines.map(l => `<div class="line">${e(l) || ' '}</div>`).join('\n')

  const logoHtml = logoBase64
    ? `<div class="no-break" style="text-align:center;margin-bottom:3px;line-height:0;${logoBase64.startsWith('<svg') ? 'width:100%;display:flex;justify-content:center;' : ''}">
         ${logoBase64.startsWith('<svg') 
           ? logoBase64.replace('<svg ', '<svg style="width:auto;max-width:60px;max-height:50px;display:inline-block;vertical-align:top;" ') 
           : `<img src="${logoBase64}" alt="" style="width:auto;max-width:60px;max-height:50px;display:inline-block;vertical-align:top;image-rendering:crisp-edges;" />`}
       </div>`
    : ''

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
    page-break-inside: avoid; /* FIX SLICING: Mencegah huruf terpotong setengah horizontal */
    break-inside: avoid;
  }
  .no-break {
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
${logoHtml}
<div style="width: 100%; overflow: hidden;">
${preContentHtml}
</div>
</body>
</html>`
}


/**
 * Generate HTML label barcode stiker
 * @param {Array} items - array of { nama, barcode, harga }
 * @param {Object} settings - label settings
 */
export function generateLabelHTML(items, settings) {
  const lebarKertas = parseInt(settings.lebar_kertas || '58', 10)
  // Hitung kolom dan lebar label otomatis agar pas dengan lebar kertas
  // Setiap label minimal 30mm — jika 2 kolom melebihi kertas, turun ke 1 kolom
  const kolomReq = parseInt(settings.label_kolom || '2', 10)
  const [wReq, h] = (settings.ukuran_label || '40x25').split('x').map(Number)
  // Cek apakah 2 kolom muat di kertas
  const kolom = (kolomReq * wReq <= lebarKertas) ? kolomReq : 1
  // Lebar tiap cell = lebar kertas dibagi kolom (gunakan semua lebar tersedia)
  const cellWidth = Math.floor(lebarKertas / kolom)
  const totalWidth = lebarKertas
  const rows = []

  for (let index = 0; index < items.length; index += kolom) {
    rows.push(items.slice(index, index + kolom))
  }

  const rowsHtml = rows.map(row => {
    const cells = [...row]
    while (cells.length < kolom) cells.push(null)

    return `<tr>
      ${cells.map(item => {
        if (!item) {
          return `<td style="width:${cellWidth}mm;height:${h}mm;padding:0;"></td>`
        }

        const svgHtml = item.barcode ? generateBarcodeSVG(item.barcode, 34) : null
        // Karena SVG langsung berupa string node, kita inject. Namun modifikasi width/height via inline style/attrib di container.
        const barcodeDisplay = svgHtml
          ? `<div style="display:flex;justify-content:center;width:${Math.max(cellWidth - 12, 24)}mm;height:12mm;margin:0 auto;overflow:hidden;">
               ${svgHtml.replace('<svg ', '<svg preserveAspectRatio="none" style="width:100%;height:100%;" ')}
             </div>
             <div style="font-family:'Courier New',Courier,monospace;font-size:9px;font-weight:700;line-height:1.05;letter-spacing:0.6px;margin-top:0.6mm;white-space:nowrap;">${item.barcode}</div>`
          : `<div style="font-family:'Courier New',Courier,monospace;font-size:9px;font-weight:700;line-height:1.05;white-space:nowrap;">${item.barcode || ''}</div>`

        return `<td style="width:${cellWidth}mm;height:${h}mm;padding:1.2mm 1.5mm 0.8mm;vertical-align:top;overflow:hidden;">
          <div style="width:${cellWidth - 3}mm;height:${h - 2}mm;overflow:hidden;text-align:center;color:#000;">
            <div style="font-family:Arial,sans-serif;font-size:9px;font-weight:700;line-height:1.15;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:1mm;">
              ${item.nama || ''}
            </div>
            ${barcodeDisplay}
          </div>
        </td>`
      }).join('')}
    </tr>`
  }).join('')

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body {
    width: ${totalWidth}mm;
    background: #fff;
    color: #000;
    overflow: hidden;
    font-family: Arial, sans-serif;
  }
  body {
    padding: 0;
  }
  table {
    width: ${totalWidth}mm;
    border-collapse: collapse;
    table-layout: fixed;
  }
  tr {
    page-break-inside: avoid;
    break-inside: avoid;
  }
  @media print {
    @page { margin: 0; size: ${totalWidth}mm auto; }
    html, body { width: ${totalWidth}mm; }
  }
</style>
</head>
<body>
  <table>
    <tbody>${rowsHtml}</tbody>
  </table>
</body>
</html>`
}
