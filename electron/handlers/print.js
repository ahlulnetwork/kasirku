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
        // Tunggu font & layout selesai
        setTimeout(() => {
          const widthMm = paperWidth === '80' ? 80 : 58

          // Hitung tinggi halaman dari jumlah baris teks di <pre>
          // Generic Text Only driver mengabaikan @page CSS, harus set explicit pageSize
          const preMatch = html.match(/<pre>([\s\S]*?)<\/pre>/)
          let heightMm = 200  // fallback jika tidak ada pre
          if (preMatch) {
            const lineCount = preMatch[1].split('\n').length
            // font-size 10px, line-height 1.35, 96dpi:
            // 10px × 1.35 / 96dpi × 25.4mm/inch = 3.57mm per baris
            // Pakai 4mm per baris untuk buffer rendering
            const mmPerLine = paperWidth === '80' ? 4.2 : 4.0
            heightMm = Math.ceil(lineCount * mmPerLine) + 30  // +30mm padding & tear margin
          }

          const options = {
            silent: true,
            printBackground: true,
            deviceName: printerName || undefined,
            margins: { marginType: 'none' },
            preferCSSPageSize: false,  // Generic Text Only tidak support CSS page size
            pageSize: {
              width: widthMm * 1000,   // mikron
              height: heightMm * 1000  // mikron
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
