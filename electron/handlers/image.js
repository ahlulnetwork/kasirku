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

function createThermalSVG(sourcePath) {
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

  // Algoritma RLE (Run Length Encoding) untuk membuat elemen <rect> SVG 
  // yang kompatibel 100% dengan filter driver printer thermal Windows.
  // Raster <img> sering diblokir, vektor <rect> GDI selalu dicetak sempurna.
  let rects = ''
  
  for (let y = 0; y < height; y++) {
    let startX = -1
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4
      const blue = bitmap[idx]
      const green = bitmap[idx + 1]
      const red = bitmap[idx + 2]
      const alpha = bitmap[idx + 3]

      // Latar belakang transparan dianggap putih (brightness tinggi)
      const a = alpha / 255
      const bg = 255 * (1 - a)
      const r = red * a + bg
      const g = green * a + bg
      const b = blue * a + bg
      
      const brightness = Math.round((r * 0.299) + (g * 0.587) + (b * 0.114))
      const isBlack = brightness < 180 // threshold

      if (isBlack) {
        if (startX === -1) startX = x
      } else {
        if (startX !== -1) {
          rects += `<rect x="${startX}" y="${y}" width="${x - startX}" height="1" fill="#000" />`
          startX = -1
        }
      }
    }
    if (startX !== -1) {
      rects += `<rect x="${startX}" y="${y}" width="${width - startX}" height="1" fill="#000" />`
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">${rects}</svg>`
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
      return createThermalSVG(realPath)
    } catch (e) {
      console.error('image:toGrayscale failed to create SVG:', e)
      throw e
    }
  })

  ipcMain.handle('image:getBase64', async (event, sourcePath) => {
    const realPath = sourcePath.replace(/\//g, path.sep)
    if (!fs.existsSync(realPath)) throw new Error('File tidak ditemukan')
    const buf = fs.readFileSync(realPath)
    const mime = getMimeType(realPath)
    return `data:${mime};base64,${buf.toString('base64')}`
  })
}

module.exports = { registerImageHandlers }
