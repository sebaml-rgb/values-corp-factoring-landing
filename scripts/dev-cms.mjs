/**
 * Servidor local: sitio estático + API del CMS (sin `vercel dev`).
 * Carga `.env` desde la raíz del repo.
 */
import fs from 'node:fs';
import http from 'node:http';
import fsPromises from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const PORT = Number(process.env.PORT) || 3000;

const REWRITES = [
  { source: '/', destination: '/factoring.html' },
  { source: '/equipo', destination: '/factoring-equipo.html' },
  { source: '/factoring/equipo', destination: '/factoring-equipo.html' },
  { source: '/soluciones', destination: '/factoring-soluciones.html' },
  { source: '/factoring/soluciones', destination: '/factoring-soluciones.html' },
  { source: '/privacidad', destination: '/privacidad.html' },
  { source: '/terminos', destination: '/terminos.html' },
  { source: '/admin', destination: '/admin/index.html' },
];

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.mp4': 'video/mp4',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
};

function loadEnvFile() {
  const envPath = path.join(ROOT, '.env');
  if (!fs.existsSync(envPath)) return;
  const raw = fs.readFileSync(envPath, 'utf8');
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

loadEnvFile();

function rewritePath(urlPath) {
  const clean = urlPath.split('?')[0].replace(/\/+$/, '') || '/';
  for (const { source, destination } of REWRITES) {
    const src = source.replace(/\/+$/, '') || '/';
    if (clean === src) return destination;
  }
  return urlPath.split('?')[0];
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return undefined;
  const raw = Buffer.concat(chunks).toString('utf8');
  const ct = req.headers['content-type'] || '';
  if (ct.includes('application/json')) {
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }
  return raw;
}

function createResAdapter(res) {
  let statusCode = 200;
  const adapter = {
    status(code) {
      statusCode = code;
      return adapter;
    },
    setHeader(name, value) {
      res.setHeader(name, value);
      return adapter;
    },
    json(data) {
      if (!res.headersSent) {
        res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
      }
      res.end(JSON.stringify(data));
    },
    end(data) {
      if (!res.headersSent) res.writeHead(statusCode);
      res.end(data);
    },
  };
  return adapter;
}

const apiRoutes = {
  '/api/cms/login': '../api/cms/login.js',
  '/api/cms/content': '../api/cms/content.js',
  '/api/cms/upload': '../api/cms/upload.js',
};

async function handleApi(pathname, req, res) {
  const rel = apiRoutes[pathname];
  if (!rel) return false;
  const mod = await import(pathToFileURL(path.join(ROOT, 'scripts', rel)).href);
  const handler = mod.default;
  const body = await readBody(req);
  const vercelReq = {
    method: req.method,
    headers: req.headers,
    body,
  };
  await handler(vercelReq, createResAdapter(res));
  return true;
}

async function serveStatic(pathname, res) {
  let rel = rewritePath(pathname);
  if (!rel.startsWith('/')) rel = `/${rel}`;
  const filePath = path.join(ROOT, rel.replace(/^\//, ''));
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  let stat;
  try {
    stat = await fsPromises.stat(resolved);
  } catch {
    res.writeHead(404);
    res.end('Not found');
    return;
  }
  if (stat.isDirectory()) {
    const index = path.join(resolved, 'index.html');
    try {
      await fsPromises.access(index);
      return serveStatic(path.join(rel, '/index.html'), res);
    } catch {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
  }
  const ext = path.extname(resolved).toLowerCase();
  const data = await fsPromises.readFile(resolved);
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
  res.end(data);
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://127.0.0.1:${PORT}`);
    const pathname = url.pathname;

    if (await handleApi(pathname, req, res)) return;
    await serveStatic(pathname, res);
  } catch (err) {
    console.error(err);
    if (!res.headersSent) {
      res.writeHead(500);
      res.end('Internal error');
    }
  }
});

server.listen(PORT, () => {
  const pwd = process.env.CMS_PASSWORD ? 'sí' : 'NO — crea .env con CMS_PASSWORD=1234';
  console.log(`CMS local → http://localhost:${PORT}/admin`);
  console.log(`Sitio      → http://localhost:${PORT}/`);
  console.log(`CMS_PASSWORD cargada: ${pwd}`);
});
