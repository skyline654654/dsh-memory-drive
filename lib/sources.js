import fs from 'node:fs'
import path from 'node:path'
import { HOME, DSH_HOME, matchAny, walkFilesSync, isDir, joinRel, normalizeRel } from './util.js'

/**
 * Memory sources are the places DSH memory plugins actually write to.
 * Only user-facing markdown is exposed; internal indexes/caches stay private.
 */
export function knownSourceDefinitions() {
  const autoMemoryRoot = path.join(DSH_HOME, 'memory')
  const workbuddyRoot = path.join(HOME, '.workbuddy')
  return [
    {
      id: 'auto-memory',
      label: { zh: '自动记忆 (dsh-auto-memory)', en: 'Auto Memory (dsh-auto-memory)' },
      description: {
        zh: '用户级 MEMORY.md、各工作区项目笔记、每日日志、交接账本、反思与归档。内部索引/向量/事件库不在此列。',
        en: 'User MEMORY.md, per-workspace notes, daily logs, handoff ledgers, reflections and archive. Internal indexes and caches are excluded.'
      },
      defaultSync: true,
      roots: [
        {
          id: 'memory',
          dir: autoMemoryRoot,
          include: [
            'MEMORY.md',
            'PENDING-USER-MEMORY.md',
            'CALENDAR.md',
            'workspaces/*/MEMORY.md',
            'workspaces/*/*.md',
            'workspaces/*/handoff/*.md',
            'workspaces/*/reflections/*.md',
            'workspaces/*/archive/*.md'
          ],
          exclude: ['workspaces/*/hub/*', '*/hub/*', '**/hub/**']
        }
      ],
      detect() { return isDir(autoMemoryRoot) }
    },
    {
      id: 'workbuddy-memory',
      label: { zh: 'WorkBuddy 记忆（可选）', en: 'WorkBuddy memory (optional)' },
      description: {
        zh: '~/.workbuddy 下的 MEMORY.md 与 memory/。注意：该目录默认由 huaweicloud-memory-sync 技能同步，启用本源的云同步可能与之重叠，默认只读/不参与同步。',
        en: 'MEMORY.md and memory/ under ~/.workbuddy. The huaweicloud-memory-sync skill already syncs this tree; enabling this source for sync may overlap, so sync is off by default.'
      },
      defaultSync: false,
      roots: [
        { id: 'memory', dir: path.join(workbuddyRoot), include: ['MEMORY.md', 'memory/**/*.md'], exclude: [] }
      ],
      detect() { return isDir(workbuddyRoot) }
    }
  ]
}

function sourceFromDefinition(def, config) {
  return {
    id: def.id,
    label: def.label,
    description: def.description,
    enabled: true,
    sync: config.sourceSync && config.sourceSync[def.id] !== undefined ? config.sourceSync[def.id] === true : def.defaultSync === true,
    builtin: true,
    roots: def.roots
  }
}

export function customSourceRoots(config) {
  const custom = Array.isArray(config.customSources) ? config.customSources : []
  return custom
    .filter((s) => s && typeof s.id === 'string' && s.id && s.enabled !== false && s.dir)
    .map((s) => ({
      id: s.id,
      label: { zh: s.label || s.id, en: s.label || s.id },
      description: { zh: '自定义记忆目录', en: 'Custom memory directory' },
      enabled: true,
      sync: s.sync !== false,
      builtin: false,
      roots: [{ id: 'root', dir: s.dir, include: s.include || ['**/*.md'], exclude: [] }]
    }))
}

export function discoverSources(config) {
  const defs = knownSourceDefinitions()
  const out = []
  for (const def of defs) {
    let detected = false
    try { detected = def.detect() } catch { detected = false }
    if (!detected) continue
    out.push(sourceFromDefinition(def, config || {}))
  }
  out.push(...customSourceRoots(config || {}))
  return out
}

export function findSource(config, sourceId) {
  return discoverSources(config).find((s) => s.id === sourceId) || null
}

function collectRootFiles(source, root, options) {
  const maxFiles = options.maxFiles || 5000
  const maxFileBytes = options.maxFileBytes || 4 * 1024 * 1024
  if (!isDir(root.dir)) return []
  const files = walkFilesSync(root.dir, { maxFiles: maxFiles * 2 })
  const out = []
  for (const rel of files) {
    if (out.length >= maxFiles) break
    if (!matchAny(rel, root.include)) continue
    if (root.exclude && root.exclude.length > 0 && matchAny(rel, root.exclude)) continue
    const full = joinRel(root.dir, rel)
    let st
    try { st = fs.statSync(full) } catch { continue }
    if (!st.isFile() || st.size > maxFileBytes) continue
    out.push({ sourceId: source.id, rootId: root.id, rel, size: st.size, mtime: st.mtimeMs, absPath: full })
  }
  return out
}

export function listFiles(config, source, options = {}) {
  if (!source) return []
  const out = []
  for (const root of source.roots) out.push(...collectRootFiles(source, root, options))
  out.sort((a, b) => {
    if (a.rel === b.rel) return 0
    return a.rel < b.rel ? -1 : 1
  })
  return out
}

export function resolveFile(config, sourceId, rootId, rel) {
  const source = findSource(config, sourceId)
  if (!source) throw new Error('unknown source')
  const root = source.roots.find((r) => r.id === rootId)
  if (!root) throw new Error('unknown root')
  const safe = normalizeRel(rel)
  if (!safe) throw new Error('invalid path')
  if (!matchAny(safe, root.include)) throw new Error('path is not in this source')
  if (root.exclude && root.exclude.length > 0 && matchAny(safe, root.exclude)) throw new Error('path is excluded')
  const full = joinRel(root.dir, safe)
  return { source, root, rel: safe, absPath: full }
}

export function sourceFileKey(sourceId, rootId, rel) {
  return sourceId + '/' + rootId + '/' + rel
}
