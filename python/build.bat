@echo off
REM Build label_printer.py menjadi label_printer.exe (standalone, no Python needed)
REM Jalankan dari folder python/

pip install pyinstaller

pyinstaller --onefile --noconsole --name label_printer label_printer.py

echo.
echo Build selesai. Output: dist\label_printer.exe
