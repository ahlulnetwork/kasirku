const { ipcMain, BrowserWindow } = require('electron')
const path = require('path')
const fs = require('fs')
const os = require('os')

function getLabelPageSize(labelConfig = {}, printerName = '') {
  const ukuranLabel = String(labelConfig.ukuran_label || '40x25')
  const [labelWidthRaw, labelHeightRaw] = ukuranLabel.split('x').map(Number)
  const labelWidth = Number.isFinite(labelWidthRaw) ? labelWidthRaw : 40
  const labelHeight = Number.isFinite(labelHeightRaw) ? labelHeightRaw : 25
  const columns = Math.max(1, parseInt(labelConfig.label_kolom || '2', 10) || 1)
  const itemCount = Math.max(1, parseInt(labelConfig.itemCount || '1', 10) || 1)
  const rowCount = Math.max(1, Math.ceil(itemCount / columns))
  const printerText = String(printerName || '').toUpperCase()
  const is58Printer = printerText.includes('58') || printerText.includes('TM-58') || printerText.includes('TM58')
  const paperWidth = columns === 1 ? Math.max(labelWidth, is58Printer ? 58 : labelWidth) : (labelWidth * columns)

  return {
    width: paperWidth * 1000,
    height: labelHeight * rowCount * 1000
  }
}

async function waitForImagesToLoad(printWin) {
  for (let attempt = 0; attempt < 20; attempt++) {
    const ready = await printWin.webContents.executeJavaScript(`
      Array.from(document.images).every(img => img.complete && img.naturalWidth > 0)
    `, true)

    if (ready) return

    await new Promise(resolve => setTimeout(resolve, 150))
  }
}

function registerPrintHandlers(getMainWindow) {

  ipcMain.handle('print:receipt', async (event, html, printerName, paperWidth) => {
    // Write to temp file so images (base64 logo) have time to fully render before print.
    // data: URL + did-finish-load fires before Chromium finishes painting, so logo is missed.
    const tmpPath = path.join(os.tmpdir(), `kasirku_receipt_${Date.now()}.html`)
    fs.writeFileSync(tmpPath, html, 'utf8')

    return new Promise((resolve, reject) => {
      const printWin = new BrowserWindow({
        show: false,
        webPreferences: { contextIsolation: true }
      })

      printWin.loadFile(tmpPath)

      printWin.webContents.on('did-finish-load', async () => {
        const widthMm = paperWidth === '80' ? 80 : 58
        // Delay 400ms to ensure base64 logo image is fully rendered before printing
        setTimeout(async () => {
          await waitForImagesToLoad(printWin)
          const options = {
            silent: true,
            printBackground: true,
            deviceName: printerName || undefined,
            margins: { marginType: 'none' },
            pageSize: { width: widthMm * 1000, height: 2970000 }
          }

          printWin.webContents.print(options, (success, errorType) => {
            setTimeout(() => {
              if (printWin && !printWin.isDestroyed()) printWin.close()
              try { fs.unlinkSync(tmpPath) } catch (e) {}
            }, 2000)

            if (success) {
              resolve(true)
            } else {
              reject(new Error(errorType || 'Print failed'))
            }
          })
        }, 500)
      })
    })
  })

  ipcMain.handle('print:label', async (event, html, printerName, labelConfig = {}) => {
    // Barcode SVG sudah di-generate di renderer process — langsung cetak
    const cleanHtml = html
      .replace(/<script[^>]+cdn\.jsdelivr\.net[^>]*><\/script>/g, '')
      .replace(/<script[\s\S]*?JsBarcode[\s\S]*?<\/script>/g, '')

    const tmpPath = path.join(os.tmpdir(), `kasirku_label_${Date.now()}.html`)
    fs.writeFileSync(tmpPath, cleanHtml, 'utf8')

    return new Promise((resolve, reject) => {
      const printWin = new BrowserWindow({
        show: false,
        webPreferences: { contextIsolation: true }
      })

      printWin.loadFile(tmpPath)

      printWin.webContents.on('did-finish-load', async () => {
        // Beri waktu ekstra agar image base64 barcode/logo selesai diraster sebelum print.
        setTimeout(async () => {
          await waitForImagesToLoad(printWin)
          const pageSize = getLabelPageSize(labelConfig, printerName)
          const options = {
            silent: true,
            printBackground: true,
            deviceName: printerName || undefined,
            margins: { marginType: 'none' },
            pageSize
          }

          printWin.webContents.print(options, (success, errorType) => {
            // Beri jeda agar OS spooler selesai menerima data secara native sebelum window dihancurkan
            setTimeout(() => {
              if (printWin && !printWin.isDestroyed()) printWin.close()
              try { fs.unlinkSync(tmpPath) } catch (e) {}
            }, 2000)

            if (success) {
              resolve(true)
            } else {
              reject(new Error(errorType || 'Label print failed'))
            }
          })
        }, 500)
      })
    })
  })

  ipcMain.handle('print:test', async (event, printerName) => {
    const html = `
      <html>
      <body style="font-family:monospace;font-size:12px;text-align:center;padding:10px;">
        <h2>TEST PRINT</h2>
        <p>KasirKu - Printer Test</p>
        <p>========================</p>
        <p>Printer berhasil terkoneksi!</p>
        <p>${new Date().toLocaleString('id-ID')}</p>
        <p>========================</p>
      </body>
      </html>
    `
    return new Promise((resolve, reject) => {
      const printWin = new BrowserWindow({
        show: false,
        webPreferences: { contextIsolation: true }
      })

      printWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)

      printWin.webContents.on('did-finish-load', () => {
        printWin.webContents.print({
          silent: true,
          printBackground: true,
          deviceName: printerName || undefined,
          margins: { marginType: 'none' }
        }, (success, errorType) => {
          printWin.close()
          success ? resolve(true) : reject(new Error(errorType || 'Test print failed'))
        })
      })
    })
  })

}

module.exports = { registerPrintHandlers }
