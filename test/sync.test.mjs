import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dsh-memory-drive-test-'))
process.env.DSH_HOME = path.join(tmp, 'dsh')
const memoryDir = path.join(tmp, 'dsh', 'memory')
fs.mkdirSync(path.join(memoryDir, 'workspaces', '--ws--'), { recursive: true })
fs.writeFileSync(path.join(memoryDir, 'MEMORY.md'), '# user v1\n')
fs.writeFileSync(path.join(memoryDir, 'workspaces', '--ws--', 'MEMORY.md'), '# project v1\n')
fs.writeFileSync(path.join(memoryDir, 'workspaces', '--ws--', '2026-11-11.md'), '# log\n')
fs.mkdirSync(path.join(memoryDir, 'hub'), { recursive: true })
fs.writeFileSync(path.join(memoryDir, 'hub', 'episodes.json'), '{}')

const { discoverSources, listFiles, matchAny } = await import('../lib/sources.js')
const { runSync } = await import('../lib/sync.js')
const { listProviders, providerById, backendFor } = await import('../lib/providers.js')
const { matchGlob } = await import('../lib/util.js')

const cloudRoot = path.join(tmp, 'cloud')
const backupRoot = path.join(tmp, 'backup')
fs.mkdirSync(cloudRoot, { recursive: true })
fs.mkdirSync(backupRoot, { recursive: true })

function cfg() {
  return {
    syncProviderId: 'folder:test',
    backupProviderIds: ['folder:backup'],
    sourceSync: { 'auto-memory': true },
    providers: [
      { id: 'folder:test', type: 'folder', label: 'test', root: cloudRoot },
      { id: 'folder:backup', type: 'folder', label: 'backup', root: backupRoot }
    ],
    injectMemory: false,
    injectMaxChars: 4000
  }
}
const cloudFile = path.join(cloudRoot, 'DSHMemory', 'sources', 'auto-memory', 'memory', 'MEMORY.md')
const projectCloud = path.join(cloudRoot, 'DSHMemory', 'sources', 'auto-memory', 'memory', 'workspaces', '--ws--', 'MEMORY.md')

test('glob dialect matches nested and zero-depth paths', () => {
  assert.equal(matchGlob('MEMORY.md', 'MEMORY.md'), true)
  assert.equal(matchGlob('memory/2026-01-01.md', 'memory/**/*.md'), true)
  assert.equal(matchGlob('workspaces/x/handoff/a.md', 'workspaces/*/handoff/*.md'), true)
  assert.equal(matchGlob('workspaces/x/hub/a.md', 'workspaces/*/MEMORY.md'), false)
})

test('auto-memory source only exposes user-facing markdown', () => {
  const config = cfg()
  const sources = discoverSources(config)
  const auto = sources.find((s) => s.id === 'auto-memory')
  assert.ok(auto, 'auto-memory source must exist')
  const files = listFiles(config, auto)
  const rels = files.map((f) => f.rel).sort()
  assert.deepEqual(rels, ['MEMORY.md', 'workspaces/--ws--/2026-11-11.md', 'workspaces/--ws--/MEMORY.md'])
  assert.equal(files.some((f) => f.rel.includes('hub')), false)
})

test('push uploads local memory and backup mirror receives it', async () => {
  const config = cfg()
  const sources = discoverSources(config)
  const providers = listProviders(config)
  const result = await runSync({ config, sources, providers, direction: 'push', backup: true })
  assert.equal(result.ok, true)
  assert.ok(result.pushed >= 3, 'pushed count')
  assert.equal(fs.readFileSync(cloudFile, 'utf8'), '# user v1\n')
  assert.equal(fs.readFileSync(projectCloud, 'utf8'), '# project v1\n')
  const backupFile = path.join(backupRoot, 'DSHMemory', 'sources', 'auto-memory', 'memory', 'MEMORY.md')
  assert.equal(fs.readFileSync(backupFile, 'utf8'), '# user v1\n')
})

test('pull takes cloud changes when local is unchanged', async () => {
  fs.writeFileSync(cloudFile, '# user v2 from cloud\n')
  const config = cfg()
  const sources = discoverSources(config)
  const providers = listProviders(config)
  const result = await runSync({ config, sources, providers, direction: 'pull' })
  assert.equal(result.ok, true)
  assert.ok(result.pulled >= 1)
  assert.equal(fs.readFileSync(path.join(memoryDir, 'MEMORY.md'), 'utf8'), '# user v2 from cloud\n')
})

test('push uploads local changes when cloud is unchanged', async () => {
  fs.writeFileSync(path.join(memoryDir, 'MEMORY.md'), '# user v3 local\n')
  const config = cfg()
  const sources = discoverSources(config)
  const providers = listProviders(config)
  const result = await runSync({ config, sources, providers, direction: 'push' })
  assert.equal(result.ok, true)
  assert.ok(result.pushed >= 1)
  assert.equal(fs.readFileSync(cloudFile, 'utf8'), '# user v3 local\n')
})

test('both sides changed becomes a conflict, local kept, cloud copy archived', async () => {
  fs.writeFileSync(path.join(memoryDir, 'MEMORY.md'), '# local branch\n')
  fs.writeFileSync(cloudFile, '# cloud branch\n')
  const config = cfg()
  const sources = discoverSources(config)
  const providers = listProviders(config)
  const result = await runSync({ config, sources, providers, direction: 'both' })
  assert.equal(result.ok, true)
  assert.equal(result.conflicts, 1)
  assert.equal(fs.readFileSync(path.join(memoryDir, 'MEMORY.md'), 'utf8'), '# local branch\n')
  assert.equal(result.conflictFiles.length, 1)
  assert.ok(fs.existsSync(result.conflictFiles[0]))
})

test('path traversal is rejected by resolveFile', async () => {
  const { resolveFile } = await import('../lib/sources.js')
  assert.throws(() => resolveFile(cfg(), 'auto-memory', 'memory', '../secret.md'))
})
