const { ipcMain, BrowserWindow } = require('electron')
const path = require('path')
const fs = require('fs')
const os = require('os')

function registerPrintHandlers(getMainWindow) {

  ipcMain.handle('print:receipt', async (event, html, printerName, paperWidth) => {
    const tmpPath = path.join(os.tmpdir(), `kasirku_receipt_${Date.now()}.html`)
    fs.writeFileSync(tmpPath, html, 'utf8')

    return new Promise((resolve, reject) => {
      const printWin = new BrowserWindow({
        show: false,
        webPreferences: { contextIsolation: true }
      })

      printWin.loadFile(tmpPath)

      printWin.webContents.once('did-finish-load', () => {
        // Tunggu font & layout selesai sebelum print
        setTimeout(async () => {
          try {
            const widthMm = paperWidth === '80' ? 80 : 58

            // Ambil tinggi aktual konten .paper (dalam micron, 1mm = 1000 micron)
            const heightPx = await printWin.webContents.executeJavaScript(
              'document.querySelector(".paper")?.scrollHeight || document.body.scrollHeight'
            )
            // Konversi px → mm: Chromium default 96 dpi → 1px = 0.2646mm
            const heightMm = Math.ceil(heightPx * 0.2646) + 20 // +20mm tear margin

            const options = {
              silent: true,
              printBackground: true,
              deviceName: printerName || undefined,
              margins: { marginType: 'none' },
              pageSize: { width: widthMm * 1000, height: heightMm * 1000 }
            }

            printWin.webContents.print(options, (success, errorType) => {
              setTimeout(() => {
                if (printWin && !printWin.isDestroyed()) printWin.close()
                try { fs.unlinkSync(tmpPath) } catch (_) {}
              }, 2000)

              if (success) resolve(true)
              else reject(new Error(errorType || 'Print failed'))
            })
          } catch (err) {
            if (printWin && !printWin.isDestroyed()) printWin.close()
            try { fs.unlinkSync(tmpPath) } catch (_) {}
            reject(err)
          }
        }, 1200)
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
