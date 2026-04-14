const { ipcMain, app } = require('electron')
const path = require('path')
const fs = require('fs')
const archiver = require('archiver')
const extractZip = require('extract-zip')

function registerBackupHandlers(dataDir, db) {

  ipcMain.handle('backup:create', async (event, savePath) => {
    // Gunakan db.backup() agar safe dengan WAL mode
    // (flush WAL ke file utama dulu via checkpoint, lalu backup atomik)
    const tempDbPath = path.join(dataDir, '_backup_db_temp.db')
    try {
      await db.backup(tempDbPath)
    } catch (e) {
      if (fs.existsSync(tempDbPath)) fs.unlinkSync(tempDbPath)
      throw e
    }

    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(savePath)
      const archive = archiver('zip', { zlib: { level: 9 } })

      output.on('close', () => {
        if (fs.existsSync(tempDbPath)) fs.unlinkSync(tempDbPath)
        resolve({ size: archive.pointer() })
      })
      archive.on('error', (err) => {
        if (fs.existsSync(tempDbPath)) fs.unlinkSync(tempDbPath)
        reject(err)
      })

      archive.pipe(output)

      // Add database (hasil snapshot yang aman)
      archive.file(tempDbPath, { name: 'database.db' })

      // Add foto produk saja (logo usaha tidak diikutkan)
      const productsDir = path.join(dataDir, 'images', 'products')
      if (fs.existsSync(productsDir)) {
        archive.directory(productsDir, 'images/products')
      }

      // Add backup info
      const info = {
        version: '1.0.0',
        date: new Date().toISOString(),
        platform: process.platform
      }
      archive.append(JSON.stringify(info, null, 2), { name: 'backup-info.json' })

      archive.finalize()
    })
  })

  ipcMain.handle('backup:restore', async (event, filePath) => {
    const tempDir = path.join(dataDir, '_restore_temp')
    const rollbackDbPath = path.join(dataDir, '_rollback_kasirku.db')
    const rollbackImagesPath = path.join(dataDir, '_rollback_images')
    let rolledBack = false

    try {
      // Extract to temp directory
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true })
      }
      fs.mkdirSync(tempDir, { recursive: true })

      await extractZip(filePath, { dir: path.resolve(tempDir) })

      // ── Path traversal validation ─────────────────────────────
      // Pastikan semua file yang diekstrak berada di dalam tempDir
      const resolvedTemp = path.resolve(tempDir)
      function assertInsideTemp(p) {
        const resolved = path.resolve(p)
        if (!resolved.startsWith(resolvedTemp + path.sep) && resolved !== resolvedTemp) {
          throw new Error('File backup mencurigakan: path traversal terdeteksi')
        }
      }
      function walkDir(dir) {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          const full = path.join(dir, entry.name)
          assertInsideTemp(full)
          if (entry.isDirectory()) walkDir(full)
        }
      }
      walkDir(tempDir)

      // Validate backup
      const infoPath = path.join(tempDir, 'backup-info.json')
      if (!fs.existsSync(infoPath)) {
        throw new Error('File backup tidak valid')
      }

      // ── Buat rollback snapshot sebelum overwrite ──────────────
      const targetDb = path.join(dataDir, 'kasirku.db')
      const targetImages = path.join(dataDir, 'images')

      if (fs.existsSync(targetDb)) fs.copyFileSync(targetDb, rollbackDbPath)
      if (fs.existsSync(targetImages)) fs.cpSync(targetImages, rollbackImagesPath, { recursive: true })

      // Tutup koneksi DB sebelum overwrite file
      db.close()

      // Replace database
      const backupDb = path.join(tempDir, 'database.db')
      if (fs.existsSync(backupDb)) {
        fs.copyFileSync(backupDb, targetDb)
        // Hapus WAL/SHM lama agar tidak konflik
        const walPath = targetDb + '-wal'
        const shmPath = targetDb + '-shm'
        if (fs.existsSync(walPath)) fs.unlinkSync(walPath)
        if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath)
      }

      // Replace foto produk saja (logo usaha tidak di-restore)
      const backupProducts = path.join(tempDir, 'images', 'products')
      if (fs.existsSync(backupProducts)) {
        const targetProducts = path.join(targetImages, 'products')
        if (fs.existsSync(targetProducts)) {
          fs.rmSync(targetProducts, { recursive: true })
        }
        fs.mkdirSync(targetImages, { recursive: true })
        fs.cpSync(backupProducts, targetProducts, { recursive: true })
      }

      // Clean up temp & rollback snapshots
      fs.rmSync(tempDir, { recursive: true })
      if (fs.existsSync(rollbackDbPath)) fs.unlinkSync(rollbackDbPath)
      if (fs.existsSync(rollbackImagesPath)) fs.rmSync(rollbackImagesPath, { recursive: true })

      // Restart app sepenuhnya agar DB connection baru terbentuk dengan data restored
      app.relaunch()
      app.quit()

      return { success: true }
    } catch (err) {
      // ── Rollback jika ada snapshot ────────────────────────────
      if (!rolledBack) {
        try {
          const targetDb = path.join(dataDir, 'kasirku.db')
          const targetImages = path.join(dataDir, 'images')
          if (fs.existsSync(rollbackDbPath)) {
            fs.copyFileSync(rollbackDbPath, targetDb)
            fs.unlinkSync(rollbackDbPath)
          }
          if (fs.existsSync(rollbackImagesPath)) {
            if (fs.existsSync(targetImages)) fs.rmSync(targetImages, { recursive: true })
            fs.cpSync(rollbackImagesPath, targetImages, { recursive: true })
            fs.rmSync(rollbackImagesPath, { recursive: true })
          }
        } catch (_) { /* best-effort rollback */ }
      }
      // Clean up temp
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true })
      }
      throw err
    }
  })

  ipcMain.handle('backup:getInfo', async (event, filePath) => {
    const tempDir = path.join(dataDir, '_backup_info_temp')
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true })
      }
      fs.mkdirSync(tempDir, { recursive: true })

      await extractZip(filePath, { dir: path.resolve(tempDir) })

      // Path traversal validation
      const resolvedTemp = path.resolve(tempDir)
      function assertInsideTempInfo(p) {
        const resolved = path.resolve(p)
        if (!resolved.startsWith(resolvedTemp + path.sep) && resolved !== resolvedTemp) {
          throw new Error('File backup mencurigakan: path traversal terdeteksi')
        }
      }
      function walkDirInfo(dir) {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          const full = path.join(dir, entry.name)
          assertInsideTempInfo(full)
          if (entry.isDirectory()) walkDirInfo(full)
        }
      }
      walkDirInfo(tempDir)

      const infoPath = path.join(tempDir, 'backup-info.json')
      if (!fs.existsSync(infoPath)) {
        throw new Error('File backup tidak valid')
      }

      const info = JSON.parse(fs.readFileSync(infoPath, 'utf-8'))
      fs.rmSync(tempDir, { recursive: true })
      return info
    } catch (err) {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true })
      }
      throw err
    }
  })
}

module.exports = { registerBackupHandlers }
