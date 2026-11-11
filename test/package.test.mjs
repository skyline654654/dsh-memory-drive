import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(fileURLToPath(import.meta.url)) + '/..'
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))

test('bundle manifest and cordis patch agree on the package name', () => {
  assert.equal(pkg.dsh.bundle.patch, './cordis.patch.yml')
  assert.ok(pkg.dsh.client && pkg.dsh.client.platform === 'web')
  assert.equal(pkg.exports['.'], './index.js')
  assert.ok(pkg.exports['./client'])
  assert.ok(fs.existsSync(path.join(root, pkg.exports['./client'])))
  const patch = fs.readFileSync(path.join(root, 'cordis.patch.yml'), 'utf8')
  assert.ok(patch.includes("name: '" + pkg.name + "'"), 'insert name must equal the package name')
})
