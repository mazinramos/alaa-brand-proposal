import http from 'node:http';
import net from 'node:net';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { SetupError } from './env.mjs';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

/** خادم ثابت للقراءة فقط على منفذ عشوائي. */
export function startStaticServer(dir) {
  const root = path.resolve(dir);
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      try {
        const { pathname } = new URL(req.url, 'http://x');
        let file = path.join(root, decodeURIComponent(pathname));
        if (file !== root && !file.startsWith(root + path.sep)) {
          res.writeHead(403).end();
          return;
        }
        if (existsSync(file) && statSync(file).isDirectory()) file = path.join(file, 'index.html');
        if (!existsSync(file)) {
          res.writeHead(404, { 'content-type': 'text/plain' }).end('not found');
          return;
        }
        res.writeHead(200, {
          'content-type': MIME[path.extname(file)] || 'application/octet-stream',
          'cache-control': 'no-store',
        });
        createReadStream(file).pipe(res);
      } catch (e) {
        res.writeHead(500).end(String(e));
      }
    });
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const origin = `http://127.0.0.1:${server.address().port}`;
      resolve({ url: origin, origin, close: () => new Promise((r) => server.close(r)) });
    });
  });
}

function freePort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.on('error', reject);
    s.listen(0, '127.0.0.1', () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
  });
}

function viteBin(siteRoot) {
  const bin = path.join(siteRoot, 'node_modules', 'vite', 'bin', 'vite.js');
  if (!existsSync(bin)) {
    throw new SetupError('Vite غير مثبّت. شغّل أولاً: npm install (من داخل مجلد site/).');
  }
  return bin;
}

export function buildVite(siteRoot) {
  const bin = viteBin(siteRoot);
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [bin, 'build'], { cwd: siteRoot });
    let out = '';
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (out += d));
    child.on('exit', (code) => {
      if (code === 0) return resolve();
      reject(new SetupError('فشل بناء Vite (npm run build). آخر المخرجات:\n' + out.split('\n').slice(-25).join('\n')));
    });
  });
}

/** يشغّل vite preview (أو vite dev مع --dev) على منفذ حرّ وينتظر جاهزيته. */
export async function startVite(siteRoot, { dev = false } = {}) {
  const bin = viteBin(siteRoot);
  const port = await freePort();
  const args = [bin, ...(dev ? [] : ['preview']), '--port', String(port), '--strictPort', '--host', '127.0.0.1'];
  const child = spawn(process.execPath, args, { cwd: siteRoot });
  let out = '';
  let exited = false;
  child.stdout.on('data', (d) => (out += d));
  child.stderr.on('data', (d) => (out += d));
  child.on('exit', () => (exited = true));
  const origin = `http://127.0.0.1:${port}`;
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    if (exited) throw new SetupError('توقف خادم Vite قبل أن يجهز. المخرجات:\n' + out.split('\n').slice(-20).join('\n'));
    try {
      const r = await fetch(origin + '/');
      if (r.status < 500) {
        return {
          url: origin,
          origin,
          close: () =>
            new Promise((r2) => {
              if (exited) return r2();
              child.on('exit', r2);
              child.kill();
            }),
        };
      }
    } catch {
      /* لم يجهز بعد */
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  child.kill();
  throw new SetupError('انتهت مهلة انتظار خادم Vite (30 ثانية).');
}
