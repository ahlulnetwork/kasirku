const { ipcMain, BrowserWindow } = require('electron')
const path = require('path')
const fs = require('fs')
const os = require('os')
const { sendRawToPrinter } = require('./escpos')

let printQueue = Promise.resolve()

function enqueuePrint(task) {
  const run = printQueue.then(task)
  printQueue = run.catch(() => {})
  return run
}

function decodeHtmlEntities(text) {
  return String(text || '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
}

function extractReceiptText(html) {
  const preMatch = String(html || '').match(/<pre>([\s\S]*?)<\/pre>/i)
  if (!preMatch) return ''
  return decodeHtmlEntities(preMatch[1]).trimEnd()
}

async function getPrinterInfo(getMainWindow, printerName) {
  if (!printerName || !getMainWindow) return null
  try {
    const mainWindow = getMainWindow()
    if (!mainWindow || mainWindow.isDestroyed()) return null
    const printers = await mainWindow.webContents.getPrintersAsync()
    return printers.find((printer) => printer.name === printerName || printer.displayName === printerName) || null
  } catch (_) {
    return null
  }
}

async function shouldUseRawText(getMainWindow, printerName) {
  if (process.platform !== 'win32' || !printerName) return false

  const info = await getPrinterInfo(getMainWindow, printerName)
  const haystack = [
    printerName,
    info?.name,
    info?.displayName,
    info?.description,
    info?.options?.['printer-make-and-model'],
    info?.options?.system_driverinfo,
    info?.options?.driver_name
  ].filter(Boolean).join(' ').toLowerCase()

  return /generic|text only|text-only/.test(haystack)
}

function buildRawTextBuffer(text) {
  const normalized = String(text || '').replace(/\r?\n/g, '\r\n')
  return Buffer.from(normalized + '\r\n\r\n\r\n', 'latin1')
}

function registerPrintHandlers(getMainWindow) {

  ipcMain.handle('print:receipt', async (event, html, printerName, paperWidth) => {
    return enqueuePrint(async () => {
      if (await shouldUseRawText(getMainWindow, printerName)) {
        const receiptText = extractReceiptText(html)
        if (!receiptText) throw new Error('Receipt text not found')

        const success = await sendRawToPrinter(printerName, buildRawTextBuffer(receiptText))
        if (!success) throw new Error('Raw text print failed')
        return true
      }

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
    return enqueuePrint(async () => {
      if (await shouldUseRawText(getMainWindow, printerName)) {
        const text = [
          'TEST PRINT',
          'KasirKu - Printer Test',
          '========================',
          'Printer berhasil terkoneksi!',
          new Date().toLocaleString('id-ID'),
          '========================'
        ].join('\n')
        const success = await sendRawToPrinter(printerName, buildRawTextBuffer(text))
        if (!success) throw new Error('Raw text test print failed')
        return true
      }

      return new Promise((resolve, reject) => {
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
      })
    })
  })

}

  ipcMain.handle('print:label', async (event, html, printerName) => {
    return enqueuePrint(async () => {
      const tmpPath = path.join(os.tmpdir(), `kasirku_label_${Date.now()}.html`)
      fs.writeFileSync(tmpPath, html, 'utf8')

      return new Promise((resolve, reject) => {
        const cleanup = (win) => {
          if (win && !win.isDestroyed()) win.close()
          try { fs.unlinkSync(tmpPath) } catch (_) {}
        }

        const labelWin = new BrowserWindow({
          show: false,
          webPreferences: { contextIsolation: true }
        })

        labelWin.loadFile(tmpPath)

        labelWin.webContents.once('did-finish-load', () => {
          setTimeout(() => {
            // Gunakan explicit pageSize (mikron) seperti pola receipt printer — lebih reliable
            // di Windows thermal printer driver daripada preferCSSPageSize.
            // 66mm x 15mm = paper roll 2-up; page break tiap baris dikontrol CSS break-after.
            labelWin.webContents.print({
              silent: true,
              printBackground: true,
              deviceName: printerName || undefined,
              margins: { marginType: 'none' },
              preferCSSPageSize: false,
              pageSize: { width: 66 * 1000, height: 15 * 1000 }
            }, (success, errorType) => {
              setTimeout(() => cleanup(labelWin), 2000)
              if (success) resolve(true)
              else reject(new Error(errorType || 'Label print failed'))
            })
          }, 500)
        })
      })
    })
  })

}

module.exports = { registerPrintHandlers }
