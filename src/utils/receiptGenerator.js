/**
 * Generate HTML struk thermal — HTML/CSS layout
 * Tampil bagus di preview (paper card + shadow) & bersih saat dicetak thermal printer.
 */
export function generateReceiptHTML(transaksi, settings) {
  const is80 = settings.lebar_kertas === '80'
  const paperW        = is80 ? '80mm' : '58mm'
  const baseFontSize  = is80 ? '13px' : '12px'
  const headerFont    = is80 ? '16px' : '14px'
  const totalFont     = is80 ? '15px' : '13px'
  const infoLabelW    = is80 ? '72px' : '62px'

  const formatRp = (n) =>
    'Rp\u00a0' + new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0 }).format(n ?? 0)

  const formatTanggal = (str) => {
    const d = new Date(str)
    return d.toLocaleString('id-ID', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  }

  const e = (s) => String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  function infoRow(label, value) {
    return `<div class="info-row"><span class="info-lbl">${e(label)}</span><span class="info-col">:</span><span class="info-val">${e(value)}</span></div>`
  }

  // Header toko
  let headerHtml = `<div class="store-name">${e(settings.nama_usaha || 'Toko Saya')}</div>`
  if (settings.alamat) headerHtml += `<div class="sub-info">${e(settings.alamat)}</div>`
  if (settings.kota)   headerHtml += `<div class="sub-info">${e(settings.kota)}</div>`
  if (settings.no_hp)  headerHtml += `<div class="sub-info">Telp: ${e(settings.no_hp)}</div>`

  // Item
  const itemsHtml = (transaksi.items || []).map((item, idx) => {
    let h = `<div class="item-name">${idx + 1}. ${e(item.nama_produk)}</div>`
    h += `<div class="item-sub"><span>${item.qty} x ${formatRp(item.harga_satuan)}</span><span>${formatRp(item.subtotal)}</span></div>`
    if ((item.diskon_item_nominal || 0) > 0) {
      h += `<div class="item-disc">Diskon: -${formatRp(item.diskon_item_nominal * item.qty)}</div>`
    } else if ((item.diskon_item_persen || 0) > 0) {
      h += `<div class="item-disc">Diskon: -${item.diskon_item_persen}%</div>`
    }
    return `<div class="item">${h}</div>`
  }).join('')

  // Ringkasan
  let summaryHtml = `<div class="sum-row"><span>Subtotal</span><span>${formatRp(transaksi.subtotal)}</span></div>`
  if ((transaksi.diskon_nominal || 0) > 0) {
    const dl = 'Diskon' + (transaksi.diskon_persen > 0 ? ` (${transaksi.diskon_persen}%)` : '')
    summaryHtml += `<div class="sum-row"><span>${e(dl)}</span><span>-${formatRp(transaksi.diskon_nominal)}</span></div>`
  }
  // Tampilkan baris pajak hanya jika setting tampil_pajak_struk !== '0'
  if (settings.tampil_pajak_struk !== '0' && (transaksi.pajak_nominal || 0) > 0) {
    summaryHtml += `<div class="sum-row"><span>Pajak (${transaksi.pajak_persen}%)</span><span>${formatRp(transaksi.pajak_nominal)}</span></div>`
  }

  // Tunai
  let tunaiHtml = ''
  if (transaksi.metode_bayar === 'tunai') {
    tunaiHtml = `
      <hr class="sep-dash">
      <div class="sum-row"><span>Bayar</span><span>${formatRp(transaksi.bayar || 0)}</span></div>
      <div class="sum-row"><span>Kembalian</span><span>${formatRp(transaksi.kembalian || 0)}</span></div>`
  }

  const footerHtml = settings.catatan_struk
    ? `<div class="footer">${e(settings.catatan_struk)}</div>`
    : ''

  const metBayar = transaksi.metode_bayar === 'tunai' ? 'Tunai' : (transaksi.metode_bayar || '-')

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html { background: #d8d8d8; }
  body {
    font-family: 'Courier New', Courier, monospace;
    font-size: ${baseFontSize};
    color: #000;
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
  .store-name {
    text-align: center;
    font-size: ${headerFont};
    font-weight: 900;
    margin-bottom: 2px;
    letter-spacing: 0.5px;
  }
  .sub-info {
    text-align: center;
    font-size: 11px;
    line-height: 1.45;
  }
  .sep-dash {
    border: none;
    border-top: 1px dashed #666;
    margin: 5px 0;
  }
  .sep-solid {
    border: none;
    border-top: 2px solid #000;
    margin: 3px 0;
  }
  .info-row {
    display: flex;
    align-items: flex-start;
    font-size: 11px;
    line-height: 1.55;
  }
  .info-lbl { width: ${infoLabelW}; flex-shrink: 0; }
  .info-col { padding: 0 3px; flex-shrink: 0; }
  .info-val { flex: 1; word-break: break-word; }
  .item { margin: 2px 0; }
  .item-name { font-size: 11px; font-weight: 700; }
  .item-sub {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    padding-left: 10px;
  }
  .item-disc { font-size: 10px; padding-left: 10px; }
  .sum-row {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    line-height: 1.65;
  }
  .total-row {
    display: flex;
    justify-content: space-between;
    font-size: ${totalFont};
    font-weight: 900;
    line-height: 1.9;
  }
  .footer {
    text-align: center;
    font-size: 11px;
    margin-top: 8px;
    font-style: italic;
  }
  @media print {
    html { background: none; }
    body { padding: 0; display: block; }
    .paper {
      box-shadow: none;
      width: 100%;
      min-width: unset;
      max-width: unset;
      padding: 1mm 3mm 0 3mm;
    }
    @page { size: ${paperW} auto; margin: 0; }
  }
</style>
</head>
<body>
<div class="paper">
  <div class="header">
    ${headerHtml}
  </div>
  <hr class="sep-dash">
  ${infoRow('No', transaksi.no_transaksi || '-')}
  ${infoRow('Tanggal', formatTanggal(transaksi.tanggal))}
  ${infoRow('Kasir', transaksi.nama_kasir || '-')}
  ${transaksi.nama_customer ? infoRow('Customer', transaksi.nama_customer) : ''}
  ${infoRow('Pembayaran', metBayar)}
  <hr class="sep-dash">
  ${itemsHtml}
  <hr class="sep-dash">
  ${summaryHtml}
  <hr class="sep-solid">
  <div class="total-row"><span>** TOTAL **</span><span>${formatRp(transaksi.total)}</span></div>
  <hr class="sep-solid">
  ${tunaiHtml}
  ${footerHtml}
</div>
</body>
</html>`
}

