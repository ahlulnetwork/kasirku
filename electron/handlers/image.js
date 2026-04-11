const { ipcMain, nativeImage } = require('electron')
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

function createThermalLogoDataUrl(sourcePath) {
  const image = nativeImage.createFromPath(sourcePath)
  if (image.isEmpty()) {
    throw new Error('Gagal memuat file logo')
  }

  const originalSize = image.getSize()
  const maxWidth = 180
  const targetWidth = Math.min(maxWidth, originalSize.width || maxWidth)
  const resized = image.resize({ width: targetWidth, quality: 'best' })
  const { width, height } = resized.getSize()
  const bitmap = resized.toBitmap()
  const output = Buffer.alloc(bitmap.length)

  for (let index = 0; index < bitmap.length; index += 4) {
    const blue = bitmap[index]
    const green = bitmap[index + 1]
    const red = bitmap[index + 2]
    const alpha = bitmap[index + 3] / 255

    // Flatten alpha channel ke background putih agar printer thermal tidak membuat artefak.
    const flatRed = Math.round((red * alpha) + (255 * (1 - alpha)))
    const flatGreen = Math.round((green * alpha) + (255 * (1 - alpha)))
    const flatBlue = Math.round((blue * alpha) + (255 * (1 - alpha)))
    const gray = Math.round((flatRed * 0.299) + (flatGreen * 0.587) + (flatBlue * 0.114))
    const mono = gray < 205 ? 0 : 255

    output[index] = mono
    output[index + 1] = mono
    output[index + 2] = mono
    output[index + 3] = 255
  }

  return nativeImage.createFromBitmap(output, { width, height }).toDataURL()
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
      return createThermalLogoDataUrl(realPath)
    } catch (e) {
      console.error('image:toGrayscale error:', e)
      throw e
    }
  })
}

module.exports = { registerImageHandlers }
