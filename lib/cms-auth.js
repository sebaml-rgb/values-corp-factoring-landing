import crypto from 'node:crypto';

const COOKIE = 'cms_session';
const MAX_AGE_SEC = 60 * 60 * 12;

function secret() {
  return process.env.CMS_SESSION_SECRET || process.env.CMS_PASSWORD || '';
}

export function verifyPassword(input) {
  const expected = process.env.CMS_PASSWORD || '';
  if (!expected || typeof input !== 'string') return false;
  const a = Buffer.from(input);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function sign(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', secret()).update(body).digest('base64url');
  return `${body}.${sig}`;
}

function unsign(token) {
  if (!token || !secret()) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expected = crypto.createHmac('sha256', secret()).update(body).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    return JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

export function sessionCookie(token) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE_SEC}${secure}`;
}

export function clearSessionCookie() {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

export function createSession() {
  return sign({ exp: Date.now() + MAX_AGE_SEC * 1000 });
}

export function readSession(req) {
  const raw = req.headers.cookie || '';
  const match = raw.match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
  const payload = unsign(match?.[1]);
  if (!payload?.exp || payload.exp < Date.now()) return null;
  return payload;
}

export function requireSession(req, res) {
  if (!secret()) {
    res.status(503).json({ ok: false, error: 'config', message: 'CMS_PASSWORD no configurada' });
    return false;
  }
  if (!readSession(req)) {
    res.status(401).json({ ok: false, error: 'auth' });
    return false;
  }
  return true;
}
