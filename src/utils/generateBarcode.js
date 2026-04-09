/**
 * Generate barcode number (EAN-13 compatible)
 */
export function generateBarcodeNumber() {
  // Generate 12 digit random number
  let code = '200' // UPC internal use prefix
  for (let i = 0; i < 9; i++) {
    code += Math.floor(Math.random() * 10)
  }

  // Calculate EAN-13 check digit
  let sum = 0
  for (let i = 0; i < 12; i++) {
    sum += parseInt(code[i]) * (i % 2 === 0 ? 1 : 3)
  }
  const checkDigit = (10 - (sum % 10)) % 10
  code += checkDigit

  return code
}
