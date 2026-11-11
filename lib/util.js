import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import crypto from 'node:crypto'

export const HOME = os.homedir()
export const DSH_HOME = process.env.DSH_HOME ? path.resolve(process.env.DSH_HOME) : path.join(HOME, '.dsh')
export const DATA_DIR = path.join(DSH_HOME, 'memory-drive')
export const CONFIG_PATH = path.join(DATA_DIR, 'config.json')
export const STATE_PATH = path.join(DATA_DIR, 'state.json')
export const TRASH_DIR = path.join(DATA_DIR, 'trash')
export const CONFLICT_DIR = path.join(DATA_DIR, 'conflicts')
export const DIGEST_PATH = path.join(DATA_DIR, 'digest.md')
export const CLOUD_SUBDIR = 'DSHMemory'

export function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

export function readJsonSync(file, fallback) {
  try {
    const text = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '')
    return JSON.parse(text)
  } catch {
    return fallback
  }
}

export function writeJsonSync(file, value) {
  ensureDir(path.dirname(file))
  const tmp = file + '.' + process.pid + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2) + '\n', 'utf8')
  fs.renameSync(tmp, file)
}

export function writeTextAtomic(file, text) {
  ensureDir(path.dirname(file))
  const tmp = file + '.' + process.pid + '.tmp'
  fs.writeFileSync(tmp, text, 'utf8')
  fs.renameSync(tmp, file)
}

export function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex')
}

/** A conservative text check: NUL byte or invalid UTF-8 means binary. */
export function isProbablyText(buf) {
  if (buf.length === 0) return true
  const head = buf.subarray(0, Math.min(buf.length, 4096))
  for (const b of head) if (b === 0) return false
  try {
    new TextDecoder('utf-8', { fatal: true }).decode(head, { stream: true })
    return true
  } catch {
    return false
  }
}

export function normalizeRel(rel) {
  if (typeof rel !== 'string' || rel === '') return null
  const p = rel.replace(/\\/g, '/').replace(/^\/+/, '')
  if (p.startsWith('../') || p.includes('/../') || p === '..') return null
  if (p.includes('\0')) return null
  return p
}

export function joinRel(root, rel) {
  const safe = normalizeRel(rel)
  if (!safe) throw new Error('invalid relative path')
  const full = path.resolve(root, safe)
  const base = path.resolve(root)
  const lowerBase = base.toLowerCase()
  const lowerFull = full.toLowerCase()
  if (lowerFull !== lowerBase && !lowerFull.startsWith(lowerBase + path.sep.toLowerCase())) {
    throw new Error('path escapes root')
  }
  return full
}

export function walkFilesSync(root, options = {}) {
  const out = []
  const maxFiles = options.maxFiles || 5000
  const skipDirs = new Set(options.skipDirs || ['node_modules', '.git', '__pycache__', 'node_modules_cache', '.cache'])
  function walk(dir, relBase) {
    let entries
    try { entries = fs.readdirSync(dir, { withFileTypes: true }) } catch { return }
    entries.sort((a, b) => a.name.localeCompare(b.name))
    // Files first, then subdirectories: a huge subtree must not starve the files
    // sitting next to it (e.g. ~/.workbuddy/MEMORY.md next to projects/).
    for (const entry of entries) {
      if (out.length >= maxFiles) return
      if (!entry.isFile()) continue
      out.push(relBase ? relBase + '/' + entry.name : entry.name)
    }
    for (const entry of entries) {
      if (out.length >= maxFiles) return
      if (!entry.isDirectory()) continue
      if (skipDirs.has(entry.name)) continue
      walk(path.join(dir, entry.name), relBase ? relBase + '/' + entry.name : entry.name)
    }
  }
  walk(root, '')
  return out
}

/** Match a posix relative path against a tiny glob dialect: *, **, and literal text. */
export function matchGlob(rel, pattern) {
  const r = String(rel).replace(/\\/g, '/')
  const p = String(pattern).replace(/\\/g, '/')
  const escape = (s) => s.replace(/[.+^${}()|[\]\\]/g, '\\$&')
  let re = ''
  for (let i = 0; i < p.length; i++) {
    const ch = p[i]
    if (ch === '*') {
      if (p[i + 1] === '*') {
        if (p[i + 2] === '/') { re += '(?:.*/)?'; i += 2 } else { re += '.*'; i++ }
      } else { re += '[^/]*' }
    } else if (ch === '?') {
      re += '[^/]'
    } else {
      re += escape(ch)
    }
  }
  return new RegExp('^' + re + '$').test(r)
}

export function matchAny(rel, patterns) {
  if (!patterns || patterns.length === 0) return true
  return patterns.some((p) => matchGlob(rel, p))
}

export function timestamp(date = new Date()) {
  const d = date
  const pad = (n) => String(n).padStart(2, '0')
  return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '-' + pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds())
}

export function isDir(p) {
  try { return fs.statSync(p).isDirectory() } catch { return false }
}

export function exists(p) {
  try { fs.accessSync(p); return true } catch { return false }
}

export function safeLabel(value, fallback) {
  const s = String(value == null ? '' : value).trim()
  return s === '' ? fallback : s
}
