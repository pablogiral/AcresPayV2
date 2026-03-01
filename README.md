# AcresPay v2

Aplicación web full-stack para dividir cuentas en español.

## Stack
- Next.js (App Router) + TypeScript
- Auth.js (Google, GitHub, Credentials)
- Drizzle ORM + PostgreSQL (Neon)
- Tailwind CSS

## Funcionalidad incluida en esta base
- Autenticación social y registro por email/password.
- CRUD de amigos con color único por usuario.
- Creación y edición de tickets.
- Participantes, line items y claims (individual/compartido).
- Cálculo de liquidación y seguimiento de pagos.
- Combinación de tickets con matching por `friendId` o `nombre+color`.

## Configuración local
1. Instala dependencias:
```bash
npm install
```

2. Copia variables:
```bash
cp .env.example .env.local
```

3. Completa `.env.local`:
- `DATABASE_URL`
- `AUTH_SECRET`
- `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`
- `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`
- `NEXTAUTH_URL` (ej. `http://localhost:3000`)

4. Genera y aplica migraciones:
```bash
npm run db:generate
npm run db:migrate
```

5. Arranca la app:
```bash
npm run dev
```

## Deploy en Vercel
1. Crea DB PostgreSQL en Neon (free tier).
2. En Vercel, conecta repositorio y define las mismas variables de entorno.
3. En Google OAuth y GitHub OAuth añade:
- URL app producción (`https://tu-dominio.vercel.app`)
- Callback Auth.js: `https://tu-dominio.vercel.app/api/auth/callback/google` y `/github`
4. Despliega.

## Notas
- Importes monetarios en centavos (`integer`) para evitar errores de redondeo.
- El nombre del ticket se actualiza en `onBlur` para evitar llamadas por cada tecla.
- Esta base está preparada para evolución a compartir tickets entre usuarios (tabla `bill_access` en fase siguiente).
