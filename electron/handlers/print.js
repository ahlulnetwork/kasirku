const { ipcMain, BrowserWindow } = require('electron')
const path = require('path')
const fs = require('fs')
const os = require('os')

let printQueue = Promise.resolve()

function enqueuePrint(task) {
  const run = printQueue.then(task)
  printQueue = run.catch(() => {})
  return run
}

function registerPrintHandlers(getMainWindow) {

  ipcMain.handle('print:receipt', async (event, html, printerName, paperWidth) => {
    return enqueuePrint(() => {
      const tmpPath = path.join(os.tmpdir(), `kasirku_receipt_${Date.now()}.html`)
      fs.writeFileSync(tmpPath, html, 'utf8')

      return new Promise((resolve, reject) => {
        const cleanup = (printWin) => {
          if (printWin && !printWin.isDestroyed()) printWin.close()
          try { fs.unlinkSync(tmpPath) } catch (_) {}
        }

        const printWin = new BrowserWindow({
          show: false,
          webPreferences: { contextIsolation: true }
        })

        printWin.loadFile(tmpPath)

        printWin.webContents.once('did-finish-load', () => {
          setTimeout(async () => {
            try {
              const widthMm = paperWidth === '80' ? 80 : 58
              const renderedPreHeightPx = await printWin.webContents.executeJavaScript(`
                (async () => {
                  if (document.fonts && document.fonts.ready) {
                    try { await document.fonts.ready } catch (_) {}
                  }
                  const pre = document.querySelector('pre')
                  if (!pre) return 0
                  const rect = pre.getBoundingClientRect()
                  return Math.ceil(Math.max(pre.scrollHeight || 0, rect.height || 0))
                })()
              `)

              // Konversi CSS px ke mm (96px = 25.4mm) lalu tambah sedikit tear margin.
              // Mengukur tinggi <pre> yang benar-benar dirender lebih akurat daripada estimasi per baris.
              const heightMm = Math.max(80, Math.ceil((renderedPreHeightPx * 25.4) / 96) + 8)

              const options = {
                silent: true,
                printBackground: true,
                deviceName: printerName || undefined,
                margins: { marginType: 'none' },
                preferCSSPageSize: false,
                pageSize: {
                  width: widthMm * 1000,
                  height: heightMm * 1000
                }
              }

              printWin.webContents.print(options, (success, errorType) => {
                setTimeout(() => cleanup(printWin), 2000)

                if (success) resolve(true)
                else reject(new Error(errorType || 'Print failed'))
              })
            } catch (err) {
              cleanup(printWin)
              reject(err)
            }
          }, 500)
        })
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
    return enqueuePrint(() => new Promise((resolve, reject) => {
      const printWin = new BrowserWindow({
        show: false,
        webPreferences: { contextIsolation: true }
      })

      printWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)

      printWin.webContents.once('did-finish-load', () => {
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
    }))
  })

}

module.exports = { registerPrintHandlers }
