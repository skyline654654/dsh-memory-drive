import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { HOME, CLOUD_SUBDIR, ensureDir, isDir, walkFilesSync, joinRel, normalizeRel } from './util.js'

/** Candidate local sync folders exposed by mainstream cloud-drive clients on Windows. */
export const FOLDER_CANDIDATES = [
  {
    id: 'huawei',
    label: { zh: '华为云盘', en: 'Huawei Cloud Drive' },
    env: ['HUAWEI_CLOUD_DRIVE', 'WB_CLOUD_ROOT'],
    dirs: ['华为云盘', 'HuaweiCloudDrive', 'Huawei Cloud Drive', 'HuaweiCloudDriveSync']
  },
  {
    id: 'baidu',
    label: { zh: '百度网盘', en: 'Baidu Netdisk' },
    env: ['BAIDU_SYNC_DISK'],
    dirs: ['BaiduSyncdisk', '百度网盘', 'BaiduNetdisk', 'BaiduNetDiskDownload']
  },
  {
    id: 'quark',
    label: { zh: '夸克网盘', en: 'Quark Drive' },
    env: ['QUARK_SYNC_DIR'],
    dirs: ['Quark', '夸克网盘', 'QuarkDrive', 'QuarkCloudDrive', '夸克']
  },
  {
    id: 'aliyun',
    label: { zh: '阿里云盘', en: 'Aliyun Drive' },
    env: ['ALIYUN_DRIVE_DIR'],
    dirs: ['AliyunDrive', '阿里云盘', 'AliyunPan', '阿里云盘同步盘']
  },
  {
    id: 'onedrive',
    label: { zh: 'OneDrive', en: 'OneDrive' },
    env: ['OneDrive', 'OneDriveConsumer', 'OneDriveCommercial'],
    dirs: ['OneDrive']
  },
  {
    id: '123pan',
    label: { zh: '123 云盘', en: '123 Cloud Drive' },
    env: ['PAN123_SYNC_DIR'],
    dirs: ['123云盘', '123pan', '123CloudDrive']
  },
  {
    id: 'tianyi',
    label: { zh: '天翼云盘', en: 'Tianyi Cloud' },
    env: ['TIANYI_CLOUD_DIR'],
    dirs: ['天翼云盘', 'eCloud', 'TianyiCloud']
  }
]

function firstExistingDir(candidate) {
  for (const envName of candidate.env || []) {
    const value = process.env[envName]
    if (value && isDir(value)) return value
  }
  for (const name of candidate.dirs) {
    const p = path.join(HOME, name)
    if (isDir(p)) return p
  }
  return null
}

export function detectFolderProviders() {
  const out = []
  for (const candidate of FOLDER_CANDIDATES) {
    const root = firstExistingDir(candidate)
    out.push({
      id: 'folder:' + candidate.id,
      type: 'folder',
      kind: candidate.id,
      label: candidate.label,
      root: root || null,
      detected: root !== null,
      configured: root !== null,
      note: root === null ? { zh: '未检测到本地同步文件夹；可在「网盘」页手动添加路径。', en: 'No local sync folder detected; add a path manually in the Drives tab.' } : undefined
    })
  }
  return out
}

function customFolderProvider(entry, index) {
  const root = typeof entry.root === 'string' && isDir(entry.root) ? entry.root : null
  return {
    id: entry.id || 'folder:custom-' + index,
    type: 'folder',
    kind: 'custom',
    label: { zh: entry.label || '自定义网盘目录', en: entry.label || 'Custom cloud folder' },
    root,
    detected: root !== null,
    configured: root !== null,
    note: root === null ? { zh: '目录不存在或无权限', en: 'Directory missing or unreadable' } : undefined
  }
}

function webdavProvider(entry, index) {
  return {
    id: entry.id || 'webdav:' + index,
    type: 'webdav',
    kind: 'webdav',
    label: { zh: entry.label || 'WebDAV', en: entry.label || 'WebDAV' },
    url: typeof entry.url === 'string' ? entry.url.replace(/\/+$/, '') : '',
    username: entry.username || '',
    password: entry.password || '',
    detected: false,
    configured: Boolean(entry.url),
    note: { zh: '标准 WebDAV 协议（如坚果云、群晖、部分网盘提供的 WebDAV）。', en: 'Standard WebDAV (e.g. Nutstore, Synology, some drives).' }
  }
}

/** Merge auto-detected providers with user-configured ones. */
export function listProviders(config) {
  const detected = detectFolderProviders()
  const configured = Array.isArray(config.providers) ? config.providers : []
  const merged = []
  const seen = new Set()
  for (const p of detected) {
    merged.push(p)
    seen.add(p.id)
  }
  for (let i = 0; i < configured.length; i++) {
    const entry = configured[i] || {}
    const p = entry.type === 'webdav' ? webdavProvider(entry, i) : customFolderProvider(entry, i)
    if (seen.has(p.id)) {
      // A configured entry can supply a manual path for a detected-but-missing drive.
      const existing = merged.find((m) => m.id === p.id)
      if (existing && !existing.root && p.root) {
        existing.root = p.root
        existing.configured = true
        existing.detected = true
      }
      continue
    }
    merged.push(p)
    seen.add(p.id)
  }
  return merged
}

export function providerById(config, id) {
  const providers = listProviders(config)
  return providers.find((p) => p.id === id && p.configured) || null
}

