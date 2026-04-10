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

      // Add images folder (foto produk + logo)
      const imagesDir = path.join(dataDir, 'images')
      if (fs.existsSync(imagesDir)) {
        archive.directory(imagesDir, 'images')
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

    try {
      // Extract to temp directory
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true })
      }
      fs.mkdirSync(tempDir, { recursive: true })

      await extractZip(filePath, { dir: tempDir })

      // Validate backup
      const infoPath = path.join(tempDir, 'backup-info.json')
      if (!fs.existsSync(infoPath)) {
        throw new Error('File backup tidak valid')
      }

      // Tutup koneksi DB sebelum overwrite file
      db.close()

      // Replace database
      const backupDb = path.join(tempDir, 'database.db')
      if (fs.existsSync(backupDb)) {
        const targetDb = path.join(dataDir, 'kasirku.db')
        fs.copyFileSync(backupDb, targetDb)
        // Hapus WAL/SHM lama agar tidak konflik
        const walPath = targetDb + '-wal'
        const shmPath = targetDb + '-shm'
        if (fs.existsSync(walPath)) fs.unlinkSync(walPath)
        if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath)
      }

      // Replace images
      const backupImages = path.join(tempDir, 'images')
      if (fs.existsSync(backupImages)) {
        const targetImages = path.join(dataDir, 'images')
        if (fs.existsSync(targetImages)) {
          fs.rmSync(targetImages, { recursive: true })
        }
        fs.cpSync(backupImages, targetImages, { recursive: true })
      }

      // Clean up temp
      fs.rmSync(tempDir, { recursive: true })

      // Restart app sepenuhnya agar DB connection baru terbentuk dengan data restored
      app.relaunch()
      app.quit()

      return { success: true }
    } catch (err) {
      // Clean up temp on error
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

      await extractZip(filePath, { dir: tempDir })

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
