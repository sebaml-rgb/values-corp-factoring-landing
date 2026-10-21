import fs from 'node:fs/promises';
import path from 'node:path';
import { put } from '@vercel/blob';
import { requireSession } from '../../lib/cms-auth.js';

const MAX_BYTES = 4 * 1024 * 1024;
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp']);

function safeBase(name) {
  return String(name || 'foto')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'foto';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false });
  }
  if (!requireSession(req, res)) return;

  let body = req.body || {};
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ ok: false, error: 'json' });
    }
  }

  const { dataBase64, contentType, filename, scope } = body;
  if (!dataBase64 || typeof dataBase64 !== 'string') {
    return res.status(400).json({ ok: false, error: 'data' });
  }
  const mime = contentType || 'image/jpeg';
  if (!ALLOWED.has(mime)) {
    return res.status(400).json({ ok: false, error: 'type' });
  }

  const buf = Buffer.from(dataBase64, 'base64');
  if (buf.length > MAX_BYTES) {
    return res.status(413).json({ ok: false, error: 'size' });
  }

  const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
  const base = safeBase(filename);
  const stamp = Date.now();
  const fileName = `${base}-${stamp}.${ext}`;

  const canWriteLocal =
    !process.env.VERCEL ||
    process.env.VERCEL_ENV === 'development' ||
    process.env.CMS_WRITE_FILE === '1';

  const assetDirs = { equipo: 'equipo', onboarding: 'onboarding', requisitos: 'requisitos' };
  const sub = assetDirs[scope] || 'equipo';

  if (canWriteLocal && assetDirs[scope]) {
    const dir = path.join(process.cwd(), 'assets', sub);
    await fs.mkdir(dir, { recursive: true });
    const abs = path.join(dir, fileName);
    await fs.writeFile(abs, buf);
    const publicPath = `/assets/${sub}/${fileName}`;
    return res.status(200).json({
      ok: true,
      url: publicPath,
      photo: { jpg: publicPath, webp: publicPath },
    });
  }

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`cms/${sub}/${fileName}`, buf, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
      contentType: mime,
      addRandomSuffix: false,
    });
    const url = blob.url;
    return res.status(200).json({
      ok: true,
      url,
      photo: { jpg: url, webp: url },
    });
  }

  return res.status(503).json({
    ok: false,
    error: 'storage',
    message: 'Configura CMS_WRITE_FILE en local o BLOB_READ_WRITE_TOKEN en producción.',
  });
}
