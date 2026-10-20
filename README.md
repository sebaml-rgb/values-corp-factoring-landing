# Values Corp · Factoring Solutions

Landing estática (Design Components + React en `/vendor`) para **Values Corp Factoring Solutions**: home, equipo, soluciones, formulario de contacto y páginas legales.

Extraída del monorepo [Values-corp-holding](https://github.com/sebaml-rgb/Values-corp-holding) para desplegar y versionar por separado.

## Desarrollo local

```bash
npx serve -l 3456 -c serve.json
```

- Home: http://localhost:3456/
- Equipo: http://localhost:3456/equipo
- Soluciones: http://localhost:3456/soluciones

## Deploy (Vercel)

1. Importa este repositorio en Vercel (framework: **Other**, output: raíz del repo).
2. Variables de entorno (Production):
   - `RESEND_API_KEY` — obligatoria
   - `CONTACT_TO` — recomendado `contacto.factoring@valuescorp.cl`
   - `CONTACT_FROM` — remitente verificado en Resend
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
