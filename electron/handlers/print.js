const { ipcMain, BrowserWindow } = require('electron')
const path = require('path')
const fs = require('fs')
const os = require('os')

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

      printWin.webContents.on('did-finish-load', () => {
        const widthMm = paperWidth === '80' ? 80 : 58
        // Delay 400ms to ensure base64 logo image is fully rendered before printing
        setTimeout(() => {
          const options = {
            silent: true,
            printBackground: true,
            deviceName: printerName || undefined,
            margins: { marginType: 'none' },
            pageSize: { width: widthMm * 1000, height: 2970000 }
          }

          printWin.webContents.print(options, (success, errorType) => {
            printWin.close()
            try { fs.unlinkSync(tmpPath) } catch (e) {}
            if (success) {
              resolve(true)
            } else {
              reject(new Error(errorType || 'Print failed'))
            }
          })
        }, 400)
      })
    })
  })

  ipcMain.handle('print:label', async (event, html, printerName) => {
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

      printWin.webContents.on('did-finish-load', () => {
        // Beri waktu ekstra agar image base64 barcode/logo selesai diraster sebelum print.
        setTimeout(() => {
          const options = {
            silent: true,
            printBackground: true,
            deviceName: printerName || undefined,
            margins: { marginType: 'none' }
          }

          printWin.webContents.print(options, (success, errorType) => {
            printWin.close()
            try { fs.unlinkSync(tmpPath) } catch (e) {}
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
