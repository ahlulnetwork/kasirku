const { ipcMain } = require('electron')
const crypto = require('crypto')
const os = require('os')
const fs = require('fs')

// Secret internal — tidak terekspos ke renderer
const LICENSE_SECRET = 'KasirKu@2026#Lisensi!SecretKey'
// Password admin untuk generator — tidak pernah dikirim ke frontend
const ADMIN_PASSWORD = '087770666334'

function getDeviceId() {
  const interfaces = os.networkInterfaces()
  const macs = []
  for (const ifaces of Object.values(interfaces)) {
    for (const addr of ifaces) {
      if (!addr.internal && addr.mac && addr.mac !== '00:00:00:00:00:00') {
        macs.push(addr.mac.toUpperCase())
      }
    }
  }
  const cpuModel = os.cpus()[0]?.model || 'unknown'
  const raw = [cpuModel, ...macs.sort(), os.hostname()].join('|')
  const hash = crypto.createHash('sha256').update(raw).digest('hex').toUpperCase()
  // Format: XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX (32 hex chars)
  return `${hash.slice(0,8)}-${hash.slice(8,16)}-${hash.slice(16,24)}-${hash.slice(24,32)}`
}

function generateLicenseKey(deviceId) {
  const id = deviceId.replace(/-/g, '').toUpperCase()
  const hmac = crypto.createHmac('sha256', LICENSE_SECRET).update(id).digest('hex').toUpperCase()
  const k = hmac.slice(0, 25)
  return `${k.slice(0,5)}-${k.slice(5,10)}-${k.slice(10,15)}-${k.slice(15,20)}-${k.slice(20,25)}`
}

function validateKey(deviceId, licenseKey) {
  try {
    const expected = generateLicenseKey(deviceId)
    return expected === licenseKey.trim().toUpperCase()
  } catch {
    return false
  }
}

function registerActivationHandlers(activationFile) {
  // Session flag: admin sudah terverifikasi di sesi ini (in-memory only, reset saat app restart)
  let adminVerified = false

  ipcMain.handle('activation:getDeviceId', () => getDeviceId())

  ipcMain.handle('activation:checkStatus', () => {
    try {
      const data = JSON.parse(fs.readFileSync(activationFile, 'utf8'))
      return data.activated === true && validateKey(getDeviceId(), data.licenseKey)
    } catch {
      return false
    }
  })

  ipcMain.handle('activation:activate', (_, licenseKey) => {
    if (validateKey(getDeviceId(), licenseKey)) {
      fs.writeFileSync(activationFile, JSON.stringify({
        activated: true,
        licenseKey: licenseKey.trim().toUpperCase(),
        activatedAt: new Date().toISOString()
      }, null, 2))
      return { success: true }
    }
    return { success: false, error: 'Kode aktivasi tidak valid untuk perangkat ini.' }
  })

  // Verifikasi password admin — set session flag, password tidak pernah dikirim balik ke renderer
  ipcMain.handle('activation:checkAdminPass', (_, adminPass) => {
    if (adminPass === ADMIN_PASSWORD) {
      adminVerified = true
      return true
    }
    adminVerified = false
    return false
  })

  // Generator — hanya bisa dipanggil setelah checkAdminPass berhasil di sesi ini
  ipcMain.handle('activation:generateKey', (_, deviceId) => {
    if (!adminVerified) {
      return { success: false, error: 'Tidak terotorisasi.' }
    }
    if (!deviceId || deviceId.trim().length < 10) {
      return { success: false, error: 'Device ID tidak valid.' }
    }
    return { success: true, key: generateLicenseKey(deviceId.trim().toUpperCase()) }
  })
}

module.exports = { registerActivationHandlers }
