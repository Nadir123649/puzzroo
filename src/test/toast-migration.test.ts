import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(__dirname, '../..')

function walk(dir: string): string[] {
  const out: string[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.next') continue
      out.push(...walk(full))
    } else if (/\.(ts|tsx)$/.test(entry.name) && !/\.(test|spec)\.(ts|tsx)$/.test(entry.name)) {
      out.push(full)
    }
  }
  return out
}

const FORBIDDEN_CALL = /[^a-zA-Z]toast\.(success|error|loading|info|promise|dismiss)\s*\(/
const HOT_TOAST_IMPORT = /from\s+['"]react-hot-toast['"]/

describe('toast migration guard', () => {
  const targets = [
    path.join(ROOT, 'src/app'),
    path.join(ROOT, 'src/components'),
  ]

  it('has no direct react-hot-toast toast() calls in app/components', () => {
    const violations: string[] = []
    for (const dir of targets) {
      for (const file of walk(dir)) {
        const src = fs.readFileSync(file, 'utf8')
        if (FORBIDDEN_CALL.test(src)) {
          violations.push(path.relative(ROOT, file))
        }
      }
    }
    expect(violations, `Found direct toast() calls: ${violations.join(', ')}`).toEqual([])
  })

  it('only layout.tsx may import react-hot-toast (for <Toaster/>)', () => {
    const violations: string[] = []
    for (const dir of targets) {
      for (const file of walk(dir)) {
        const src = fs.readFileSync(file, 'utf8')
        if (HOT_TOAST_IMPORT.test(src) && !file.split(path.sep).join('/').endsWith('src/app/layout.tsx')) {
          violations.push(path.relative(ROOT, file))
        }
      }
    }
    expect(violations, `Files importing react-hot-toast: ${JSON.stringify(violations)}`).toEqual([])
  })
})
