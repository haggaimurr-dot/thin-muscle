export function validBarcode(text) {
  if (!/^(?:\d{8}|\d{12}|\d{13}|\d{14})$/.test(text)) return false
  const digits = [...text].map(Number)
  const check = digits.pop()
  return (
    (10 - (digits.reverse().reduce((sum, d, i) => sum + d * (i % 2 === 0 ? 3 : 1), 0) % 10)) %
      10 ===
    check
  )
}
