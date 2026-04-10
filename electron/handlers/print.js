const { ipcMain, BrowserWindow } = require('electron')
const path = require('path')
const fs = require('fs')
const os = require('os')

// Generate barcode SVG inline di main process (Node.js) menggunakan jsbarcode + xmldom
// Tidak perlu eksekusi script browser — 100% reliable di semua environment
function generateBarcodeSVG(value, barHeight) {
  try {
    const JsBarcode = require('jsbarcode')
    const { DOMImplementation, XMLSerializer } = require('@xmldom/xmldom')
    const document = new DOMImplementation().createDocument('http://www.w3.org/1999/xhtml', 'html', null)
    const svgNode = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    JsBarcode(svgNode, String(value), {
      xmlDocument: document,
      format: 'CODE128',
      width: 2,
      height: barHeight || 40,
      displayValue: true,
      fontSize: 9,
      margin: 2
    })
    return new XMLSerializer().serializeToString(svgNode)
  } catch (e) {
    // Fallback: teks saja jika library tidak tersedia
    return `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="20"><text y="15" font-size="10">${value}</text></svg>`
  }
}

// Ganti semua <svg id="barcode-{value}" ...></svg> di HTML dengan SVG yang sudah di-render
function inlineBarcodes(html, barHeight) {
  return html.replace(/<svg([^>]*)id="barcode-([^"]+)"([^>]*)><\/svg>/g, (match, before, value, after) => {
    return generateBarcodeSVG(value, barHeight)
  })
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
    // Generate semua barcode di main process (Node.js) — tidak perlu browser execute script
    const processedHtml = inlineBarcodes(html, 40)

    // Hapus tag CDN + script browser-side JsBarcode (sudah tidak diperlukan)
    const cleanHtml = processedHtml
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
        // Tidak ada script browser yang perlu dieksekusi — barcode sudah di-render server-side
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
        }, 200)
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
