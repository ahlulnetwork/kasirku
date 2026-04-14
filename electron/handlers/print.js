const { ipcMain, BrowserWindow, screen } = require('electron')
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
        setTimeout(() => {
          try {
            const widthMm = paperWidth === '80' ? 80 : 58

            // scaleFactor dari main process — akurat meski window show:false
            // window.devicePixelRatio di hidden BrowserWindow selalu 1.0 di Windows (tidak di-attach ke display)
            // screen.getPrimaryDisplay().scaleFactor baca skala display langsung dari OS
            const scaleFactor = screen.getPrimaryDisplay().scaleFactor || 1

            // Hitung tinggi dari jumlah baris teks di <pre>
            // font-size × line-height × scaleFactor / 96dpi × 25.4mm/inch
            const preMatch = html.match(/<pre>([\s\S]*?)<\/pre>/)
            let heightMm = 300  // fallback aman
            if (preMatch) {
              const lineCount = preMatch[1].split('\n').length
              const fontSize = paperWidth === '80' ? 13 : 10 // px, sesuai receiptGenerator
              const mmPerLine = (fontSize * 1.35 * scaleFactor) / 96 * 25.4
              // Tambah 20mm safety margin agar footer tidak overflow ke halaman 2
              heightMm = Math.ceil(lineCount * mmPerLine) + 20
            }

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
