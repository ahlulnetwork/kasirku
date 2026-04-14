/**
 * Generate nomor transaksi: HHMMSSmmm
 * Tanggal tidak perlu dimasukkan karena sudah ada di field tanggal transaksi.
 */
export function generateNoTransaksi() {
  const now = new Date()
  const h   = String(now.getHours()).padStart(2, '0')
  const min = String(now.getMinutes()).padStart(2, '0')
  const s   = String(now.getSeconds()).padStart(2, '0')
  const ms  = String(now.getMilliseconds()).padStart(3, '0')

  return `${h}${min}${s}${ms}`
}
