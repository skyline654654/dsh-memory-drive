import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dsh-memory-drive-host-'))
process.env.DSH_HOME = path.join(tmp, 'dsh')
fs.mkdirSync(path.join(process.env.DSH_HOME, 'memory', 'workspaces', '--ws--'), { recursive: true })
fs.writeFileSync(path.join(process.env.DSH_HOME, 'memory', 'MEMORY.md'), '# host test\n')
const { apply, name } = await import('../index.js')

test('host plugin applies to a mock context and registers routes, a prompt section and an event hook', () => {
  const routes = new Map()
  const sections = []
  const events = []
  const effects = []
  let injected = []
  const ctx = {
    effect(fn, label) { const dispose = fn(); effects.push(dispose); return dispose },
    inject(services, callback) {
      injected.push(services.join(','))
      const scoped = {
        effect(fn, label) { const dispose = fn(); effects.push(dispose); return dispose },
        webServer: { register({ path, handler }) { routes.set(path, handler); return () => {} } },
        systemPrompt: { section(section) { sections.push(section); return () => {} } }
      }
      callback(scoped)
    },
    on(event, handler) { events.push({ event, handler }); return () => {} },
    logger: { debug() {}, info() {}, error() {} }
  }
  assert.equal(name, 'memory-drive')
  apply(ctx, {})
  assert.ok(routes.has('/api/memory-drive/status'))
  assert.ok(routes.has('/api/memory-drive/files'))
  assert.ok(routes.has('/api/memory-drive/file'))
  assert.ok(routes.has('/api/memory-drive/sync'))
  assert.ok(routes.has('/api/memory-drive/config'))
  assert.ok(routes.has('/api/memory-drive/provider/test'))
  assert.equal(sections.length, 1)
  assert.equal(sections[0].name, 'memory-drive:cloud-memory')
  assert.equal(typeof sections[0].text(), 'string')
  assert.ok(events.some((e) => e.event === 'agent/turn-stopping'))
  // dispose everything the plugin registered
  for (const dispose of effects) { if (typeof dispose === 'function') dispose() }
})
