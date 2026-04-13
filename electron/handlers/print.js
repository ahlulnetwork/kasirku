const { ipcMain, BrowserWindow } = require('electron')
const path = require('path')
const fs = require('fs')
const os = require('os')

function getLabelPageSize(labelConfig = {}, printerName = '') {
  const lebarKertas = parseInt(labelConfig.lebar_kertas || '58', 10) || 58
  const ukuranLabel = String(labelConfig.ukuran_label || '40x25')
  const [labelWidthRaw, labelHeightRaw] = ukuranLabel.split('x').map(Number)
  const labelWidth = Number.isFinite(labelWidthRaw) ? labelWidthRaw : 40
  const labelHeight = Number.isFinite(labelHeightRaw) ? labelHeightRaw : 25
  const kolomReq = Math.max(1, parseInt(labelConfig.label_kolom || '2', 10) || 1)
  // Pastikan total lebar kolom tidak melebihi lebar kertas
  const columns = (kolomReq * labelWidth <= lebarKertas) ? kolomReq : 1
  const itemCount = Math.max(1, parseInt(labelConfig.itemCount || '1', 10) || 1)
  const rowCount = Math.max(1, Math.ceil(itemCount / columns))
  // Gunakan lebar kertas aktual (bukan lebar label × kolom) agar pas
  const paperWidth = lebarKertas

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

// Konversi semua SVG inline → PNG via canvas di dalam print window.
// SVG inline kadang di-skip oleh Windows GDI print spooler (driver thermal murahan).
// PNG raster dari canvas adalah SATU-SATUNYA format yang selalu lolos ke head printer.
const CONVERT_SVG_TO_PNG_JS = `
  new Promise(resolve => {
    var svgs = Array.from(document.querySelectorAll('svg'));
    if (!svgs.length) { resolve(); return; }
    var remaining = svgs.length;
    function done() { remaining--; if (!remaining) resolve(); }
    svgs.forEach(function(svg) {
      try {
        var bb = svg.getBoundingClientRect();
        var w = Math.max(Math.ceil(bb.width || 200), 10);
        var h = Math.max(Math.ceil(bb.height || 80), 10);
        var svgStr = new XMLSerializer().serializeToString(svg);
        var url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgStr);
        var img = new Image();
        img.onload = function() {
          var c = document.createElement('canvas');
          c.width = w; c.height = h;
          var ctx = c.getContext('2d');
          ctx.fillStyle = '#fff';
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);
          var pngUrl = c.toDataURL('image/png');
          var el = document.createElement('img');
          el.src = pngUrl;
          el.style.cssText = (svg.getAttribute('style') || 'display:block');
          el.style.width = w + 'px';
          el.style.height = h + 'px';
          svg.parentNode.replaceChild(el, svg);
          done();
        };
        img.onerror = function() { done(); };
        img.src = url;
      } catch(e) { done(); }
    });
  })
`

function registerPrintHandlers(getMainWindow) {

  ipcMain.handle('print:receipt', async (event, html, printerName, paperWidth) => {
    // Write to temp file so images (base64 logo) have time to fully render before print.
    // data: URL + did-finish-load fires before Chromium finishes painting, so logo is missed.
    const tmpPath = path.join(os.tmpdir(), `kasirku_receipt_${Date.now()}.html`)
    fs.writeFileSync(tmpPath, html, 'utf8')

    return new Promise((resolve, reject) => {
      const printWin = new BrowserWindow({
        show: false,
        width: 800,   // Dimensi eksplisit WAJIB agar Chromium mengalokasikan frame-buffer rendering.
        height: 1200, // Tanpa dimensi, GPU tidak paint SVG → logo/barcode tidak muncul di cetak.
        webPreferences: { contextIsolation: true }
      })

      printWin.loadFile(tmpPath)

      printWin.webContents.on('did-finish-load', async () => {
        const widthMm = paperWidth === '80' ? 80 : 58
        // Delay agar compositing selesai sebelum konversi SVG
        setTimeout(async () => {
          await waitForImagesToLoad(printWin)
          // Konversi semua inline SVG (logo) ke PNG raster sebelum print
          await printWin.webContents.executeJavaScript(CONVERT_SVG_TO_PNG_JS, true)
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
        width: 800,
        height: 1200,
        webPreferences: { contextIsolation: true }
      })

      printWin.loadFile(tmpPath)

      printWin.webContents.on('did-finish-load', async () => {
        // Beri waktu ekstra agar image base64 barcode/logo selesai diraster sebelum print.
        setTimeout(async () => {
          await waitForImagesToLoad(printWin)
          // Konversi SVG sisa (jika ada) ke PNG raster
          await printWin.webContents.executeJavaScript(CONVERT_SVG_TO_PNG_JS, true)
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
