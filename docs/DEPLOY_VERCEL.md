# Despliegue Paso A Paso (Neon + Vercel + OAuth)

Esta guía está escrita para hacer el primer despliegue sin asumir experiencia previa.

## Qué vas a conseguir al final

Al terminar tendrás:
- La app publicada en una URL de Vercel.
- Una base de datos PostgreSQL en Neon.
- Login con Google y GitHub funcionando.
- Las tablas creadas en producción mediante Drizzle.

## Antes de empezar

Necesitas tener:
- Una cuenta en GitHub.
- Una cuenta en Vercel.
- Una cuenta en Neon.
- Una cuenta de Google para crear credenciales OAuth.
- Una cuenta de GitHub con acceso a GitHub Developer Settings.

Este repositorio ya está preparado para Vercel:
- El proyecto compila con `npm run build`.
- Las migraciones iniciales ya están versionadas en `drizzle/`.
- `vercel.json` fija los comandos de instalación y build.

## Paso 1: Crear la base de datos en Neon

1. Entra en [Neon](https://neon.tech) y crea una cuenta si no la tienes.
2. Pulsa `Create project`.
3. Pon un nombre reconocible, por ejemplo `AcresPayV2`.
4. Elige una región cercana a tus usuarios.
5. Espera a que Neon cree el proyecto.
6. Cuando aparezca el panel del proyecto, busca la cadena de conexión (`Connection string`).
7. Copia la URL completa tipo PostgreSQL.

Debe tener esta forma aproximada:

```text
postgresql://usuario:password@host/neondb?sslmode=require
```

Guárdala temporalmente porque la vas a usar como `DATABASE_URL`.

## Paso 2: Crear el proyecto en Vercel

1. Entra en [Vercel](https://vercel.com).
2. Pulsa `Add New...`.
3. Elige `Project`.
4. Autoriza a Vercel a leer tu GitHub si te lo pide.
5. Busca el repositorio `pablogiral/AcresPayV2`.
6. Pulsa `Import`.

Cuando Vercel detecte el proyecto:
- Framework: debería detectar `Next.js`.
- Root Directory: deja la raíz del repositorio.
- Build and Output Settings: puedes dejarlo por defecto.

Este repo ya tiene un [vercel.json](../vercel.json) con:
- `npm install`
- `npm run build`

Así no dependes solo de la autodetección.

## Paso 3: Definir variables de entorno en Vercel

Antes de desplegar, en la pantalla del proyecto o en `Settings > Environment Variables`, añade estas variables:

### `DATABASE_URL`

Pega aquí la URL que copiaste de Neon.

### `AUTH_SECRET`

Es una clave larga y aleatoria usada por Auth.js para firmar sesiones.

Si quieres generar una localmente, puedes usar:

```bash
openssl rand -base64 32
```

Copia el resultado completo y pégalo como valor de `AUTH_SECRET`.

### `AUTH_GOOGLE_ID`

Todavía no lo tendrás hasta crear la app OAuth de Google. De momento puedes dejar esta pantalla abierta y volver luego.

### `AUTH_GOOGLE_SECRET`

Igual que el anterior: lo obtendrás al crear el cliente OAuth en Google.

### `AUTH_GITHUB_ID`

Lo obtendrás al crear la app OAuth en GitHub.

### `AUTH_GITHUB_SECRET`

Lo obtendrás al crear la app OAuth en GitHub.

### `NEXTAUTH_URL`

Esto debe ser la URL pública final del proyecto en Vercel.

Ejemplo:

```text
https://acrespay-v2.vercel.app
```

Importante:
- No pongas `/` al final.
- No pongas una URL local como `http://localhost:3000`.

## Paso 4: Hacer el primer despliegue para obtener tu URL pública

1. Si ya tienes las variables mínimas `DATABASE_URL`, `AUTH_SECRET` y `NEXTAUTH_URL`, puedes lanzar un primer deploy.
2. Pulsa `Deploy`.
3. Espera a que termine.

Qué puede pasar:
- Si el build falla por variables faltantes, vuelve a `Settings > Environment Variables`, complétalas y redepliega.
- Si el build pasa, Vercel te dará una URL pública.

Esa URL es la que debes usar en los pasos de OAuth.

## Paso 5: Configurar Google OAuth

### 5.1 Entrar al panel correcto

1. Entra en [Google Cloud Console](https://console.cloud.google.com).
2. Crea un proyecto nuevo o usa uno existente.
3. En el menú, busca `APIs & Services`.

### 5.2 Configurar pantalla de consentimiento

1. Entra en `OAuth consent screen`.
2. Elige `External` si la app es para uso normal.
3. Completa lo mínimo:
- Nombre de la app
- Email de soporte
- Email del desarrollador
4. Guarda.

Si Google te muestra el modo `Testing`, está bien para empezar.

### 5.3 Crear credenciales OAuth

1. Ve a `Credentials`.
2. Pulsa `Create Credentials`.
3. Elige `OAuth client ID`.
4. Tipo de aplicación: `Web application`.
5. Pon un nombre, por ejemplo `AcresPay Vercel`.

### 5.4 Añadir orígenes y callback

En `Authorized JavaScript origins` añade:

```text
https://tu-dominio.vercel.app
```

En `Authorized redirect URIs` añade:

```text
https://tu-dominio.vercel.app/api/auth/callback/google
```

Sustituye `tu-dominio.vercel.app` por tu URL real de Vercel.

### 5.5 Copiar valores a Vercel

Google te dará:
- Client ID
- Client Secret

En Vercel:
- `AUTH_GOOGLE_ID` = Client ID
- `AUTH_GOOGLE_SECRET` = Client Secret

Guarda los cambios.

## Paso 6: Configurar GitHub OAuth

### 6.1 Entrar al panel correcto

1. Entra en GitHub.
2. Ve a `Settings`.
3. Baja hasta `Developer settings`.
4. Entra en `OAuth Apps`.
5. Pulsa `New OAuth App`.

### 6.2 Completar datos

Rellena:
- `Application name`: por ejemplo `AcresPay Vercel`
- `Homepage URL`: `https://tu-dominio.vercel.app`
- `Authorization callback URL`: `https://tu-dominio.vercel.app/api/auth/callback/github`

### 6.3 Crear credenciales

1. Guarda la app.
2. GitHub te mostrará un `Client ID`.
3. Pulsa para generar un `Client Secret`.

### 6.4 Copiar valores a Vercel

En Vercel:
- `AUTH_GITHUB_ID` = Client ID
- `AUTH_GITHUB_SECRET` = Client Secret

Guarda los cambios.

## Paso 7: Ejecutar la migración de base de datos en producción

Este paso es obligatorio.

Aunque Vercel despliegue la app, la base de datos no se crea sola. Sin migración, el login y las rutas que leen la base van a fallar.

Tienes dos formas sencillas de hacerlo:

### Opción A: Ejecutarla en tu ordenador con la URL de producción

1. En tu máquina, crea o edita `.env.local`.
2. Pon la `DATABASE_URL` de Neon de producción.
3. Ejecuta:

```bash
npm run db:migrate
```

Como este proyecto ya carga `.env.local` desde [drizzle.config.ts](../drizzle.config.ts), debería funcionar directamente.

### Opción B: Ejecutarla temporalmente con variable inline

Si no quieres tocar `.env.local`, puedes ejecutar:

```bash
DATABASE_URL="pega-aqui-tu-url-de-neon" npm run db:migrate
```

En macOS y Linux esto funciona en una sola línea.

### Cómo saber si salió bien

Si la migración funciona:
- No debería dar error.
- En Neon verás tablas como `users`, `accounts`, `sessions`, `bills`, `friends`, etc.

La migración versionada está en:
- [drizzle/0000_mushy_warhawk.sql](../drizzle/0000_mushy_warhawk.sql)

## Paso 8: Redeploy en Vercel

Después de:
- añadir las variables OAuth
- ejecutar la migración

haz un redeploy:

1. Entra en el proyecto en Vercel.
2. Ve a `Deployments`.
3. Abre el último deploy.
4. Pulsa `Redeploy`.

Esto asegura que el entorno de producción use ya todas las variables correctas.

## Paso 9: Probar que todo funciona

Haz estas comprobaciones en tu URL pública:

1. Abre la home.
2. Prueba `Entrar con Google`.
3. Prueba `Entrar con GitHub`.
4. Prueba crear una cuenta con email.
5. Prueba crear un ticket.
6. Prueba añadir participantes.
7. Prueba añadir items.
8. Prueba abrir la liquidación.

Si algo falla, revisa:
- Logs del deployment en Vercel
- Variables de entorno
- Callbacks OAuth
- Que la migración se haya ejecutado

## Errores típicos y cómo reconocerlos

### Error: `DATABASE_URL no definida`

Significa que la variable no está puesta en Vercel o no está cargada localmente.

Revisión:
- Vercel `Settings > Environment Variables`
- `.env.local` en local

### Error de login con Google o GitHub

Suele significar que el callback está mal.

Revisa exactamente:
- Google: `https://tu-dominio.vercel.app/api/auth/callback/google`
- GitHub: `https://tu-dominio.vercel.app/api/auth/callback/github`

Un carácter de más o de menos rompe el login.

### Error 500 al iniciar sesión o navegar

Suele significar que falta la migración o que la base está vacía.

Revisa:
- que ejecutaste `npm run db:migrate`
- que Neon tiene tablas creadas

### El login funciona en local pero no en producción

Normalmente es uno de estos:
- `NEXTAUTH_URL` apunta a localhost
- el callback OAuth sigue apuntando a localhost
- faltan variables en Vercel

## Qué no debes hacer

- No subas `.env.local` a GitHub.
- No pongas `NEXTAUTH_URL` con `http://localhost:3000` en producción.
- No uses callbacks de OAuth de localhost para Vercel.
- No asumas que Vercel crea tablas por ti.

## Orden recomendado exacto

Si quieres hacerlo sin perderte, sigue este orden:

1. Crear DB en Neon.
2. Importar repo en Vercel.
3. Añadir `DATABASE_URL`, `AUTH_SECRET` y `NEXTAUTH_URL`.
4. Hacer primer deploy.
5. Copiar la URL pública de Vercel.
6. Configurar Google OAuth con esa URL.
7. Configurar GitHub OAuth con esa URL.
8. Añadir `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET` en Vercel.
9. Ejecutar `npm run db:migrate` contra producción.
10. Hacer `Redeploy`.
11. Probar login y creación de datos.

## Si quieres simplificar todavía más

La ruta más segura para un primer despliegue es:
- Primero despliega solo con email/password.
- Después añades Google.
- Después añades GitHub.

Así, si falla un OAuth, sabes que el problema está solo en esa integración y no en todo el proyecto.
