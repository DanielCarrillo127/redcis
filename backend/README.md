# redcis — Backend API

Backend REST API del sistema **Historia Clínica Descentralizada (redcis)**. Construido con Express + TypeScript + MongoDB (Mongoose), con autenticación Web3 usando Freighter (Stellar).

---

## Tabla de Contenidos

1. [Arquitectura](#1-arquitectura)
2. [Flujo de Autenticación Web3 (Freighter)](#2-flujo-de-autenticación-web3-freighter)
3. [Estructura del Proyecto](#3-estructura-del-proyecto)
4. [Modelos de Datos (MongoDB)](#4-modelos-de-datos-mongodb)
5. [API Reference](#5-api-reference)
6. [Middlewares](#6-middlewares)
7. [Variables de Entorno](#7-variables-de-entorno)
8. [Desarrollo Local](#8-desarrollo-local)

---

## 1. Arquitectura

```
src/
├── config/            ← Configuración (env, database)
├── middlewares/       ← Auth JWT, error handler
├── modules/
│   ├── auth/          ← Autenticación Web3 (nonce → firma → JWT)
│   ├── identity/      ← Registro de usuarios y centros de salud
│   ├── records/       ← Registros clínicos (CRUD + archivos)
│   ├── access/        ← Permisos paciente → centro de salud
│   └── explorer/      ← Estadísticas públicas
└── shared/
    ├── schemas/       ← Modelos Mongoose
    ├── types/         ← Tipos TypeScript
    └── utils/         ← Helpers (response, etc.)
```

### Patrón: Rutas → Controladores → Servicios → Schemas

```
HTTP Request
    │
    ▼
[routes.ts]           — Define los endpoints y aplica middlewares
    │
    ▼
[controller.ts]       — Valida input (Zod), llama al servicio, responde
    │
    ▼
[service.ts]          — Lógica de negocio, reglas, consultas a DB
    │
    ▼
[schema.ts]           — Modelo Mongoose (MongoDB)
```

---

## 2. Flujo de Autenticación Web3 (Freighter)

La autenticación usa un patrón de **firma de mensaje con nonce** (análogo a Sign-In with Ethereum pero para Stellar).

```
┌─────────────────┐                    ┌─────────────────┐                ┌──────────────┐
│    FRONTEND      │                    │    BACKEND API  │                │   FREIGHTER  │
│  (Next.js)       │                    │   (Express)     │                │   (Wallet)   │
└────────┬─────────┘                    └────────┬────────┘                └──────┬───────┘
         │                                       │                                │
         │  1. getAddress()                       │                                │
         │──────────────────────────────────────────────────────────────────────►│
         │◄─────────────────────────────────────────────────────────────────────── wallet (G...)
         │                                       │                                │
         │  2. GET /api/auth/nonce?wallet=G...   │                                │
         │──────────────────────────────────────►│                                │
         │◄─────────────────────────────────────── { message, expiresAt }         │
         │                                       │                                │
         │  3. signMessage(message)               │                                │
         │──────────────────────────────────────────────────────────────────────►│
         │◄─────────────────────────────────────────────────────────────────────── signature (base64)
         │                                       │                                │
         │  4. POST /api/auth/verify             │                                │
         │     { wallet, signature, message }    │                                │
         │──────────────────────────────────────►│                                │
         │                                       │  Keypair.verify(message, sig) │
         │                                       │  ✓ Firma válida               │
         │                                       │  ✓ Nonce one-time use         │
         │◄─────────────────────────────────────── { token (JWT), user }         │
         │                                       │                                │
         │  5. Authorization: Bearer <JWT>        │                                │
         │  GET /api/records/my                  │                                │
         │──────────────────────────────────────►│                                │
         │◄─────────────────────────────────────── { historial clínico }         │
```

### ¿Por qué este patrón?

- **Sin contraseñas**: La identidad la prueba la firma criptográfica de la wallet.
- **Nonce de un solo uso**: Previene replay attacks.
- **TTL en MongoDB**: El nonce expira automáticamente (TTL index).
- **JWT estándar**: Después del login, el sistema usa JWT convencional.
- **Ed25519**: Stellar usa Ed25519 — `Keypair.verify(message, signature)` en el SDK.

### Código Frontend (ejemplo con Freighter)

```typescript
import { getAddress, signMessage, isConnected, setAllowed } from '@stellar/freighter-api';

async function loginWithFreighter(apiBase: string): Promise<string> {
  // 1. Verificar Freighter instalado
  const { isConnected: hasWallet } = await isConnected();
  if (!hasWallet) throw new Error('Instala la extensión Freighter');

  // 2. Pedir permiso (primera vez)
  await setAllowed();

  // 3. Obtener wallet
  const { address: wallet } = await getAddress();

  // 4. Obtener nonce del backend
  const nonceRes = await fetch(`${apiBase}/api/auth/nonce?wallet=${wallet}`);
  const { data: { message } } = await nonceRes.json();

  // 5. Firmar el mensaje con Freighter
  const { signedMessage: signature } = await signMessage(message, { address: wallet });

  // 6. Verificar y obtener JWT
  const authRes = await fetch(`${apiBase}/api/auth/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ wallet, signature, message }),
  });
  const { data: { token } } = await authRes.json();

  // 7. Guardar JWT
  localStorage.setItem('redcis_token', token);
  return token;
}
```

---

## 3. Estructura del Proyecto

```
backend/
├── .env                    ← Variables de entorno (NO commitear)
├── .env.example            ← Template de variables de entorno
├── package.json
├── tsconfig.json
├── README.md               ← Este archivo
└── src/
    ├── index.ts            ← Punto de entrada (bootstrap)
    ├── app.ts              ← Configuración de Express (middlewares, rutas)
    │
    ├── config/
    │   ├── env.ts          ← Centraliza y valida variables de entorno
    │   └── database.ts     ← Conexión a MongoDB
    │
    ├── middlewares/
    │   ├── auth.middleware.ts   ← Verificación JWT + requireRole()
    │   └── error.middleware.ts  ← Global error handler + 404
    │
    ├── modules/
    │   ├── auth/
    │   │   ├── auth.service.ts      ← generateNonce, verifySignature, issueJWT
    │   │   ├── auth.controller.ts   ← Handlers HTTP
    │   │   └── auth.routes.ts       ← /api/auth/*
    │   │
    │   ├── identity/
    │   │   ├── identity.service.ts  ← Registro individual/HC, búsqueda DNI
    │   │   ├── identity.controller.ts
    │   │   └── identity.routes.ts   ← /api/identity/*
    │   │
    │   ├── records/
    │   │   ├── records.service.ts   ← CRUD registros, hash documentos
    │   │   ├── records.controller.ts← Upload multer, validaciones
    │   │   └── records.routes.ts    ← /api/records/*
    │   │
    │   ├── access/
    │   │   ├── access.service.ts    ← grant/revoke/check acceso
    │   │   ├── access.controller.ts
    │   │   └── access.routes.ts     ← /api/access/*
    │   │
    │   └── explorer/
    │       ├── explorer.service.ts  ← Estadísticas globales
    │       └── explorer.routes.ts   ← /api/explorer/*
    │
    └── shared/
        ├── schemas/
        │   ├── user.schema.ts           ← Modelo User (individual | health_center)
        │   ├── clinical-record.schema.ts← Modelo ClinicalRecord
        │   ├── access-grant.schema.ts   ← Modelo AccessGrant
        │   └── auth-nonce.schema.ts     ← Modelo AuthNonce (TTL)
        ├── types/
        │   └── index.ts                 ← Tipos globales (JwtPayload, etc.)
        └── utils/
            └── response.ts              ← Helpers para respuestas HTTP
```

---

## 4. Modelos de Datos (MongoDB)

### User

| Campo | Tipo | Descripción |
|---|---|---|
| `wallet` | String (unique) | Stellar public key — ID principal |
| `role` | Enum | `individual` \| `health_center` \| `admin` |
| `name` | String | Nombre del usuario/centro |
| `email` | String | Email opcional |
| `dniHash` | String | SHA256(DNI + salt) — solo individuos |
| `dniSalt` | String (select:false) | Salt del hash — NUNCA expuesto en API |
| `nit` | String | NIT — solo health_center |
| `country` | String | Código ISO-2 — solo health_center |
| `active` | Boolean | Estado del usuario |
| `onChainId` | String | Contract ID del IdentityRegistry |

### ClinicalRecord

| Campo | Tipo | Descripción |
|---|---|---|
| `patientWallet` | String | Wallet del paciente |
| `issuerWallet` | String | Wallet del emisor |
| `healthCenterName` | String | Nombre del centro (desnormalizado) |
| `recordType` | Enum | `lab_result`, `diagnosis`, `prescription`, etc. |
| `source` | Enum | `health_center` \| `patient` |
| `description` | String | Descripción breve |
| `eventDate` | Date | Fecha del evento clínico |
| `documentHash` | String | SHA256 del documento — clave de inmutabilidad |
| `documentPath` | String | Ruta del archivo en disco |
| `isOnChain` | Boolean | ¿Sincronizado con Soroban? |
| `onChainRecordId` | Number | ID en el contrato Soroban |
| `stellarTxHash` | String | Hash de la tx de Stellar |

### AccessGrant

| Campo | Tipo | Descripción |
|---|---|---|
| `patientWallet` | String | Wallet del paciente (que otorga) |
| `centerWallet` | String | Wallet del centro (autorizado) |
| `centerName` | String | Nombre del centro (desnormalizado) |
| `permission` | Enum | `view` \| `add` |
| `grantedAt` | Date | Cuándo fue otorgado |
| `expiresAt` | Date \| null | Expiración (null = sin expiración) |
| `active` | Boolean | false si fue revocado |

### AuthNonce

| Campo | Tipo | Descripción |
|---|---|---|
| `wallet` | String | Wallet que solicitó autenticación |
| `nonce` | String | Nonce aleatorio (32 bytes hex) |
| `message` | String | Mensaje completo para firmar |
| `expiresAt` | Date | TTL index — MongoDB lo elimina automáticamente |
| `used` | Boolean | Marcado como usado (eliminado después) |

---

## 5. API Reference

### Auth

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/api/auth/nonce` | Público | Genera nonce para firmar con Freighter |
| POST | `/api/auth/verify` | Público | Verifica firma y emite JWT |
| GET | `/api/auth/me` | JWT | Perfil del usuario autenticado |
| POST | `/api/auth/refresh` | JWT | Renueva el JWT |

#### GET /api/auth/nonce

```
Query: ?wallet=G...
Response: { message: string, expiresAt: string }
```

#### POST /api/auth/verify

```json
Body: {
  "wallet": "G...",
  "signature": "<base64>",
  "message": "<mensaje firmado>"
}
Response: {
  "token": "<JWT>",
  "user": { "wallet", "role", "name", "userId" },
  "isNewUser": false
}
```

---

### Identity

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| POST | `/api/identity/individual/register` | Cualquiera | Registra al usuario como individuo |
| POST | `/api/identity/health-center/register` | admin | Registra un centro de salud |
| GET | `/api/identity/search?dni=...` | health_center | Busca paciente por DNI |
| GET | `/api/identity/profile` | Cualquiera | Perfil del autenticado |
| PUT | `/api/identity/profile` | Cualquiera | Actualiza perfil |
| GET | `/api/identity/health-centers` | Cualquiera | Lista centros de salud |
| GET | `/api/identity/user/:wallet` | Cualquiera | Datos de usuario por wallet |

#### POST /api/identity/individual/register

```json
Body: {
  "name": "Juan Pérez",
  "dni": "12345678",
  "email": "juan@example.com"
}
```

#### POST /api/identity/health-center/register

```json
Body: {
  "wallet": "G...",
  "name": "Clínica Central",
  "nit": "900123456-1",
  "country": "CO",
  "email": "info@clinica.com"
}
```

---

### Records

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| POST | `/api/records` | Cualquiera | Crea registro clínico (+ archivo opcional) |
| GET | `/api/records/my` | individual | Historial del paciente autenticado |
| GET | `/api/records/my/stats` | individual | Estadísticas del historial |
| GET | `/api/records/patient/:wallet` | health_center | Historial de un paciente (requiere acceso) |
| GET | `/api/records/:id` | Cualquiera | Detalle de un registro |
| POST | `/api/records/:id/verify` | Cualquiera | Verifica integridad de documento |
| PATCH | `/api/records/:id/on-chain` | admin | Marca registro como on-chain |

#### POST /api/records (multipart/form-data)

```
Fields:
  patientWallet  (string, requerido si emisor es HC)
  recordType     (lab_result | diagnosis | prescription | procedure |
                  imaging_report | vaccination | progress_note | self_reported | other)
  source         (health_center | patient)
  description    (string, 5-500 chars)
  eventDate      (ISO date string)
  details        (JSON string, opcional)

Files:
  document       (PDF o imagen, max 10MB)
```

---

### Access

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| POST | `/api/access/grant` | individual | Otorga acceso a un centro |
| POST | `/api/access/revoke` | individual | Revoca acceso a un centro |
| GET | `/api/access/my-grants` | individual | Todos mis permisos otorgados |
| GET | `/api/access/my-patients` | health_center | Pacientes que me autorizaron |
| GET | `/api/access/check` | Cualquiera | Verifica acceso activo |
| GET | `/api/access/grant/:centerWallet` | individual | Detalle de un permiso |

#### POST /api/access/grant

```json
Body: {
  "centerWallet": "G...",
  "permission": "view",
  "durationSeconds": 86400
}
```

`durationSeconds = 0` → permiso sin expiración.

#### GET /api/access/check

```
Query: ?patientWallet=G...&centerWallet=G...
Response: { hasAccess: true, patientWallet: "G...", centerWallet: "G..." }
```

---

### Explorer (Público)

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/api/explorer/stats` | Público | Estadísticas globales |
| GET | `/api/explorer/recent-records` | Público | Últimos registros (anonimizados) |
| GET | `/api/explorer/record-types` | Público | Distribución por tipo |
| GET | `/api/explorer/top-health-centers` | Público | Centros más activos |

---

## 6. Middlewares

### `authMiddleware`

Verifica el JWT en el header `Authorization: Bearer <token>`.

```typescript
// Uso en rutas
router.get('/protected', authMiddleware, handler);
```

En el handler, el payload del JWT está disponible en `req.user`:

```typescript
const { sub: wallet, role, userId } = (req as AuthenticatedRequest).user!;
```

### `requireRole(...roles)`

Se usa después de `authMiddleware` para restringir por rol.

```typescript
router.post('/admin', authMiddleware, requireRole('admin'), handler);
router.get('/hc-only', authMiddleware, requireRole('health_center'), handler);
router.get('/any', authMiddleware, requireRole('individual', 'health_center'), handler);
```

---

## 7. Variables de Entorno

| Variable | Descripción | Ejemplo |
|---|---|---|
| `PORT` | Puerto del servidor | `3001` |
| `NODE_ENV` | Entorno | `development` |
| `MONGODB_URI` | Connection string de MongoDB | `mongodb+srv://...` |
| `JWT_SECRET` | Secret para firmar JWT | Mín 32 chars |
| `JWT_EXPIRES_IN` | TTL del JWT | `24h` |
| `SERVER_SIGNING_SECRET` | Stellar secret key del servidor | `S...` |
| `HOME_DOMAIN` | Dominio de la app | `localhost:3001` |
| `STELLAR_NETWORK` | Red de Stellar | `testnet` |
| `STELLAR_HORIZON_URL` | URL de Horizon | `https://horizon-testnet...` |
| `ALLOWED_ORIGINS` | CORS origins (coma separado) | `http://localhost:3000` |
| `NONCE_TTL_SECONDS` | TTL del nonce de auth | `300` |
| `MAX_FILE_SIZE_MB` | Tamaño máximo de archivos | `10` |
| `UPLOAD_DIR` | Directorio de uploads | `uploads` |

---

## 8. Desarrollo Local

### Prerequisitos

- Node.js 20+
- npm o pnpm
- MongoDB Atlas account (ya configurado en `.env`)

### Instalar y ejecutar

```bash
cd backend/

# Instalar dependencias
npm install

# Modo desarrollo (hot reload)
npm run dev

# Build de producción
npm run build
npm start
```

### Probar la autenticación

```bash
# 1. Obtener nonce (reemplazar con una Stellar public key real)
curl "http://localhost:3001/api/auth/nonce?wallet=GABC...XYZ"

# 2. Verificar health check
curl http://localhost:3001/health

# 3. Estadísticas públicas (no requiere auth)
curl http://localhost:3001/api/explorer/stats
```

### Headers para requests autenticados

```bash
curl -H "Authorization: Bearer <JWT>" http://localhost:3001/api/identity/profile
```

---

## Seguridad

- **DNI**: Solo se guarda `SHA256(DNI + salt)`. El DNI real nunca toca el backend.
- **dniSalt**: Marcado con `select: false` en Mongoose — nunca sale en queries por defecto.
- **JWT**: Firmado con `JWT_SECRET`. Expira en 24h por defecto.
- **Rate limiting**: 200 req/15min globales, 20 req/5min en `/auth`.
- **Helmet**: Headers de seguridad HTTP.
- **CORS**: Solo orígenes configurados en `ALLOWED_ORIGINS`.
- **Validación**: Zod en todos los controllers.
