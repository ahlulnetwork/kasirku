/**
 * Generate nomor transaksi: TRX-YYYYMMDD-XXXX
 */
export function generateNoTransaksi() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const h = String(now.getHours()).padStart(2, '0')
  const min = String(now.getMinutes()).padStart(2, '0')
  const s = String(now.getSeconds()).padStart(2, '0')
  const ms = String(now.getMilliseconds()).padStart(3, '0')

  return `TRX-${y}${m}${d}-${h}${min}${s}${ms}`
}
