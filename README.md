# Values Corp · Factoring Solutions

Repositorio: [values-corp-factoring-landing](https://github.com/sebaml-rgb/values-corp-factoring-landing).

Landing estática (Design Components + React en `/vendor`) para **Values Corp Factoring Solutions**: home, equipo, soluciones, formulario de contacto y páginas legales.

Extraída del monorepo [Values-corp-holding](https://github.com/sebaml-rgb/Values-corp-holding) para desplegar y versionar por separado.

## Desarrollo local

```bash
npm install
npm run cms:apply   # aplica cms/content.json al HTML
npx serve -l 3456 -c serve.json   # solo HTML; /admin no guarda
```

**Panel CMS (login + guardar):**

```bash
# .env en la raíz: CMS_PASSWORD=1234
npm run dev:cms
```

Abre http://localhost:3000/admin (contraseña = `CMS_PASSWORD`).

O build + preview de producción:

```bash
npm run start     # build → dist + serve en :3456
```

- Home: http://localhost:3456/
- Equipo: http://localhost:3456/equipo
- Soluciones: http://localhost:3456/soluciones
- CMS: http://localhost:3000/admin (`npm run dev:cms` + `CMS_PASSWORD` en `.env`)

## CMS (contenidos)

El sitio usa **`cms/content.json`** como fuente de verdad. En el HTML, los campos editables llevan `data-cms="…"`, listas `data-cms-list` y bloques legales `data-cms-block`.

| Pieza | Ruta |
|-------|------|
| Panel | `/admin` |
| API | `POST /api/cms/login`, `GET/PUT /api/cms/content` |
| Aplicar al HTML | `npm run cms:apply` (local) o `npm run build` (Vercel → `dist/`) |

Variables en `.env` / Vercel (ver `.env.example`):

- **`CMS_PASSWORD`** — acceso al panel (obligatoria para usar el CMS).
- **`CMS_SESSION_SECRET`** — firma de cookie (opcional; si no, usa `CMS_PASSWORD`).
- **`BLOB_READ_WRITE_TOKEN`** — en producción, guarda el JSON en Vercel Blob y dispara redeploy con **`VERCEL_DEPLOY_HOOK_URL`**.

Tras editar en local, conviene commit de `cms/content.json` y del HTML actualizado (el guardado del panel ejecuta `cms:apply` cuando corre en `vercel dev`).

**Panel ampliado:** Home (pilares, pasos timeline + texto modal/simulador), Soluciones (catálogo), **Proceso** (modal detallado, onboarding, requisitos e iconos), **Legal** (secciones de privacidad y términos), Equipo (fotos vía `POST /api/cms/upload`). En local los archivos van a `assets/equipo|onboarding|requisitos/`; en producción, a Vercel Blob si hay token.

Revisión SEO y cabeceras de seguridad: [docs/seo-seguridad.md](docs/seo-seguridad.md).

## Deploy (Vercel)

1. Importa este repositorio en Vercel (framework: **Other**, output: raíz del repo).
2. Variables de entorno (Production):
   - `RESEND_API_KEY` — obligatoria
   - `CONTACT_TO` — recomendado `contacto.factoring@valuescorp.cl`
   - `CONTACT_FROM` — remitente verificado en Resend
   - `CMS_PASSWORD` — panel `/admin`
   - `BLOB_READ_WRITE_TOKEN` + `VERCEL_DEPLOY_HOOK_URL` — opcional, publicar contenido sin push a git
3. Conecta el dominio (p. ej. subdominio dedicado o el path `/factoring` vía proxy del holding).

## Rutas

| URL pública (holding) | Archivo |
|----------------------|---------|
| `/` o `/factoring` | `factoring.html` |
| `/equipo` o `/factoring/equipo` | `factoring-equipo.html` |
| `/soluciones` o `/factoring/soluciones` | `factoring-soluciones.html` |

Los enlaces internos siguen usando `/factoring…` para compatibilidad con **valuescorp.cl**; en un dominio propio, `vercel.json` sirve la home en `/`.

## Sincronizar desde el holding

Cuando actualices Factoring en el repo principal:

```bash
HOLDING="../Values-corp-holding"
DEST="."
cp "$HOLDING/factoring.html" "$HOLDING/factoring-equipo.html" "$HOLDING/factoring-soluciones.html" "$DEST/"
cp "$HOLDING/support.js" "$DEST/"
cp -R "$HOLDING/vendor/"* "$DEST/vendor/"
# Copiar assets referenciados (onboarding, requisitos, equipo, etc.) según cambios.
```

## API

`POST /api/contact` — mismo contrato que el holding (`page: 'factoring'` en el JSON del formulario).
