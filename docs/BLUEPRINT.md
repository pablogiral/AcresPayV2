# AcresPay v2 Blueprint (Next.js + Auth.js + Drizzle + Neon)

## 1) Objetivo
Construir una app web full-stack para dividir cuentas en español con autenticación social, gestión de amigos, tickets, cálculo de liquidaciones, seguimiento de pagos y combinación de múltiples tickets, optimizada para despliegue en Vercel con PostgreSQL gratuito.

## 2) Stack elegido
- Frontend/Backend: Next.js 15 (App Router, Route Handlers)
- Lenguaje: TypeScript
- Auth: Auth.js (Google, GitHub, Credentials)
- ORM: Drizzle ORM + drizzle-zod
- Base de datos: Neon PostgreSQL (free tier)
- Estado cliente: TanStack Query v5
- UI: Tailwind CSS + componentes propios accesibles (sin lock-in)
- Validación: Zod
- Observabilidad: logs estructurados + Sentry (opcional fase 2)
- Deploy: Vercel

## 3) Principios de arquitectura
- Money-safe: todos los importes en centavos (`integer`).
- Control de acceso explícito por recurso.
- API REST tipada con validación Zod en entrada/salida.
- Cálculos de liquidación en funciones puras reutilizables y testeables.
- UI mobile-first, limpia y consistente.

## 4) Modelo de datos (Drizzle)
Tablas principales:
- `users`: perfil de usuario.
- `accounts`, `sessions`, `verification_tokens`: tablas de Auth.js.
- `friends`: amigos guardados por usuario (color único por usuario).
- `bills`: ticket principal (dueño, nombre, fecha, payer, total centavos).
- `participants`: participantes dentro de un bill (snapshot de amigo opcional).
- `line_items`: consumos (cantidad, precio unitario en centavos, total en centavos, compartido).
- `claims`: asignaciones por participante/item.
- `payments`: transferencias calculadas y estado de pago.
- `bill_access` (fase 2 opcional): compartir tickets entre usuarios.

Constraints/índices clave:
- Unique `friends(user_id, color)`.
- Index `friends(user_id)`, `bills(user_id)`, `participants(bill_id)`, `line_items(bill_id)`.
- Unique claim: `claims(line_item_id, participant_id)`.
- Unique payment tuple: `payments(bill_id, from_participant_id, to_participant_id)`.
- Optional link `participants(friend_id)` para matching robusto al combinar tickets.

## 5) Autenticación y autorización
### Proveedores
- Google (MVP obligatorio)
- GitHub (MVP)
- Credentials (email/password con `bcrypt`)

### Reglas
- Solo autenticados acceden al dominio app.
- Dueño de ticket: editar estructura (`participants`, `line_items`, `payer`, nombre).
- Cualquier usuario autenticado con acceso al ticket: marcar pagos como completados.
- Endpoints validan sesión + ownership/access por `bill_id`.

## 6) API (Route Handlers)
Todas bajo `/api/*` y JSON.

Auth:
- `GET/POST /api/auth/[...nextauth]`
- `GET /api/me`

Friends:
- `GET /api/friends`
- `POST /api/friends`
- `PATCH /api/friends/:id`
- `DELETE /api/friends/:id` (validación pagos pendientes)

Bills:
- `GET /api/my-bills`
- `POST /api/bills`
- `GET /api/bills/:id`
- `PATCH /api/bills/:id`

Participants:
- `POST /api/bills/:billId/participants`
- `DELETE /api/participants/:id`

Line items + claims:
- `POST /api/bills/:billId/items`
- `PATCH /api/items/:id/shared`
- `PUT /api/items/:itemId/claims/:participantId`
- `DELETE /api/items/:itemId/claims/:participantId`

Payments:
- `GET /api/bills/:billId/payments`
- `PUT /api/bills/:billId/payments`

Combinación:
- `POST /api/combined-settlement` (body: `billIds[]`)

## 7) Algoritmos de liquidación
Se implementan en `src/lib/settlement.ts`:
- `calculateBillSettlement(bill)`
- `calculateCombinedSettlement(bills)`

Características:
- balance por participante en centavos.
- matching greedy de deudores/acreedores para minimizar número de transferencias.
- matching cross-ticket por prioridad:
  1. `friend_id` si existe.
  2. nombre normalizado + color.

## 8) UX y producto
Rutas UI:
- `/` landing si no autenticado; menú principal si autenticado.
- `/friends`
- `/my-bills`
- `/bill/new`
- `/bill/[billId]`
- `/settlement/[billId]`
- `/combine-tickets`
- `/combined-settlement?bills=id1,id2`

Lineamientos:
- Español completo en UI.
- Diseño moderno y limpio, mobile-first.
- Inputs de texto críticos con estado local + sync `onBlur`.
- Claims inline (sin modal).
- Feedback claro (estados vacíos, loading, errores).

## 9) Rendimiento y fiabilidad
- React Query con invalidaciones por recurso.
- Revalidación/SSR ligera donde aporte.
- Consultas SQL indexadas para validaciones de borrado.
- Sin sobreoptimización temprana (escala baja esperada).

## 10) Seguridad
- Cookies de sesión seguras en producción.
- CSRF/callback controls de Auth.js por defecto.
- Validación de inputs con Zod.
- Rate limit básico (fase 2) para Credentials login.

## 11) Entornos
Variables:
- `DATABASE_URL`
- `AUTH_SECRET`
- `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`
- `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`
- `NEXTAUTH_URL` (si aplica según entorno)

## 12) Fases de implementación
Fase 1 (ahora):
- Bootstrap proyecto, schema, auth, API core, UI base y flujo principal.

Fase 2:
- Compartición multiusuario de tickets (`bill_access`), email magic link, Sentry, tests ampliados.

Fase 3:
- PWA/offline parcial, exportaciones, mejoras avanzadas de reporting.

## 13) Definition of Done (MVP)
- Login Google/GitHub/Email funcional.
- CRUD amigos con colores únicos y validación de borrado.
- Crear y editar ticket con participantes, items y claims.
- Cálculo de settlement y seguimiento de pagos persistente.
- Combinar tickets con matching robusto y settlement optimizado.
- Deployable en Vercel con Neon y documentación clara.