/** Folder-backed provider implementation. */
export function folderBackend(provider) {
  if (!provider || provider.type !== 'folder' || !provider.root) return null
  const root = path.join(provider.root, CLOUD_SUBDIR)
  return {
    type: 'folder',
    root,
    async list(prefix = '') {
      ensureDir(root)
      const all = walkFilesSync(root, { maxFiles: 20000 })
      const out = []
      for (const rel of all) {
        if (prefix && !rel.startsWith(prefix)) continue
        const full = joinRel(root, rel)
        let st
        try { st = fs.statSync(full) } catch { continue }
        out.push({ rel, size: st.size, mtime: st.mtimeMs })
      }
      return out
    },
    async read(rel) {
      return await fsp.readFile(joinRel(root, rel))
    },
    async write(rel, buf) {
      const full = joinRel(root, rel)
      ensureDir(path.dirname(full))
      const tmp = full + '.' + process.pid + '.tmp'
      await fsp.writeFile(tmp, buf)
      await fsp.rename(tmp, full)
    },
    async remove(rel) {
      try { await fsp.unlink(joinRel(root, rel)) } catch (error) { if (error.code !== 'ENOENT') throw error }
    }
  }
}

function authHeader(provider) {
  if (!provider.username) return {}
  const token = Buffer.from(provider.username + ':' + provider.password, 'utf8').toString('base64')
  return { Authorization: 'Basic ' + token }
}

function davUrl(provider, rel) {
  const encoded = String(rel || '').split('/').map((s) => encodeURIComponent(s)).join('/')
  return provider.url + (encoded ? '/' + encoded : '')
}

function xmlText(xml) {
  return String(xml)
    .replace(/<\?xml[^>]*>/g, '')
}

function parseDavEntries(xml, baseLen) {
  const text = xmlText(xml)
  const blocks = text.split(/<[^:>]*:?response[\s>]/i).slice(1)
  const out = []
  for (const block of blocks) {
    const hrefMatch = block.match(/<[^>]*href[^>]*>([^<]+)</i)
    if (!hrefMatch) continue
    let href = decodeURIComponent(hrefMatch[1].trim())
    if (/^https?:\/\//i.test(href)) {
      try { href = new URL(href).pathname } catch {}
    }
    const rel = href.length >= baseLen ? href.slice(baseLen) : href
    const clean = rel.replace(/^\/+/, '').replace(/\/+$/, '')
    const isCollection = /<[^>]*resourcetype[^>]*>[\s\S]*?collection/i.test(block)
    const sizeMatch = block.match(/<[^>]*getcontentlength[^>]*>(\d+)</i)
    const lmMatch = block.match(/<[^>]*getlastmodified[^>]*>([^<]+)</i)
    out.push({ rel: clean, size: sizeMatch ? Number(sizeMatch[1]) : 0, mtime: lmMatch ? Date.parse(lmMatch[1]) || 0 : 0, isDir: isCollection })
  }
  return out
}

async function davRequest(provider, url, init = {}) {
  const res = await fetch(url, {
    ...init,
    headers: { ...authHeader(provider), ...(init.headers || {}) }
  })
  return res
}

/** WebDAV provider: list/read/write/remove against a dedicated collection. */
export function webdavBackend(provider) {
  if (!provider || provider.type !== 'webdav' || !provider.url) return null
  const base = provider.url
  return {
    type: 'webdav',
    async list(prefix = '') {
      const out = []
      const queue = ['']
      const seen = new Set()
      const seenDirs = new Set()
      while (queue.length > 0 && seen.size < 5000) {
        const dir = queue.shift()
        const url = davUrl(provider, dir) + '/'
        const res = await davRequest(provider, url, { method: 'PROPFIND', headers: { Depth: '1', 'Content-Type': 'application/xml' } })
        if (!res.ok) {
          if (res.status === 404 || res.status === 409) continue
          throw new Error('WebDAV PROPFIND ' + res.status + ' ' + dir)
        }
        const xml = await res.text()
        const baseLen = new URL(url).pathname.length
        for (const entry of parseDavEntries(xml, baseLen)) {
          const rel = dir ? dir + '/' + entry.rel : entry.rel
          if (entry.isDir) {
            if (!entry.rel) continue
            const childDir = dir ? dir + '/' + entry.rel : entry.rel
            if (!seenDirs.has(childDir)) { seenDirs.add(childDir); queue.push(childDir) }
            continue
          }
          if (seen.has(rel)) continue
          seen.add(rel)
          if (prefix && !rel.startsWith(prefix)) continue
          out.push({ rel, size: entry.size, mtime: entry.mtime })
        }
      }
      return out
    },
    async read(rel) {
      const res = await davRequest(provider, davUrl(provider, rel), { method: 'GET' })
      if (!res.ok) throw new Error('WebDAV GET ' + res.status + ' ' + rel)
      return Buffer.from(await res.arrayBuffer())
    },
    async write(rel, buf) {
      const parts = rel.split('/')
      let dir = ''
      for (let i = 0; i < parts.length - 1; i++) {
        dir = dir ? dir + '/' + parts[i] : parts[i]
        const res = await davRequest(provider, davUrl(provider, dir) + '/', { method: 'MKCOL' })
        if (!res.ok && res.status !== 405) throw new Error('WebDAV MKCOL ' + res.status + ' ' + dir)
      }
      const res = await davRequest(provider, davUrl(provider, rel), { method: 'PUT', body: buf })
      if (!res.ok) throw new Error('WebDAV PUT ' + res.status + ' ' + rel)
    },
    async remove(rel) {
      const res = await davRequest(provider, davUrl(provider, rel), { method: 'DELETE' })
      if (!res.ok && res.status !== 404) throw new Error('WebDAV DELETE ' + res.status + ' ' + rel)
    }
  }
}

export function backendFor(provider) {
  if (!provider || !provider.configured) return null
  if (provider.type === 'webdav') return webdavBackend(provider)
  return folderBackend(provider)
}
