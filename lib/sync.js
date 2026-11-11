import fs from 'node:fs'
import path from 'node:path'
import {
  STATE_PATH, CONFLICT_DIR, DIGEST_PATH, DSH_HOME,
  ensureDir, sha256, writeJsonSync, timestamp, joinRel
} from './util.js'
import { listFiles, sourceFileKey } from './sources.js'

export function cloudRelOf(sourceId, rootId, rel) {
  return 'sources/' + sourceId + '/' + rootId + '/' + rel
}

function loadStateFor(providerId) {
  let raw = null
  try { raw = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8').replace(/^\uFEFF/, '')) } catch { raw = null }
  if (!raw || typeof raw !== 'object') raw = { version: 1, providers: {} }
  if (!raw.providers || typeof raw.providers !== 'object') raw.providers = {}
  if (!raw.providers[providerId] || typeof raw.providers[providerId] !== 'object') raw.providers[providerId] = { files: {} }
  if (!raw.providers[providerId].files) raw.providers[providerId].files = {}
  return raw
}

function saveState(raw) {
  writeJsonSync(STATE_PATH, raw)
}

function localFileEntry(sourceId, rootId, rel, absPath) {
  let st
  try { st = fs.statSync(absPath) } catch { return null }
  if (!st.isFile()) return null
  return { key: sourceFileKey(sourceId, rootId, rel), cloudRel: cloudRelOf(sourceId, rootId, rel), absPath, size: st.size, mtime: st.mtimeMs }
}

function localFilesForSync(config, sources, entryFilter) {
  const out = []
  for (const source of sources) {
    if (!source.sync) continue
    const files = listFiles(config, source, { maxFiles: 20000 })
    for (const file of files) {
      const entry = localFileEntry(file.sourceId, file.rootId, file.rel, file.absPath)
      if (!entry) continue
      if (entryFilter && !entryFilter(entry)) continue
      out.push(entry)
    }
  }
  return out
}

async function saveConflict(provider, cloudRel, cloudBuf, stamp) {
  const dir = path.join(CONFLICT_DIR, stamp)
  const full = joinRel(dir, cloudRel)
  ensureDir(path.dirname(full))
  await fs.promises.writeFile(full, cloudBuf)
  ensureDir(dir)
  return full
}

function writeLocal(absPath, buf) {
  ensureDir(path.dirname(absPath))
  const tmp = absPath + '.' + process.pid + '.tmp'
  fs.writeFileSync(tmp, buf)
  fs.renameSync(tmp, absPath)
}

function buildDigest(config) {
  if (!config.injectMemory) {
    try { fs.unlinkSync(DIGEST_PATH) } catch {}
    return ''
  }
  const parts = []
  const userMemory = path.join(DSH_HOME, 'memory', 'MEMORY.md')
  try {
    const text = fs.readFileSync(userMemory, 'utf8')
    parts.push('## 用户级记忆（云同步）\n' + text.trim())
  } catch {}
  const workspaceMemory = path.join(DSH_HOME, 'memory', 'workspaces')
  let names = []
  try { names = fs.readdirSync(workspaceMemory) } catch {}
  for (const name of names) {
    const file = path.join(workspaceMemory, name, 'MEMORY.md')
    try {
      const text = fs.readFileSync(file, 'utf8')
      if (text.trim()) parts.push('## 项目记忆 · ' + name + '\n' + text.trim())
    } catch {}
  }
  const joined = parts.join('\n\n')
  const limited = joined.slice(0, Math.max(100, Number(config.injectMaxChars) || 4000))
  try {
    ensureDir(path.dirname(DIGEST_PATH))
    fs.writeFileSync(DIGEST_PATH, limited + (joined.length > limited.length ? '\n\n…（截断）' : ''), 'utf8')
  } catch {}
  return limited
}

/**
 * Sync engine. Layout on the cloud side:
 *   DSHMemory/sources/<sourceId>/<rootId>/<relative path>
 * The baseline (state.json) records the last agreed local and cloud hashes per file,
 * which is what separates "changed here" from "changed there" from "both changed".
 */
export async function runSync({ config, sources, providers, direction = 'both', providerId, backup = false }) {
  const primary = providers.find((p) => p.id === (providerId || config.syncProviderId) && p.configured)
  const state = primary ? loadStateFor(primary.id) : { version: 1, providers: {} }
  const baseline = primary ? state.providers[primary.id].files : {}
  const stamp = timestamp()
  const summary = {
    ok: true, direction, backup, provider: primary ? primary.id : null, startedAt: Date.now(),
    pulled: 0, pushed: 0, conflicts: 0, skipped: 0, missing: 0, backedUp: 0, errors: [], conflictFiles: []
  }
  if (!primary) {
    summary.ok = false
    summary.errors.push('没有选择同步网盘（sync provider）')
    summary.finishedAt = Date.now()
    return summary
  }
  const { backendFor } = await import('./providers.js')
  const backend = backendFor(primary)
  if (!backend) {
    summary.ok = false
    summary.errors.push('网盘后端不可用：' + primary.id)
    summary.finishedAt = Date.now()
    return summary
  }

  const conflictSeen = new Set()
  const localFiles = localFilesForSync(config, sources)
  const localByCloudRel = new Map(localFiles.map((f) => [f.cloudRel, f]))
  const finish = () => {
    summary.finishedAt = Date.now()
    if (primary) {
      state.providers[primary.id] = { files: baseline, updatedAt: Date.now() }
      saveState(state)
    }
    return summary
  }

  const cloudList = async () => (await backend.list('sources/')).filter((e) => e.rel.startsWith('sources/'))
  const readCloud = async (rel) => await backend.read(rel)

  async function doPull() {
    let listing
    try { listing = await cloudList() } catch (error) {
      summary.ok = false
      summary.errors.push('读取云端列表失败：' + (error && error.message ? error.message : String(error)))
      return
    }
    for (const cloudEntry of listing) {
      const rel = cloudEntry.rel
      const local = localByCloudRel.get(rel)
      let cloudBuf
      try { cloudBuf = await readCloud(rel) } catch (error) {
        summary.errors.push('读取云端文件失败 ' + rel + ': ' + (error && error.message ? error.message : String(error)))
        continue
      }
      const cloudSha = sha256(cloudBuf)
      const base = baseline[rel]
      if (!local) {
        if (base) {
          summary.missing += 1
          summary.skipped += 1
          continue
        }
        const sourceId = rel.split('/')[1]
        const rootId = rel.split('/')[2]
        const rest = rel.split('/').slice(3).join('/')
        const source = sources.find((s) => s.id === sourceId)
        const root = source && source.roots ? source.roots.find((r) => r.id === rootId) : null
        if (!source || !root) { summary.skipped += 1; continue }
        try {
          const abs = joinRel(root.dir, rest)
          writeLocal(abs, cloudBuf)
          baseline[rel] = { localSha: cloudSha, cloudSha, size: cloudBuf.length, mtime: Date.now(), syncedAt: Date.now() }
          summary.pulled += 1
          summary.missing += 1
        } catch (error) {
          summary.errors.push('写入本地失败 ' + rel + ': ' + (error && error.message ? error.message : String(error)))
        }
        continue
      }
      let localBuf
      try { localBuf = fs.readFileSync(local.absPath) } catch (error) {
        summary.errors.push('读取本地文件失败 ' + rel + ': ' + (error && error.message ? error.message : String(error)))
        continue
      }
      const localSha = sha256(localBuf)
      if (localSha === cloudSha) {
        baseline[rel] = { localSha, cloudSha, size: cloudBuf.length, mtime: Date.now(), syncedAt: Date.now() }
        summary.skipped += 1
        continue
      }
      const localChanged = !base || base.localSha !== localSha
      const cloudChanged = !base || base.cloudSha !== cloudSha
      if (!localChanged && cloudChanged) {
        try {
          writeLocal(local.absPath, cloudBuf)
          baseline[rel] = { localSha: cloudSha, cloudSha, size: cloudBuf.length, mtime: Date.now(), syncedAt: Date.now() }
          summary.pulled += 1
        } catch (error) {
          summary.errors.push('拉取写入失败 ' + rel + ': ' + (error && error.message ? error.message : String(error)))
        }
      } else if (localChanged && !cloudChanged) {
        summary.skipped += 1
      } else {
        if (!conflictSeen.has(rel)) {
          conflictSeen.add(rel)
          summary.conflicts += 1
          try {
            summary.conflictFiles.push(await saveConflict(primary, rel, cloudBuf, stamp))
          } catch {}
        }
      }
    }
  }

  async function doPush() {
    let listing
    try { listing = await cloudList() } catch (error) {
      summary.ok = false
      summary.errors.push('读取云端列表失败：' + (error && error.message ? error.message : String(error)))
      return
    }
    const cloudByRel = new Map(listing.map((e) => [e.rel, e]))
    for (const local of localFiles) {
      const rel = local.cloudRel
      const cloudEntry = cloudByRel.get(rel)
      let localBuf
      try { localBuf = fs.readFileSync(local.absPath) } catch (error) {
        summary.errors.push('读取本地文件失败 ' + rel + ': ' + (error && error.message ? error.message : String(error)))
        continue
      }
      const localSha = sha256(localBuf)
      if (!cloudEntry) {
        try {
          await backend.write(rel, localBuf)
          baseline[rel] = { localSha, cloudSha: localSha, size: localBuf.length, mtime: Date.now(), syncedAt: Date.now() }
          summary.pushed += 1
        } catch (error) {
          summary.errors.push('上传失败 ' + rel + ': ' + (error && error.message ? error.message : String(error)))
        }
        continue
      }
      let cloudBuf
      try { cloudBuf = await readCloud(rel) } catch (error) {
        summary.errors.push('读取云端文件失败 ' + rel + ': ' + (error && error.message ? error.message : String(error)))
        continue
      }
      const cloudSha = sha256(cloudBuf)
      if (cloudSha === localSha) {
        baseline[rel] = { localSha, cloudSha, size: localBuf.length, mtime: Date.now(), syncedAt: Date.now() }
        summary.skipped += 1
        continue
      }
      const base = baseline[rel]
      const localChanged = !base || base.localSha !== localSha
      const cloudChanged = !base || base.cloudSha !== cloudSha
      if (localChanged && !cloudChanged) {
        try {
          await backend.write(rel, localBuf)
          baseline[rel] = { localSha, cloudSha: localSha, size: localBuf.length, mtime: Date.now(), syncedAt: Date.now() }
          summary.pushed += 1
        } catch (error) {
          summary.errors.push('上传失败 ' + rel + ': ' + (error && error.message ? error.message : String(error)))
        }
      } else if (!localChanged && cloudChanged) {
        summary.skipped += 1
      } else {
        if (!conflictSeen.has(rel)) {
          conflictSeen.add(rel)
          summary.conflicts += 1
          try {
            summary.conflictFiles.push(await saveConflict(primary, rel, cloudBuf, stamp))
          } catch {}
        }
      }
    }
  }

  async function doBackup() {
    const backupIds = Array.isArray(config.backupProviderIds) ? config.backupProviderIds : []
    const targets = providers.filter((p) => backupIds.includes(p.id) && p.configured && p.id !== primary.id)
    for (const target of targets) {
      const backend2 = backendFor(target)
      if (!backend2) continue
      for (const local of localFiles) {
        try {
          const buf = fs.readFileSync(local.absPath)
          let current = null
          try { current = await backend2.read(local.cloudRel) } catch {}
          if (current && sha256(current) === sha256(buf)) continue
          await backend2.write(local.cloudRel, buf)
          summary.backedUp += 1
        } catch (error) {
          summary.errors.push('备份失败 ' + target.id + ' ' + local.cloudRel + ': ' + (error && error.message ? error.message : String(error)))
        }
      }
    }
  }

  if (direction === 'pull' || direction === 'both') await doPull()
  if (direction === 'push' || direction === 'both') await doPush()
  if ((backup || direction === 'backup') && direction !== 'pull') await doBackup()
  buildDigest(config)
  return finish()
}
