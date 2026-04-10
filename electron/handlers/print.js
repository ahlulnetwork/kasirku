const { ipcMain, BrowserWindow } = require('electron')
const path = require('path')
const fs = require('fs')
const os = require('os')

function registerPrintHandlers(getMainWindow) {

  ipcMain.handle('print:receipt', async (event, html, printerName, paperWidth) => {
    return new Promise((resolve, reject) => {
      const printWin = new BrowserWindow({
        show: false,
        webPreferences: { contextIsolation: true }
      })

      printWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)

      printWin.webContents.on('did-finish-load', () => {
        const widthMm = paperWidth === '80' ? 80 : 58
        const options = {
          silent: true,
          printBackground: true,
          deviceName: printerName || undefined,
          margins: { marginType: 'none' },
          pageSize: { width: widthMm * 1000, height: 2970000 }
        }

        printWin.webContents.print(options, (success, errorType) => {
          printWin.close()
          if (success) {
            resolve(true)
          } else {
            reject(new Error(errorType || 'Print failed'))
          }
        })
      })
    })
  })

  ipcMain.handle('print:label', async (event, html, printerName) => {
    // Inline jsbarcode to avoid CDN script blocking when loading from data: URL
    let inlinedHtml = html
    try {
      const jsBarcodeJs = fs.readFileSync(
        require.resolve('jsbarcode/dist/JsBarcode.all.min.js'),
        'utf8'
      )
      inlinedHtml = html.replace(
        /<script[^>]+cdn\.jsdelivr\.net[^>]*><\/script>/,
        `<script>${jsBarcodeJs}</script>`
      )
    } catch (e) {
      // Fallback: use original HTML with CDN
    }

    // Write to temp file so loadFile can serve it properly (avoids data: URL size limits)
    const tmpPath = path.join(os.tmpdir(), `kasirku_label_${Date.now()}.html`)
    fs.writeFileSync(tmpPath, inlinedHtml, 'utf8')

    return new Promise((resolve, reject) => {
      const printWin = new BrowserWindow({
        show: false,
        webPreferences: { contextIsolation: true }
      })

      printWin.loadFile(tmpPath)

      printWin.webContents.on('did-finish-load', () => {
        // Wait for DOMContentLoaded + JsBarcode to render all SVGs
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
        }, 800)
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
