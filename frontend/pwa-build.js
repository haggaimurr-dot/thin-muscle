import { readdirSync, writeFileSync, readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
export function pwaBuild() {
  return {
    name: 'thin-muscle-offline',
    apply: 'build',
    closeBundle() {
      const dir = resolve('dist')
      const files = [
        '/index.html',
        '/manifest.webmanifest',
        '/icon-192.png',
        '/icon-512.png',
        ...readdirSync(resolve(dir, 'assets'))
          .filter((f) => /\.(js|css)$/.test(f))
          .map((f) => '/assets/' + f),
      ]
      const version = createHash('sha256')
        .update(files.map((f) => readFileSync(resolve(dir, '.' + f))).join(''))
        .digest('hex')
        .slice(0, 16)
      writeFileSync(
        resolve(dir, 'sw.js'),
        `
const CACHE = 'thin-muscle-static-${version}';
const FILES = ${JSON.stringify(files)};
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES))));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('thin-muscle-static-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('message', e => { if (e.data?.type === 'ACTIVATE_UPDATE') self.skipWaiting(); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== self.location.origin || u.pathname.startsWith('/api/')) return;
  if (e.request.mode === 'navigate') { e.respondWith(fetch(e.request).catch(() => caches.match('/index.html'))); return; }
  if (FILES.includes(u.pathname)) e.respondWith(caches.open(CACHE).then(c => c.match(u.pathname).then(r => r || fetch(e.request))));
});
`,
      )
    },
  }
}
