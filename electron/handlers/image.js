const { ipcMain, nativeImage } = require('electron')
const path = require('path')
const fs = require('fs')
const crypto = require('crypto')

// Resize image to fit inside maxW x maxH without enlarging
function resizeToFit(img, maxW, maxH) {
  const { width, height } = img.getSize()
  if (width <= maxW && height <= maxH) return img
  const ratio = Math.min(maxW / width, maxH / height)
  return img.resize({ width: Math.round(width * ratio), height: Math.round(height * ratio), quality: 'best' })
}

function registerImageHandlers(dataDir) {
  const imagesDir = path.join(dataDir, 'images')

  ipcMain.handle('image:compressLogo', async (event, sourcePath) => {
    const filename = `logo_${crypto.randomBytes(4).toString('hex')}.png`
    const destPath = path.join(imagesDir, 'logo', filename)

    const img = nativeImage.createFromPath(sourcePath)
    if (img.isEmpty()) throw new Error('Gagal membaca file gambar')
    const resized = resizeToFit(img, 200, 200)
    fs.writeFileSync(destPath, resized.toPNG())

    return destPath.replace(/\\/g, '/')
  })

  ipcMain.handle('image:compressProduct', async (event, sourcePath) => {
    const filename = `product_${crypto.randomBytes(4).toString('hex')}.jpg`
    const destPath = path.join(imagesDir, 'products', filename)

    const img = nativeImage.createFromPath(sourcePath)
    if (img.isEmpty()) throw new Error('Gagal membaca file gambar')
    const resized = resizeToFit(img, 400, 400)
    fs.writeFileSync(destPath, resized.toJPEG(75))

    return destPath.replace(/\\/g, '/')
  })

  ipcMain.handle('image:toGrayscale', async (event, sourcePath) => {
    const img = nativeImage.createFromPath(sourcePath)
    if (img.isEmpty()) throw new Error('Gagal membaca file gambar')
    const resized = resizeToFit(img, 200, 200)
    const base64 = resized.toPNG().toString('base64')

    return `data:image/png;base64,${base64}`
  })
}

module.exports = { registerImageHandlers }
