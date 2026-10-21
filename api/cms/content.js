import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { requireSession } from '../../lib/cms-auth.js';
import { loadContent, saveContent } from '../../lib/cms-store.js';

function runApplyCms(cwd) {
  const r = spawnSync(process.execPath, ['scripts/apply-cms.mjs'], {
    cwd,
    stdio: 'pipe',
    encoding: 'utf8',
  });
  return r.status === 0 ? null : r.stderr || r.stdout || 'apply-cms failed';
}

async function maybeRedeploy() {
  const hook = process.env.VERCEL_DEPLOY_HOOK_URL;
  if (!hook) return null;
  try {
    const r = await fetch(hook, { method: 'POST' });
    return r.ok;
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    if (!requireSession(req, res)) return;
    try {
      const content = await loadContent();
      return res.status(200).json({ ok: true, content });
    } catch (err) {
      console.error('cms content GET', err);
      return res.status(500).json({ ok: false, error: 'read' });
    }
  }

  if (req.method === 'PUT') {
    if (!requireSession(req, res)) return;

    let body = req.body || {};
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        return res.status(400).json({ ok: false, error: 'json' });
      }
    }

    if (!body.content || typeof body.content !== 'object') {
      return res.status(400).json({ ok: false, error: 'content' });
    }

    try {
      const saved = await saveContent(body.content);
      let applyError = null;
      if (saved.file) {
        applyError = runApplyCms(process.cwd());
      }
      const redeploy = saved.blob ? await maybeRedeploy() : null;
      return res.status(200).json({
        ok: true,
        saved,
        applyError,
        redeploy,
        hint: saved.file
          ? 'HTML actualizado en el repo. Ejecuta commit y push, o npm run build para dist.'
          : 'Contenido guardado en Blob. El próximo deploy aplicará los cambios.',
      });
    } catch (err) {
      console.error('cms content PUT', err);
      return res.status(500).json({ ok: false, error: 'write' });
    }
  }

  res.setHeader('Allow', 'GET, PUT');
  return res.status(405).json({ ok: false });
}
