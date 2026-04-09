const { ipcMain } = require('electron')
const path = require('path')
const fs = require('fs')
const archiver = require('archiver')
const extractZip = require('extract-zip')

function registerBackupHandlers(dataDir) {

  ipcMain.handle('backup:create', async (event, savePath) => {
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(savePath)
      const archive = archiver('zip', { zlib: { level: 9 } })

      output.on('close', () => resolve({ size: archive.pointer() }))
      archive.on('error', (err) => reject(err))

      archive.pipe(output)

      // Add database
      const dbPath = path.join(dataDir, 'kasirku.db')
      if (fs.existsSync(dbPath)) {
        archive.file(dbPath, { name: 'database.db' })
      }

      // Add images folder
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

      // Replace database
      const backupDb = path.join(tempDir, 'database.db')
      if (fs.existsSync(backupDb)) {
        const targetDb = path.join(dataDir, 'kasirku.db')
        fs.copyFileSync(backupDb, targetDb)
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
