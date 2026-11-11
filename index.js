import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import {
  DATA_DIR, CONFIG_PATH, STATE_PATH, TRASH_DIR, CONFLICT_DIR, DIGEST_PATH,
  ensureDir, readJsonSync, writeJsonSync, sha256, isProbablyText,
  timestamp, joinRel
} from './lib/util.js'
import { discoverSources, findSource, listFiles, resolveFile, sourceFileKey } from './lib/sources.js'
import { listProviders, providerById, backendFor } from './lib/providers.js'
import { runSync } from './lib/sync.js'

export const name = 'memory-drive'

const VERSION = (() => {
  try { return JSON.parse(fs.readFileSync(new URL('./package.json', import.meta.url), 'utf8')).version } catch { return '0.0.0' }
})()

const DEFAULT_CONFIG = {
  version: 1,
  syncProviderId: null,
  backupProviderIds: [],
  autoPullOnStart: true,
  autoPushOnTurnStop: true,
  injectMemory: false,
  injectMaxChars: 4000,
  pullOnStartDelayMs: 12000,
  pushDebounceMs: 30000,
  maxFileBytes: 4 * 1024 * 1024,
  sourceSync: {},
  customSources: [],
  providers: []
}

function normalizeConfig(raw) {
  const config = { ...DEFAULT_CONFIG, ...(raw && typeof raw === 'object' ? raw : {}) }
  config.version = 1
  if (!Array.isArray(config.backupProviderIds)) config.backupProviderIds = []
  if (!Array.isArray(config.customSources)) config.customSources = []
  if (!Array.isArray(config.providers)) config.providers = []
  if (!config.sourceSync || typeof config.sourceSync !== 'object') config.sourceSync = {}
  config.autoPullOnStart = config.autoPullOnStart !== false
  config.autoPushOnTurnStop = config.autoPushOnTurnStop !== false
  config.injectMemory = config.injectMemory === true
  config.injectMaxChars = Math.max(500, Math.min(20000, Number(config.injectMaxChars) || 4000))
  config.pullOnStartDelayMs = Math.max(1000, Math.min(300000, Number(config.pullOnStartDelayMs) || 12000))
  config.pushDebounceMs = Math.max(5000, Math.min(600000, Number(config.pushDebounceMs) || 30000))
  config.maxFileBytes = Math.max(64 * 1024, Math.min(32 * 1024 * 1024, Number(config.maxFileBytes) || 4 * 1024 * 1024))
  return config
}

function readConfig() {
  return normalizeConfig(readJsonSync(CONFIG_PATH, {}))
}

function saveConfig(config) {
  writeJsonSync(CONFIG_PATH, config)
}

function chooseDefaultProvider(config, providers) {
  if (config.syncProviderId) {
    const existing = providers.find((p) => p.id === config.syncProviderId && p.configured)
    if (existing) return config.syncProviderId
  }
  const order = ['folder:huawei', 'folder:baidu', 'folder:quark', 'folder:aliyun', 'folder:onedrive', 'folder:123pan', 'folder:tianyi']
  for (const id of order) {
    const p = providers.find((x) => x.id === id && x.configured)
    if (p) return p.id
  }
  const first = providers.find((p) => p.configured && p.type === 'folder')
  return first ? first.id : null
}

function publicProvider(p, config) {
  return {
    id: p.id,
    type: p.type,
    kind: p.kind,
    label: p.label,
    root: p.root || null,
    url: p.url || null,
    username: p.username || '',
    hasPassword: Boolean(p.password),
    detected: p.detected === true,
    configured: p.configured === true,
    sync: p.id === config.syncProviderId,
    backup: Array.isArray(config.backupProviderIds) && config.backupProviderIds.includes(p.id),
    note: p.note
  }
}

function publicConfig(config) {
  const copy = JSON.parse(JSON.stringify(config))
  if (Array.isArray(copy.providers)) {
    copy.providers = copy.providers.map((p) => {
      if (!p || typeof p !== 'object') return p
      const { password, ...rest } = p
      return { ...rest, hasPassword: Boolean(password) }
    })
  }
  return copy
}

function logLine(...parts) {
  try {
    ensureDir(path.join(DATA_DIR, 'logs'))
    const file = path.join(DATA_DIR, 'logs', timestamp().slice(0, 10) + '.log')
    fs.appendFileSync(file, '[' + new Date().toISOString() + '] ' + parts.map(String).join(' ') + '\n')
  } catch {}
}

