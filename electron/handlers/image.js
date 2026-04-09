const { ipcMain } = require('electron')
const sharp = require('sharp')
const path = require('path')
const fs = require('fs')
const crypto = require('crypto')

function registerImageHandlers(dataDir) {
  const imagesDir = path.join(dataDir, 'images')

  ipcMain.handle('image:compressLogo', async (event, sourcePath) => {
    const filename = `logo_${crypto.randomBytes(4).toString('hex')}.png`
    const destPath = path.join(imagesDir, 'logo', filename)

    await sharp(sourcePath)
      .resize(200, 200, { fit: 'inside', withoutEnlargement: true })
      .png({ quality: 80 })
      .toFile(destPath)

    return destPath
  })

  ipcMain.handle('image:compressProduct', async (event, sourcePath) => {
    const filename = `product_${crypto.randomBytes(4).toString('hex')}.jpg`
    const destPath = path.join(imagesDir, 'products', filename)

    await sharp(sourcePath)
      .resize(400, 400, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 75 })
      .toFile(destPath)

    return destPath
  })

  ipcMain.handle('image:toGrayscale', async (event, sourcePath) => {
    const buffer = await sharp(sourcePath)
      .grayscale()
      .resize(200, null, { fit: 'inside', withoutEnlargement: true })
      .png()
      .toBuffer()

    return `data:image/png;base64,${buffer.toString('base64')}`
  })
}

module.exports = { registerImageHandlers }
