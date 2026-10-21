import fs from 'node:fs/promises';
import path from 'node:path';
import { head, put } from '@vercel/blob';

const CONTENT_FILE = path.join(process.cwd(), 'cms', 'content.json');
const BLOB_PATH = process.env.CMS_BLOB_PATH || 'cms/site-content.json';

export async function loadContent() {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const meta = await head(BLOB_PATH, { token: process.env.BLOB_READ_WRITE_TOKEN });
      if (meta?.url) {
        const res = await fetch(meta.url);
        if (res.ok) return JSON.parse(await res.text());
      }
    } catch (err) {
      if (err?.message?.includes('not found') || err?.statusCode === 404) {
        /* fall through to file */
      } else {
        console.warn('cms-store: blob read failed, using file', err?.message || err);
      }
    }
  }
  const raw = await fs.readFile(CONTENT_FILE, 'utf8');
  return JSON.parse(raw);
}

export async function saveContent(data) {
  const json = JSON.stringify(data, null, 2);

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    await put(BLOB_PATH, json, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
      contentType: 'application/json',
      addRandomSuffix: false,
    });
  }

  const canWriteFile =
    !process.env.VERCEL ||
    process.env.VERCEL_ENV === 'development' ||
    process.env.CMS_WRITE_FILE === '1';

  if (canWriteFile) {
    await fs.writeFile(CONTENT_FILE, `${json}\n`, 'utf8');
  }

  return { blob: Boolean(process.env.BLOB_READ_WRITE_TOKEN), file: canWriteFile };
}
