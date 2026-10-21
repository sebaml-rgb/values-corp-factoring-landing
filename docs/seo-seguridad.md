# Revisión SEO y seguridad — Values Corp Factoring

Última revisión: 2026-10-21.

## Resumen ejecutivo

| Área | Estado | Notas |
|------|--------|--------|
| HTTPS / HSTS | OK en Vercel | `Strict-Transport-Security` 2 años + preload |
| Cabeceras baseline | OK | `nosniff`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy` |
| CSP | Aceptable con matices | `unsafe-eval` por React/Design Components; imágenes Blob permitidas |
| Formulario contacto | OK | Honeypot, validación email, API solo POST |
| CMS | Requiere hardening ops | Sesión por cookie; usar contraseña fuerte + WAF en producción |
| SEO técnico home | Fuerte | canonical, OG, JSON-LD `FinancialService` |
| SEO subpáginas | Mejorado | OG/Twitter en equipo y soluciones; legal ya completo |
| robots / sitemap | OK | `Disallow: /admin`, `/api/`; sitemap en holding |
| Preview Vercel | OK | `noindex` en `*.vercel.app` |

## SEO — checklist buscadores

### Hecho en el repo

- `lang="es-CL"` en páginas públicas.
- `<title>` y `meta description` por URL.
- `link rel="canonical"` apuntando a `https://valuescorp.cl/...` (path del holding).
- Open Graph + Twitter Card en home, legal, equipo y soluciones.
- JSON-LD en home (`FinancialService`); subpáginas con `WebPage`.
- `robots.txt` + `sitemap.xml` (URLs del holding).
- Skip link en home (`#main`).
- Un H1 principal por página de marketing.

### Recomendaciones operativas (fuera del código)

1. **Search Console / Bing Webmaster**: verificar propiedad `valuescorp.cl` y enviar sitemap.
2. **Canonical vs deploy**: si este repo vive en un subdominio propio, alinear canonical/sitemap con la URL pública real (evitar duplicar `/` y `/factoring` sin redirect 301 en el dominio que indexa Google).
3. **Core Web Vitals**: medir en producción (LCP del hero video/imagen); considerar `poster` y `preload` del LCP en iteración futura.
4. **Imagen OG**: mantener 1200×630, &lt;300 KB, texto legible en preview social.

## Seguridad — firewall y scanners

### Cabeceras (Vercel `vercel.json`)

Cumplen buena parte de lo que exigen Mozilla Observatory, securityheaders.com y políticas corporativas habituales:

- Mitigación clickjacking (`frame-ancestors` + `X-Frame-Options`).
- MIME sniffing (`nosniff`).
- HSTS en producción HTTPS.
- CSP restrictiva same-origin por defecto.

**Limitaciones conocidas (documentadas, no bugs):**

- `script-src 'unsafe-eval'`: necesario para el runtime React embebido en HTML. Alternativa a largo plazo: build con hashes/nonces.
- `style-src 'unsafe-inline'`: estilos en página; endurecer implicaría refactor a CSS externo.
- **Admin**: no debe indexarse; `noindex` en HTML + `X-Robots-Tag` + `robots.txt`.

### CMS y API

| Riesgo | Mitigación actual | Acción recomendada |
|--------|-------------------|-------------------|
| Fuerza bruta login | Ninguna en app | Regla WAF Vercel (rate limit `/api/cms/login`) |
| Contraseña débil | Env `CMS_PASSWORD` | 20+ caracteres en producción; rotación |
| Upload malicioso | MIME allowlist, tamaño 4 MB, sesión | OK |
| Exfiltración JSON | Cookie HttpOnly, SameSite=Lax | OK |
| `/admin` público | Auth + noindex | Opcional: Deployment Protection o IP allowlist |

### Formulario `/api/contact`

- Sin secretos en cliente; Resend solo server-side.
- Honeypot anti-bot básico.
- No sustituye CAPTCHA si hay spam elevado (Turnstile/hCaptcha).

### Checklist pre-lanzamiento

- [ ] `CMS_PASSWORD` fuerte en Vercel Production (no `1234`).
- [ ] `CMS_SESSION_SECRET` distinto de la contraseña.
- [ ] Regla firewall: rate limit POST `/api/cms/login` y opcionalmente `/api/contact`.
- [ ] Confirmar redirects 301 `/factoring` → URL canónica que indexa el holding.
- [ ] Probar [securityheaders.com](https://securityheaders.com) y [observatory.mozilla.org](https://observatory.mozilla.org) contra la URL de producción.
