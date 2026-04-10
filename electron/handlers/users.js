const { ipcMain } = require('electron')
const crypto = require('crypto')

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex')
}

function registerUserHandlers(db) {
  // Get all users (no password hash returned)
  ipcMain.handle('db:users:getAll', () => {
    return db.prepare('SELECT id, username, nama_kasir, role, aktif, created_at FROM users ORDER BY id ASC').all()
  })

  // Login
  ipcMain.handle('db:users:login', (_, username, password) => {
    const hash = hashPassword(password)
    const user = db.prepare(
      'SELECT id, username, nama_kasir, role FROM users WHERE username = ? AND password_hash = ? AND aktif = 1'
    ).get(username, hash)
    if (user) return { success: true, user }
    return { success: false, error: 'Username atau password salah.' }
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
    const user = db.prepare(
      'SELECT id FROM users WHERE id = ? AND password_hash = ?'
    ).get(id, hashPassword(oldPassword))
    if (!user) return { success: false, error: 'Password lama salah.' }
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
    return u.username === 'admin' && u.password_hash === hashPassword('admin')
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
