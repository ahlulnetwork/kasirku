"""
KasirKu Label Printer — ESC/POS barcode label cetak langsung ke thermal printer.
Dipanggil dari Electron via execFile(), menerima argumen JSON via stdin.

Usage:
  label_printer.exe --printer "EPSON TM-T82" --items '[{"nama":"Produk","barcode":"123","harga":25000,"qty":2}]' --width 58
"""

import sys
import json
import argparse
import os
import struct


# ── ESC/POS Constants ──────────────────────────────────────────────────────
ESC = b'\x1b'
GS  = b'\x1d'
LF  = b'\x0a'


class EscPos:
    def __init__(self):
        self.buf = bytearray()

    def raw(self, data: bytes):
        self.buf.extend(data)
        return self

    def init(self):
        return self.raw(ESC + b'\x40')

    def align(self, n: int):
        # 0=left  1=center  2=right
        return self.raw(ESC + b'\x61' + bytes([n]))

    def bold(self, on: bool):
        return self.raw(ESC + b'\x45' + bytes([1 if on else 0]))

    def size(self, n: int):
        # 0=normal  0x11=double  0x10=wide  0x01=tall
        return self.raw(GS + b'\x21' + bytes([n]))

    def text(self, s: str):
        self.buf.extend(s.encode('latin-1', errors='replace'))
        return self

    def lf(self, n: int = 1):
        self.buf.extend(LF * n)
        return self

    def line(self, s: str):
        return self.text(s).lf()

    def sep(self, ch: str = '-', w: int = 32):
        return self.line(ch * w)

    def barcode128(self, data: str):
        """Print CODE128 barcode via printer built-in command (bukan gambar)."""
        # GS h n  — barcode height in dots
        self.raw(GS + b'\x68' + bytes([64]))
        # GS w n  — barcode module width (2-6)
        self.raw(GS + b'\x77' + bytes([2]))
        # GS H n  — HRI position: 2=below
        self.raw(GS + b'\x48' + bytes([2]))
        # GS f n  — HRI font: 0=Font A
        self.raw(GS + b'\x66' + bytes([0]))
        # GS k 73 n d1...dn  — CODE128, prefix {B untuk charset B
        encoded = '{B' + data
        payload = encoded.encode('latin-1', errors='replace')
        self.raw(GS + b'\x6b' + bytes([73, len(payload)]))
        self.buf.extend(payload)
        return self.lf()

    def cut(self, feed: int = 4):
        self.lf(feed)
        self.raw(GS + b'\x56\x01')
        return self

    def to_bytes(self) -> bytes:
        return bytes(self.buf)


def format_rp(n) -> str:
    try:
        val = int(n or 0)
        return 'Rp ' + f'{val:,}'.replace(',', '.')
    except Exception:
        return 'Rp 0'


def center(text: str, w: int) -> str:
    t = str(text)
    if len(t) >= w:
        return t
    pad = (w - len(t)) // 2
    return ' ' * pad + t


def build_label(item: dict, width_mm: int) -> bytes:
    """Build ESC/POS buffer untuk satu label."""
    is80 = width_mm >= 80
    W = 46 if is80 else 32

    enc = EscPos()
    enc.init()

    # Nama produk — bold, tengah
    nama = str(item.get('nama', ''))
    enc.align(1).bold(True)
    # Potong nama jika terlalu panjang
    if len(nama) > W:
        nama = nama[:W - 1]
    enc.line(nama)
    enc.bold(False)

    # Kode produk (jika ada)
    kode = str(item.get('kode', '') or '')
    if kode:
        enc.align(1).text(kode).lf()

    # Barcode
    barcode = str(item.get('barcode', '') or '')
    if barcode:
        enc.align(1)
        enc.barcode128(barcode)

    # Harga
    harga = item.get('harga', 0)
    enc.align(1).bold(True).size(0x11)  # double size
    enc.line(format_rp(harga))
    enc.size(0).bold(False)

    enc.cut()
    return enc.to_bytes()


def send_to_printer_win32(printer_name: str, data: bytes) -> bool:
    """Kirim bytes langsung ke printer Windows via winspool.drv."""
    import ctypes
    from ctypes import wintypes

    winspool = ctypes.WinDLL('winspool.drv')

    class DOCINFO(ctypes.Structure):
        _fields_ = [
            ('pDocName',    ctypes.c_wchar_p),
            ('pOutputFile', ctypes.c_wchar_p),
            ('pDatatype',   ctypes.c_wchar_p),
        ]

    hPrinter = wintypes.HANDLE()
    if not winspool.OpenPrinterW(printer_name, ctypes.byref(hPrinter), None):
        return False

    doc = DOCINFO()
    doc.pDocName    = 'KasirKu Label'
    doc.pOutputFile = None
    doc.pDatatype   = 'RAW'

    if not winspool.StartDocPrinterW(hPrinter, 1, ctypes.byref(doc)):
        winspool.ClosePrinter(hPrinter)
        return False

    winspool.StartPagePrinter(hPrinter)

    buf = (ctypes.c_char * len(data))(*data)
    written = ctypes.c_ulong(0)
    winspool.WritePrinter(hPrinter, buf, len(data), ctypes.byref(written))

    winspool.EndPagePrinter(hPrinter)
    winspool.EndDocPrinter(hPrinter)
    winspool.ClosePrinter(hPrinter)
    return True


def main():
    parser = argparse.ArgumentParser(description='KasirKu Label Printer')
    parser.add_argument('--printer', required=True, help='Nama Windows printer')
    parser.add_argument('--items',   required=True, help='JSON array items')
    parser.add_argument('--width',   default='58',   help='Lebar kertas mm (58/80)')
    args = parser.parse_args()

    try:
        items = json.loads(args.items)
    except json.JSONDecodeError as e:
        print(f'ERROR: Invalid JSON items: {e}', file=sys.stderr)
        sys.exit(1)

    width_mm = int(args.width) if args.width in ('58', '80') else 58

    all_ok = True
    for item in items:
        qty = max(1, int(item.get('qty', 1)))
        label_bytes = build_label(item, width_mm)
        for _ in range(qty):
            ok = send_to_printer_win32(args.printer, label_bytes)
            if not ok:
                all_ok = False

    if all_ok:
        print('OK')
        sys.exit(0)
    else:
        print('ERROR: Gagal mengirim ke printer. Pastikan nama printer benar.', file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
