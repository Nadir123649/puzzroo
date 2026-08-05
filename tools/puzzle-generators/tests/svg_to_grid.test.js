const { test } = require('node:test')
const assert = require('node:assert')
const path = require('node:path')
const { rasterize, toSolution, density, SIZE } = require('../svg_to_grid')

const FIX = path.join(__dirname, 'fixtures')

test('all-black SVG rasterizes to a fully filled grid', async () => {
  const rows = await rasterize(path.join(FIX, 'solid-black.svg'))
  assert.strictEqual(rows.length, SIZE)
  for (const row of rows) {
    assert.strictEqual(row.length, SIZE)
    assert.match(row, /^1{10}$/)
  }
  assert.strictEqual(density(toSolution(rows)), 1)
})

test('half-filled (left) SVG rasterizes to left 5 columns filled', async () => {
  const rows = await rasterize(path.join(FIX, 'half-left.svg'))
  for (const row of rows) {
    assert.strictEqual(row, '1111100000')
  }
})

test('transparent SVG rasterizes to an empty grid', async () => {
  const rows = await rasterize(path.join(FIX, 'empty.svg'))
  for (const row of rows) {
    assert.match(row, /^0{10}$/)
  }
  assert.strictEqual(density(toSolution(rows)), 0)
})

test('solution is a 100-char 0/1 string with density in [0,1]', async () => {
  const rows = await rasterize(path.join(FIX, 'solid-black.svg'))
  const sol = toSolution(rows)
  assert.strictEqual(sol.length, 100)
  assert.match(sol, /^[01]{100}$/)
})
