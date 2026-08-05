#!/usr/bin/env node
/**
 * Rasterize the gold SVG shape library into NxN binary grids.
 *
 * Each SVG (N*10 x N*10 viewBox) is rendered with sharp to a 1000x1000 raw
 * RGBA buffer; every output cell is the mean alpha coverage of its (1000/N)^2
 * pixel block, thresholded at 0.5 -> '1' (filled) or '0' (empty).
 *
 * Usage:
 *   node svg_to_grid.js --size 10                   # rasterize default manifest -> rasterized.json
 *   node svg_to_grid.js --size 10 --manifest <f>    # use a specific manifest
 *   node svg_to_grid.js --size 10 --dir <d>         # resolve manifest entries relative to <d>
 *   node svg_to_grid.js --size 15 ... --id easy|medium|hard   # id prefix/easy defaults
 *   node svg_to_grid.js --size 10 --svg <file>      # print single grid (JSON)
 */
const fs = require('fs')
const path = require('path')
const sharp = require('sharp')

// Alpha channel is 0..255; a cell counts as filled when mean coverage >= 50%.
const THRESHOLD = 127.5

function parseArgs() {
  const args = process.argv.slice(2)
  const get = (k, dflt) => (args.indexOf('--' + k) >= 0 ? args[args.indexOf('--' + k) + 1] : dflt)
  return {
    size: parseInt(get('size', '10'), 10),
    manifest: get('manifest', null),
    dir: get('dir', null),
    out: get('out', null),
    id: get('id', 'easy'),
    svg: args.indexOf('--svg') >= 0 ? get('svg', null) : null,
  }
}

async function rasterize(svgPath, size = 10) {
  const target = 1000
  const cell = target / size
  const { data, info } = await sharp(svgPath)
    .resize(target, target, { fit: 'fill' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  if (info.width !== target || info.height !== target) {
    throw new Error(`unexpected raster size ${info.width}x${info.height}`)
  }
  const rows = []
  for (let r = 0; r < size; r++) {
    let row = ''
    for (let c = 0; c < size; c++) {
      let sum = 0
      let count = 0
      for (let y = Math.floor(r * cell); y < Math.floor((r + 1) * cell); y++) {
        for (let x = Math.floor(c * cell); x < Math.floor((c + 1) * cell); x++) {
          sum += data[(y * target + x) * 4 + 3]
          count++
        }
      }
      row += sum / count >= THRESHOLD ? '1' : '0'
    }
    rows.push(row)
  }
  return rows
}

function toSolution(rows) {
  return rows.join('')
}

function density(solution, size) {
  return (solution.match(/1/g) || []).length / (size * size)
}

async function run() {
  const { size, manifest: manifestArg, dir, out, id, svg } = parseArgs()

  if (svg) {
    const rows = await rasterize(svg, size)
    process.stdout.write(JSON.stringify(rows) + '\n')
    return
  }

  const here = __dirname
  const manifestPath = manifestArg || path.join(here, 'svg_shapes', 'manifest.json')
  const outPath = out || path.join(here, `rasterized-${id}-${size}.json`)

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
  const records = []
  const seen = new Set()
  let dups = 0
  for (const shape of manifest.shapes) {
    const svgPath = path.join(dir || path.dirname(manifestPath), shape.file)
    const rows = await rasterize(svgPath, size)
    const solution = toSolution(rows)
    if (seen.has(solution)) {
      console.warn(`[WARN] duplicate grid: ${shape.id}`)
      dups++
    }
    seen.add(solution)
    records.push({
      id: `nonogram-${size}x${size}-${id}-${sha8(solution, size)}`,
      title: shape.title,
      category: shape.category,
      sourceSvg: shape.file,
      solution,
      fillDensity: Number(density(solution, size).toFixed(3)),
    })
  }
  fs.writeFileSync(outPath, JSON.stringify({ count: records.length, shapes: records }, null, 2) + '\n')
  console.log(`Rasterized ${records.length} shapes -> ${outPath}`)
  console.log(`Duplicate grids: ${dups}`)
}

function sha8(s, size) {
  const { createHash } = require('crypto')
  return createHash('sha256').update(`nonogram:${size}:${s}`).digest('hex').slice(0, 8)
}

if (require.main === module) {
  run().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}

module.exports = { rasterize, toSolution, density, THRESHOLD }
