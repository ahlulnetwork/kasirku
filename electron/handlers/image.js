const { ipcMain } = require('electron')
const path = require('path')
const fs = require('fs')
const crypto = require('crypto')

function getImageExt(sourcePath, fallbackExt) {
  const ext = path.extname(sourcePath || '').toLowerCase()
  if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) return ext
  return fallbackExt
}

function getMimeType(filePath) {
  const ext = path.extname(filePath || '').toLowerCase()
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg'
  if (ext === '.webp') return 'image/webp'
  return 'image/png'
}

function registerImageHandlers(dataDir) {
  const imagesDir = path.join(dataDir, 'images')

  ipcMain.handle('image:compressLogo', async (event, sourcePath) => {
    const filename = `logo_${crypto.randomBytes(4).toString('hex')}${getImageExt(sourcePath, '.png')}`
    const destPath = path.join(imagesDir, 'logo', filename)

    fs.copyFileSync(sourcePath, destPath)

    return destPath.replace(/\\/g, '/')
  })

  ipcMain.handle('image:compressProduct', async (event, sourcePath) => {
    const filename = `product_${crypto.randomBytes(4).toString('hex')}${getImageExt(sourcePath, '.jpg')}`
    const destPath = path.join(imagesDir, 'products', filename)

    fs.copyFileSync(sourcePath, destPath)

    return destPath.replace(/\\/g, '/')
  })

  ipcMain.handle('image:toGrayscale', async (event, sourcePath) => {
    try {
      const realPath = sourcePath.replace(/\//g, path.sep)
      const buffer = fs.readFileSync(realPath)
      const base64 = buffer.toString('base64')
      const mimeType = getMimeType(realPath)

      return `data:${mimeType};base64,${base64}`
    } catch (e) {
      console.error('image:toGrayscale error:', e)
      throw e
    }
  })
}

module.exports = { registerImageHandlers }
