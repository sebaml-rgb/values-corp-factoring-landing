import {
  verifyPassword,
  createSession,
  sessionCookie,
  clearSessionCookie,
} from '../../lib/cms-auth.js';

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 15;
const loginAttempts = new Map();

function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.trim()) return fwd.split(',')[0].trim();
  return req.headers['x-real-ip'] || 'unknown';
}

function loginRateLimited(ip) {
  const now = Date.now();
  let rec = loginAttempts.get(ip);
  if (!rec || now - rec.start > LOGIN_WINDOW_MS) {
    rec = { start: now, count: 0 };
  }
  rec.count += 1;
  loginAttempts.set(ip, rec);
  return rec.count > LOGIN_MAX_ATTEMPTS;
}

export default async function handler(req, res) {
  if (req.method === 'DELETE') {
    res.setHeader('Set-Cookie', clearSessionCookie());
    return res.status(200).json({ ok: true });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, DELETE');
    return res.status(405).json({ ok: false });
  }

  let body = req.body || {};
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }

  const ip = clientIp(req);
  if (loginRateLimited(ip)) {
    return res.status(429).json({ ok: false, error: 'rate' });
  }

  if (!verifyPassword(body.password)) {
    return res.status(401).json({ ok: false, error: 'auth' });
  }

  loginAttempts.delete(ip);

  res.setHeader('Set-Cookie', sessionCookie(createSession()));
  return res.status(200).json({ ok: true });
}
