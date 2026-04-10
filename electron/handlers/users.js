const { ipcMain } = require('electron')
const crypto = require('crypto')

// PBKDF2 hash (format: "pbkdf2:<salt_hex>:<hash_hex>")
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex')
  return `pbkdf2:${salt}:${hash}`
}

// Verifikasi password — support hash lama (SHA-256 plain) dan baru (PBKDF2)
function verifyPassword(password, stored) {
  if (stored.startsWith('pbkdf2:')) {
    const [, salt, hash] = stored.split(':')
    const check = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex')
    return crypto.timingSafeEqual(Buffer.from(check, 'hex'), Buffer.from(hash, 'hex'))
  }
  // Hash lama: SHA-256 tanpa salt
  const legacy = crypto.createHash('sha256').update(password).digest('hex')
  return legacy === stored
}

function registerUserHandlers(db) {
  // Get all users (no password hash returned)
  ipcMain.handle('db:users:getAll', () => {
    return db.prepare('SELECT id, username, nama_kasir, role, aktif, created_at FROM users ORDER BY id ASC').all()
  })

  // Login
  ipcMain.handle('db:users:login', (_, username, password) => {
    const row = db.prepare(
      'SELECT id, username, nama_kasir, role, password_hash FROM users WHERE username = ? AND aktif = 1'
    ).get(username)
    if (!row) return { success: false, error: 'Username atau password salah.' }
    if (!verifyPassword(password, row.password_hash)) return { success: false, error: 'Username atau password salah.' }

    // Auto-upgrade hash lama ke PBKDF2
    if (!row.password_hash.startsWith('pbkdf2:')) {
      db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(password), row.id)
    }

    const { password_hash: _ph, ...user } = row
    return { success: true, user }
  })

  // Create user
  ipcMain.handle('db:users:create', (_, data) => {
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(data.username)
    if (existing) return { success: false, error: 'Username sudah digunakan.' }
    const hash = hashPassword(data.password)
    db.prepare(
      "INSERT INTO users (username, password_hash, nama_kasir, role) VALUES (?, ?, ?, ?)"
    ).run(data.username, hash, data.nama_kasir || '', data.role || 'kasir')
    return { success: true }
  })

  // Update user (without changing password)
  ipcMain.handle('db:users:update', (_, id, data) => {
    try {
      if (data.password && data.password.trim()) {
        db.prepare(
          'UPDATE users SET username = ?, password_hash = ?, nama_kasir = ?, role = ?, aktif = ? WHERE id = ?'
        ).run(data.username, hashPassword(data.password), data.nama_kasir || '', data.role, data.aktif ?? 1, id)
      } else {
        db.prepare(
          'UPDATE users SET username = ?, nama_kasir = ?, role = ?, aktif = ? WHERE id = ?'
        ).run(data.username, data.nama_kasir || '', data.role, data.aktif ?? 1, id)
      }
      return { success: true }
    } catch (e) {
      console.error('update user error:', e.message)
      return { success: false, error: e.message }
    }
  })

  // Change own password (requires old password)
  ipcMain.handle('db:users:changePassword', (_, id, oldPassword, newPassword) => {
    const row = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(id)
    if (!row || !verifyPassword(oldPassword, row.password_hash)) {
      return { success: false, error: 'Password lama salah.' }
    }
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(newPassword), id)
    return { success: true }
  })

  // Reset password by admin (no old password needed)
  ipcMain.handle('db:users:resetPassword', (_, id, newPassword) => {
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(newPassword), id)
    return { success: true }
  })

  // Check if first run (only default admin/admin exists)
  ipcMain.handle('db:users:isFirstRun', () => {
    const users = db.prepare('SELECT * FROM users').all()
    if (users.length !== 1) return false
    const u = users[0]
    if (u.username !== 'admin') return false
    return verifyPassword('admin', u.password_hash)
  })

  // First run setup: update admin username + password + save nama_kasir setting
  ipcMain.handle('db:users:firstRunSetup', (_, { namaKasir, username, password }) => {
    const existing = db.prepare('SELECT id FROM users WHERE username = ? AND id != 1').get(username)
    if (existing) return { success: false, error: 'Username sudah digunakan.' }
    db.prepare('UPDATE users SET username = ?, password_hash = ? WHERE id = 1')
      .run(username, hashPassword(password))
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('nama_kasir', ?)")
      .run(namaKasir)
    return { success: true }
  })

  // Delete user
  ipcMain.handle('db:users:delete', (_, id) => {
    const user = db.prepare('SELECT role FROM users WHERE id = ?').get(id)
    if (user?.role === 'admin') {
      const adminCount = db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'admin'").get()
      if (adminCount.c <= 1) {
        return { success: false, error: 'Tidak dapat menghapus admin terakhir.' }
      }
    }
    db.prepare('DELETE FROM users WHERE id = ?').run(id)
    return { success: true }
  })
}

module.exports = { registerUserHandlers, hashPassword }
