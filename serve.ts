// serve.ts — a tiny static server for game/, Node 22, standard library only.
// A development convenience, not a web server for the internet.
// Running `node serve.ts` serves game/ on http://localhost:8080.

import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const root = resolve(join(here, 'game'));

let port = 8080;
const portArg = process.argv.find((a) => a.startsWith('--port='));
if (portArg) {
  const p = parseInt(portArg.slice('--port='.length), 10);
  if (Number.isInteger(p) && p > 0 && p < 65536) port = p;
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.bin': 'application/octet-stream',
  '.wasm': 'application/wasm',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.txt': 'text/plain; charset=utf-8',
};

const server = createServer((req, res) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    res.writeHead(400, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('bad request');
    return;
  }
  if (pathname.endsWith('/')) pathname += 'index.html';
  const resolved = resolve(join(root, normalize(pathname)));
  if (resolved !== root && !resolved.startsWith(root + '/')) {
    res.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('forbidden');
    return;
  }
  if (!existsSync(resolved) || !statSync(resolved).isFile()) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('not found');
    return;
  }
  const type = MIME[extname(resolved).toLowerCase()] || 'application/octet-stream';
  res.writeHead(200, {
    'content-type': type,
    'content-length': statSync(resolved).size,
    'cache-control': 'no-store',
  });
  createReadStream(resolved).pipe(res);
});

server.listen(port, '127.0.0.1', () => {
  console.log('game/ is on http://localhost:' + port);
});
