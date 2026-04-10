/**
 * Generate HTML struk thermal
 * @param {Object} transaksi - data transaksi
 * @param {Object} settings - settings usaha
 * @param {string} logoBase64 - logo dalam base64 grayscale (opsional)
 */
export function generateReceiptHTML(transaksi, settings, logoBase64 = null) {
  const lebarMm = settings.lebar_kertas === '80' ? '80mm' : '58mm'
  const fontBase = settings.lebar_kertas === '80' ? '13px' : '11px'

  const formatRp = (n) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)

  const formatTanggal = (str) => {
    const d = new Date(str)
    return d.toLocaleString('id-ID', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    })
  }

  const logoHtml = logoBase64
    ? `<img src="${logoBase64}" style="max-width:80px;max-height:60px;display:block;margin:0 auto 4px;" />`
    : ''

  const itemRows = (transaksi.items || []).map((item, index) => {
    const diskon = item.diskon_item_nominal > 0
      ? `<tr><td colspan="2" style="padding-left:8px;font-size:0.9em;color:#555">  Diskon: -${formatRp(item.diskon_item_nominal * item.qty)}</td></tr>`
      : item.diskon_item_persen > 0
        ? `<tr><td colspan="2" style="padding-left:8px;font-size:0.9em;color:#555">  Diskon: -${item.diskon_item_persen}%</td></tr>`
        : ''

    return `
      <tr>
        <td style="padding:2px 0">${index + 1}. ${item.nama_produk}</td>
        <td style="text-align:right;white-space:nowrap">${formatRp(item.subtotal)}</td>
      </tr>
      <tr>
        <td style="padding-left:8px;font-size:0.9em;color:#555;padding-bottom:2px">
          ${item.qty} x ${formatRp(item.harga_satuan)}
        </td>
        <td></td>
      </tr>
      ${diskon}
    `
  }).join('')

  const pajakRow = transaksi.pajak_nominal > 0 ? `
    <tr>
      <td>Pajak (${transaksi.pajak_persen}%)</td>
      <td style="text-align:right">${formatRp(transaksi.pajak_nominal)}</td>
    </tr>` : ''

  const diskonRow = transaksi.diskon_nominal > 0 ? `
    <tr>
      <td>Diskon${transaksi.diskon_persen > 0 ? ` (${transaksi.diskon_persen}%)` : ''}</td>
      <td style="text-align:right">-${formatRp(transaksi.diskon_nominal)}</td>
    </tr>` : ''

  const kembalianRow = transaksi.metode_bayar === 'tunai' ? `
    <tr>
      <td>Bayar</td>
      <td style="text-align:right">${formatRp(transaksi.bayar)}</td>
    </tr>
    <tr>
      <td><strong>Kembalian</strong></td>
      <td style="text-align:right"><strong>${formatRp(transaksi.kembalian)}</strong></td>
    </tr>` : ''

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Courier New', monospace;
    font-size: ${fontBase};
    width: ${lebarMm};
    padding: 4mm 3mm;
    color: #000;
  }
  .center { text-align: center; }
  .bold { font-weight: bold; }
  .separator { border-top: 1px dashed #000; margin: 4px 0; }
  table { width: 100%; border-collapse: collapse; }
  td { vertical-align: top; }
  .total-row td { font-weight: bold; font-size: 1.15em; padding-top: 4px; }
  .footer { text-align: center; margin-top: 6px; font-size: 0.9em; }
  @media print {
    @page { margin: 0; size: ${lebarMm} auto; }
    html, body { width: ${lebarMm}; }
  }
</style>
</head>
<body>
  <div class="center">
    ${logoHtml}
    <div class="bold" style="font-size:1.2em">${settings.nama_usaha || 'Toko Saya'}</div>
    ${settings.alamat ? `<div>${settings.alamat}</div>` : ''}
    ${settings.kota ? `<div>${settings.kota}</div>` : ''}
    ${settings.no_hp ? `<div>Telp: ${settings.no_hp}</div>` : ''}
  </div>

  <div class="separator"></div>

  <table>
    <tr>
      <td>No</td>
      <td style="text-align:right">${transaksi.no_transaksi}</td>
    </tr>
    <tr>
      <td>Tanggal</td>
      <td style="text-align:right">${formatTanggal(transaksi.tanggal)}</td>
    </tr>
    <tr>
      <td>Kasir</td>
      <td style="text-align:right">${transaksi.nama_kasir || '-'}</td>
    </tr>
    <tr>
      <td>Bayar via</td>
      <td style="text-align:right">${transaksi.metode_bayar === 'tunai' ? 'Tunai' : transaksi.metode_bayar}</td>
    </tr>
  </table>

  <div class="separator"></div>

  <table>
    ${itemRows}
  </table>

  <div class="separator"></div>

  <table>
    <tr>
      <td>Subtotal</td>
      <td style="text-align:right">${formatRp(transaksi.subtotal)}</td>
    </tr>
    ${diskonRow}
    ${pajakRow}
    <tr class="total-row">
      <td>TOTAL</td>
      <td style="text-align:right">${formatRp(transaksi.total)}</td>
    </tr>
    ${kembalianRow}
  </table>

  <div class="separator"></div>

  ${settings.catatan_struk ? `<div class="footer">${settings.catatan_struk}</div>` : ''}
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
<script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"><\/script>
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
  <script>
    document.addEventListener('DOMContentLoaded', function() {
      ${items.map(item => `
        try {
          JsBarcode("#barcode-${item.barcode}", "${item.barcode}", {
            format: "CODE128",
            width: 1.5,
            height: ${Math.max(h * 2, 20)},
            displayValue: true,
            fontSize: 8,
            margin: 0
          });
        } catch(e) {}
      `).join('')}
    });
  <\/script>
</body>
</html>`
}