function json(res, status, body) {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Content-Length': Buffer.byteLength(payload)
  })
  res.end(payload)
}

function isLoopback(req) {
  const addr = req.socket && req.socket.remoteAddress
  return addr === '127.0.0.1' || addr === '::1' || addr === '::ffff:127.0.0.1'
}

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > limit) { reject(new Error('body too large')); req.destroy(); return }
      chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

function parseUrl(req) {
  return new URL(req.url || '/', 'http://127.0.0.1')
}

function fileHash(buf) {
  return sha256(buf)
}

export function apply(ctx, rawConfig) {
  ensureDir(DATA_DIR)
  ensureDir(path.join(DATA_DIR, 'logs'))
  ensureDir(TRASH_DIR)
  ensureDir(CONFLICT_DIR)
  let config = readConfig()
  const providersNow = listProviders(config)
  if (!config.syncProviderId) {
    const chosen = chooseDefaultProvider(config, providersNow)
    if (chosen) { config.syncProviderId = chosen; saveConfig(config) }
  }

  let syncing = false
  let pullTimer = null
  let pushTimer = null
  let disposed = false

  async function doSync(direction, options = {}) {
    if (syncing) return { ok: false, error: '已有同步任务在运行', running: true }
    syncing = true
    try {
      const cfg = readConfig()
      const sources = discoverSources(cfg)
      const providers = listProviders(cfg)
      const result = await runSync({ config: cfg, sources, providers, direction, backup: options.backup === true })
      logLine('sync', direction, 'ok=' + result.ok, 'pulled=' + result.pulled, 'pushed=' + result.pushed, 'conflicts=' + result.conflicts)
      return result
    } catch (error) {
      logLine('sync error', error && error.stack ? error.stack : error)
      return { ok: false, error: error && error.message ? error.message : String(error) }
    } finally {
      syncing = false
    }
  }

  function schedulePull(delay) {
    if (disposed) return
    try { clearTimeout(pullTimer) } catch {}
    pullTimer = setTimeout(() => {
      pullTimer = null
      const cfgNow = readConfig()
      if (!disposed && cfgNow.autoPullOnStart && cfgNow.syncProviderId) doSync('pull').catch(() => {})
    }, delay == null ? (readConfig().pullOnStartDelayMs || 12000) : delay)
    if (pullTimer && typeof pullTimer.unref === 'function') pullTimer.unref()
  }

  function schedulePush() {
    if (disposed) return
    try { clearTimeout(pushTimer) } catch {}
    const cfg = readConfig()
    if (!cfg.autoPushOnTurnStop || !cfg.syncProviderId) return
    pushTimer = setTimeout(() => {
      pushTimer = null
      const cfgNow = readConfig()
      if (!disposed && cfgNow.autoPushOnTurnStop && cfgNow.syncProviderId) doSync('push', { backup: true }).catch(() => {})
    }, cfg.pushDebounceMs || 30000)
    if (pushTimer && typeof pushTimer.unref === 'function') pushTimer.unref()
  }

  if (config.autoPullOnStart) schedulePull(15000)

  ctx.effect(() => {
    const off = ctx.on('agent/turn-stopping', () => schedulePush())
    return () => {
      disposed = true
      try { if (typeof off === 'function') off() } catch {}
      try { if (pullTimer) clearTimeout(pullTimer) } catch {}
      try { if (pushTimer) clearTimeout(pushTimer) } catch {}
    }
  }, 'memory-drive: lifecycle')

  ctx.inject(['systemPrompt'], (sctx) => {
    sctx.effect(() => {
    const sectionDispose = sctx.systemPrompt.section({
      name: 'memory-drive:cloud-memory',
      order: 10260,
      text: () => {
        try {
          const cfg = readConfig()
          if (!cfg.injectMemory) return ''
          if (!fs.existsSync(DIGEST_PATH)) return ''
          const text = fs.readFileSync(DIGEST_PATH, 'utf8').trim()
          return text ? '<cloud_memory source="memory-drive">\n' + text + '\n</cloud_memory>' : ''
        } catch { return '' }
      }
    })
    return () => { try { if (typeof sectionDispose === 'function') sectionDispose() } catch {} }
    }, 'memory-drive: prompt section')
  })

  ctx.inject(['webServer'], (wctx) => {
    wctx.effect(() => {
    const register = (routePath, handler) => wctx.webServer.register({ kind: 'exact', path: routePath, handler })
    const disposeFns = []

    const wrap = (handler) => async (req, res) => {
      if (!isLoopback(req)) return json(res, 403, { ok: false, error: 'loopback only' })
      try { await handler(req, res) } catch (error) {
        logLine('route error', error && error.stack ? error.stack : error)
        if (!res.headersSent) json(res, 500, { ok: false, error: error && error.message ? error.message : String(error) })
        else try { res.end() } catch {}
      }
    }

    disposeFns.push(register('/api/memory-drive/status', wrap(async (req, res) => {
      const cfg = readConfig()
      const providers = listProviders(cfg)
      const sources = discoverSources(cfg)
      let state = null
      try { state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8')) } catch {}
      const syncState = state && state.providers && cfg.syncProviderId ? state.providers[cfg.syncProviderId] : null
      const fileCounts = {}
      for (const source of sources) {
        try { fileCounts[source.id] = listFiles(cfg, source, { maxFiles: 20000 }).length } catch { fileCounts[source.id] = 0 }
      }
      json(res, 200, {
        ok: true,
        plugin: { name, version: VERSION },
        config: publicConfig(cfg),
        providers: providers.map((p) => publicProvider(p, cfg)),
        sources: sources.map((s) => ({
          id: s.id, label: s.label, description: s.description, enabled: s.enabled,
          sync: s.sync, builtin: s.builtin, roots: s.roots.map((r) => ({ id: r.id, dir: r.dir })), fileCount: fileCounts[s.id] || 0
        })),
        lastSync: syncState && syncState.updatedAt ? { at: syncState.updatedAt, files: Object.keys(syncState.files || {}).length } : null,
        paths: { dataDir: DATA_DIR, config: CONFIG_PATH, state: STATE_PATH, trash: TRASH_DIR, conflicts: CONFLICT_DIR, digest: DIGEST_PATH },
        syncing
      })
    })))

    disposeFns.push(register('/api/memory-drive/files', wrap(async (req, res) => {
      const cfg = readConfig()
      const url = parseUrl(req)
      const sourceId = url.searchParams.get('source') || ''
      const source = findSource(cfg, sourceId)
      if (!source) return json(res, 404, { ok: false, error: 'unknown source' })
      const files = listFiles(cfg, source, { maxFiles: 20000 }).map((f) => ({
        source: f.sourceId, root: f.rootId, path: f.rel, size: f.size, mtime: f.mtime
      }))
      json(res, 200, { ok: true, source: sourceId, files })
    })))

    disposeFns.push(register('/api/memory-drive/file', wrap(async (req, res) => {
      const cfg = readConfig()
      const url = parseUrl(req)
      if (req.method === 'GET') {
        const sourceId = url.searchParams.get('source') || ''
        const rootId = url.searchParams.get('root') || ''
        const rel = url.searchParams.get('path') || ''
        let resolved
        try { resolved = resolveFile(cfg, sourceId, rootId, rel) } catch (error) { return json(res, 400, { ok: false, error: error.message }) }
        let st
        try { st = fs.statSync(resolved.absPath) } catch { return json(res, 404, { ok: false, error: 'file not found' }) }
        if (!st.isFile()) return json(res, 404, { ok: false, error: 'not a file' })
        if (st.size > cfg.maxFileBytes) return json(res, 413, { ok: false, error: 'file too large', size: st.size })
        const buf = fs.readFileSync(resolved.absPath)
        if (!isProbablyText(buf)) return json(res, 415, { ok: false, error: 'binary file' })
        json(res, 200, {
          ok: true, source: sourceId, root: rootId, path: rel,
          content: buf.toString('utf8'), hash: sha256(buf), size: st.size, mtime: st.mtimeMs
        })
        return
      }
      if (req.method === 'POST') {
        const body = JSON.parse(await readBody(req, cfg.maxFileBytes * 2 + 65536))
        const sourceId = String(body.source || '')
        const rootId = String(body.root || '')
        const rel = String(body.path || '')
        const content = typeof body.content === 'string' ? body.content : ''
        const baseHash = typeof body.baseHash === 'string' ? body.baseHash : ''
        let resolved
        try { resolved = resolveFile(cfg, sourceId, rootId, rel) } catch (error) { return json(res, 400, { ok: false, error: error.message }) }
        let currentHash = ''
        try { currentHash = sha256(fs.readFileSync(resolved.absPath)) } catch {}
        if (baseHash && currentHash && baseHash !== currentHash) {
          return json(res, 409, { ok: false, error: 'conflict', hash: currentHash })
        }
        ensureDir(path.dirname(resolved.absPath))
        const tmp = resolved.absPath + '.' + process.pid + '.tmp'
        fs.writeFileSync(tmp, content, 'utf8')
        fs.renameSync(tmp, resolved.absPath)
        const hash = sha256(Buffer.from(content, 'utf8'))
        json(res, 200, { ok: true, hash, size: Buffer.byteLength(content), mtime: Date.now() })
        return
      }
      if (req.method === 'DELETE') {
        const sourceId = url.searchParams.get('source') || ''
        const rootId = url.searchParams.get('root') || ''
        const rel = url.searchParams.get('path') || ''
        if (url.searchParams.get('confirm') !== '1') return json(res, 400, { ok: false, error: 'confirm required' })
        let resolved
        try { resolved = resolveFile(cfg, sourceId, rootId, rel) } catch (error) { return json(res, 400, { ok: false, error: error.message }) }
        if (!fs.existsSync(resolved.absPath)) return json(res, 404, { ok: false, error: 'file not found' })
        const trashPath = path.join(TRASH_DIR, timestamp(), sourceId, rootId, rel)
        ensureDir(path.dirname(trashPath))
        fs.renameSync(resolved.absPath, trashPath)
        json(res, 200, { ok: true, trashed: trashPath })
        return
      }
      json(res, 405, { ok: false, error: 'method not allowed' })
    })))

    disposeFns.push(register('/api/memory-drive/sync', wrap(async (req, res) => {
      if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'method not allowed' })
      const body = JSON.parse(await readBody(req, 65536))
      const mode = body.mode === 'pull' || body.mode === 'push' || body.mode === 'backup' ? body.mode : 'both'
      const result = await doSync(mode, { backup: body.backup === true || mode === 'backup' })
      json(res, result.ok ? 200 : 500, result)
    })))

    disposeFns.push(register('/api/memory-drive/config', wrap(async (req, res) => {
      if (req.method === 'GET') return json(res, 200, { ok: true, config: publicConfig(readConfig()) })
      if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'method not allowed' })
      const body = JSON.parse(await readBody(req, 262144))
      const patch = body && typeof body === 'object' ? body : {}
      const next = normalizeConfig({ ...readConfig(), ...patch })
      const providers = listProviders(next)
      if (next.syncProviderId && !providers.some((p) => p.id === next.syncProviderId && p.configured)) next.syncProviderId = null
      next.backupProviderIds = next.backupProviderIds.filter((id) => providers.some((p) => p.id === id && p.configured))
      if (next.syncProviderId && next.backupProviderIds.includes(next.syncProviderId)) {
        next.backupProviderIds = next.backupProviderIds.filter((id) => id !== next.syncProviderId)
      }
      const previousProviders = readConfig().providers
      next.providers = next.providers.map((p) => {
        if (!p || typeof p !== 'object') return p
        const { password, ...rest } = p
        if (p.hasPassword === true && password === undefined) {
          const old = previousProviders.find((x) => x && x.id === p.id)
          if (old && old.password) return { ...rest, password: old.password }
        }
        return p
      })
      saveConfig(next)
      json(res, 200, { ok: true, config: publicConfig(next) })
    })))

    disposeFns.push(register('/api/memory-drive/provider/test', wrap(async (req, res) => {
      if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'method not allowed' })
      const body = JSON.parse(await readBody(req, 65536))
      const cfg = readConfig()
      const provider = providerById(cfg, String(body.id || ''))
      if (!provider) return json(res, 404, { ok: false, error: 'provider not found' })
      const backend = backendFor(provider)
      if (!backend) return json(res, 400, { ok: false, error: 'provider not usable' })
      try {
        const files = await backend.list('')
        json(res, 200, { ok: true, files: files.length, sample: files.slice(0, 5).map((f) => f.rel) })
      } catch (error) {
        json(res, 500, { ok: false, error: error && error.message ? error.message : String(error) })
      }
    })))

    return () => { for (const dispose of disposeFns) { try { if (typeof dispose === 'function') dispose() } catch {} } }
    }, 'memory-drive: web routes')
  })
}
