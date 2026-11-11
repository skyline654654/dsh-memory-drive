import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import http from 'node:http'

process.env.DSH_HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'dsh-memory-drive-wdav-'))
const { webdavBackend } = await import('../lib/providers.js')

function xmlEscape(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') }
function parentOf(key) { const i = key.lastIndexOf('/'); return i <= 0 ? '/' : key.slice(0, i) }

/**
 * A small WebDAV server: PROPFIND (Depth 0/1), GET, PUT, MKCOL, DELETE
 * over an in-memory tree rooted at /dav.
 */
function startDav() {
  const store = new Map()
  store.set('/dav', { dir: true, mtime: Date.now() })
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1')
    const p = decodeURIComponent(url.pathname)
    const key = p.replace(/\/+$/, '') || '/'
    if (req.method === 'PROPFIND') {
      const depth = String(req.headers.depth || '1')
      if (!store.has(key)) { res.writeHead(404); res.end(); return }
      const now = Date.now()
      const entries = [{ href: p.endsWith('/') ? p : p + '/', dir: true, mtime: store.get(key).mtime || now }]
      if (depth !== '0') {
        for (const [k, v] of store) {
          if (k === key || parentOf(k) !== key) continue
          entries.push({ href: v.dir ? k + '/' : k, dir: v.dir, size: v.data ? v.data.length : 0, mtime: v.mtime })
        }
      }
      const body = '<?xml version="1.0" encoding="utf-8"?><D:multistatus xmlns:D="DAV:">' + entries.map((e) => '<D:response><D:href>' + xmlEscape(e.href) + '</D:href><D:propstat><D:prop>' + (e.dir ? '<D:resourcetype><D:collection/></D:resourcetype>' : '<D:resourcetype/><D:getcontentlength>' + e.size + '</D:getcontentlength>') + '<D:getlastmodified>' + new Date(e.mtime).toUTCString() + '</D:getlastmodified></D:prop><D:status>HTTP/1.1 200 OK</D:status></D:propstat></D:response>').join('') + '</D:multistatus>'
      res.writeHead(207, { 'Content-Type': 'application/xml' }); res.end(body); return
    }
    if (req.method === 'GET') {
      const entry = store.get(key)
      if (!entry || entry.dir) { res.writeHead(404); res.end(); return }
      res.writeHead(200); res.end(entry.data); return
    }
    if (req.method === 'PUT') {
      const chunks = []
      req.on('data', (c) => chunks.push(c))
      req.on('end', () => {
        store.set(key, { dir: false, data: Buffer.concat(chunks), mtime: Date.now() })
        res.writeHead(201); res.end()
      })
      return
    }
    if (req.method === 'MKCOL') {
      if (store.has(key)) { res.writeHead(405); res.end(); return }
      store.set(key, { dir: true, mtime: Date.now() })
      res.writeHead(201); res.end(); return
    }
    if (req.method === 'DELETE') {
      if (!store.has(key)) { res.writeHead(404); res.end(); return }
      for (const k of [...store.keys()]) if (k === key || k.startsWith(key + '/')) store.delete(k)
      res.writeHead(204); res.end(); return
    }
    res.writeHead(405); res.end()
  })
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port })))
}

test('webdav backend lists, reads, writes and removes files across nested collections', async () => {
  const { server, port } = await startDav()
  const provider = { id: 'webdav:test', type: 'webdav', url: 'http://127.0.0.1:' + port + '/dav', username: 'u', password: 'p', configured: true }
  const backend = webdavBackend(provider)
  assert.ok(backend)
  await backend.write('DSHMemory/sources/s/root/a.md', Buffer.from('hello from dav'))
  await backend.write('DSHMemory/sources/s/root/deep/b.md', Buffer.from('nested'))
  const list = await backend.list('')
  assert.deepEqual(list.map((e) => e.rel).sort(), ['DSHMemory/sources/s/root/a.md', 'DSHMemory/sources/s/root/deep/b.md'])
  const buf = await backend.read('DSHMemory/sources/s/root/a.md')
  assert.equal(buf.toString('utf8'), 'hello from dav')
  await backend.remove('DSHMemory/sources/s/root/a.md')
  assert.deepEqual((await backend.list('')).map((e) => e.rel), ['DSHMemory/sources/s/root/deep/b.md'])
  await new Promise((resolve) => { server.close(resolve); server.closeAllConnections() })
})
