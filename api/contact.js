// Receives the contact forms of the three landings and emails them via Resend.
// El navegador solo habla con este endpoint (same-origin); el envío a Resend ocurre en servidor.
// Env vars (Vercel → Settings → Environment Variables):



const PAGES = { home: 'Values Corp', wealth: 'A&G Wealth Solutions', factoring: 'Factoring Solutions' };
const LABELS = {
  nombre: 'Nombre', empresa: 'Empresa', email: 'Email', interes: 'Me interesa',
  perfil: 'Perfil', facturacion: 'Facturación mensual', mensaje: 'Mensaje',
};
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false });
  }

  let body = req.body || {};
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }

  // Honeypot: bots fill the hidden "website" field; pretend success.
  if (body.website) return res.status(200).json({ ok: true });

  const clean = (v, max) => String(v ?? '').trim().slice(0, max);
  const fields = {};
  for (const key of Object.keys(LABELS)) {
    const value = clean(body[key], key === 'mensaje' ? 4000 : 200);
    if (value) fields[key] = value;
  }
  const page = PAGES[body.page] ? body.page : 'home';

  if (!fields.email || !EMAIL_RE.test(fields.email)) {
    return res.status(400).json({ ok: false, error: 'email' });
  }
  if (!process.env.RESEND_API_KEY) {
    console.error('contact: RESEND_API_KEY is not set');
    return res.status(500).json({ ok: false, error: 'config' });
  }

  const text = [
    `Nuevo contacto desde el sitio (${PAGES[page]})`,
    '',
    ...Object.entries(fields).map(([k, v]) => `${LABELS[k]}: ${v}`),
  ].join('\n');

  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.CONTACT_FROM || 'Values Corp Web <onboarding@resend.dev>',
      to: [process.env.CONTACT_TO || 'contacto@valuescorp.cl'],
      reply_to: fields.email,
      subject: `Contacto web · ${PAGES[page]} · ${fields.nombre || fields.empresa || fields.email}`,
      text,
    }),
  });

  if (!r.ok) {
    console.error('contact: Resend error', r.status, await r.text());
    return res.status(502).json({ ok: false, error: 'send' });
  }
  return res.status(200).json({ ok: true });
};
