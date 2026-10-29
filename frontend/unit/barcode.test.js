import { test } from 'node:test'
import assert from 'node:assert/strict'
import { validBarcode } from '../src/barcode.js'
test('EAN and UPC checksum rejects unknown bad digits', () => {
  assert.equal(validBarcode('4006381333931'), true)
  assert.equal(validBarcode('036000291452'), true)
  assert.equal(validBarcode('4006381333932'), false)
  assert.equal(validBarcode('javascript:1'), false)
})
