# CLAUDE.md — Backend (Redcis API)

## Propósito del Servicio

API REST que actúa como capa intermedia entre el frontend y la blockchain. Responsable de:
- Autenticación Web3 (nonce + firma Freighter)
- Gestión de identidades (individuos y centros de salud)
- Almacenamiento off-chain de registros médicos y archivos
- Control de accesos con sincronización a Soroban
- Interacción con los tres contratos Soroban desplegados

**No contiene lógica crítica de negocio irreemplazable.** La fuente de verdad final es Soroban.

---

## Stack

- **Runtime:** Node.js
- **Framework:** Express.js 4.x
- **Lenguaje:** TypeScript 5.5
- **Base de datos:** MongoDB + Mongoose 8.4
- **Auth:** JWT (24h) + Ed25519 signature verification (Stellar)
- **Files:** Multer (max 10MB, PDF/imágenes)
- **Validación:** Zod
- **Seguridad:** Helmet, CORS, express-rate-limit, bcryptjs

---

## Estructura de Módulos

```
src/
├── config/          # env.ts, database.ts
├── middlewares/     # auth.middleware.ts, error.middleware.ts
├── modules/
│   ├── auth/        # Nonce generation + signature verification + JWT
│   ├── identity/    # Register individuals & health centers, search by DNI
│   ├── records/     # CRUD medical records + file upload
│   ├── access/      # Grant/revoke access between patient ↔ HC
│   ├── explorer/    # Public statistics (no auth required)
│   └── soroban/     # Transaction builders for Soroban contracts
├── shared/
│   ├── schemas/     # Mongoose models (User, ClinicalRecord, AccessGrant, AuthNonce)
│   ├── types/       # TypeScript interfaces
│   └── utils/       # SHA-256, salt generation, etc.
└── index.ts
```

Cada módulo sigue el patrón: `router.ts → controller.ts → service.ts`.

---

## Modelos de Datos (MongoDB)

### User
```typescript
{
  wallet: string        // Stellar public key (G...), unique
  role: 'individual' | 'health_center' | 'admin'
  name: string
  email?: string
  dniHash?: string      // SHA256(DNI + salt) — solo individuos
  nit?: string          // Solo health_centers
  country?: string      // Solo health_centers
  active: boolean
}
```

### ClinicalRecord
```typescript
{
  patientWallet: string
  issuerWallet: string
  recordType: 'lab_result' | 'diagnosis' | 'prescription' | 'procedure' |
              'imaging_report' | 'vaccination' | 'progress_note' |
              'self_reported' | 'other'
  source: 'health_center' | 'patient'
  description: string
  eventDate: Date
  documentHash?: string    // SHA-256 del archivo
  documentPath?: string    // Ruta local del archivo
  isOnChain: boolean
  onChainRecordId?: number // ID en MedicalRecordRegistry
  stellarTxHash?: string
}
```

### AccessGrant
```typescript
{
  patientWallet: string
  centerWallet: string
  permission: 'view' | 'add'
  grantedAt: Date
  expiresAt?: Date     // undefined = no expira
  active: boolean
}
```

### AuthNonce
```typescript
{
  wallet: string
  nonce: string
  message: string    // Mensaje formateado para Freighter
  expiresAt: Date    // TTL index — auto-cleanup
  used: boolean
}
```

---

## Reglas de Negocio del Backend

1. **Verificación de acceso antes de servir registros:** Siempre validar `AccessGrant.active === true` y que `expiresAt > now` antes de retornar registros de un paciente a un HC.

2. **DNI nunca en texto plano:** Al recibir un DNI, generar `salt`, calcular `SHA256(dni + salt)` y solo almacenar el hash. La sal se puede guardar temporalmente para búsquedas pero nunca exponerse en respuestas.

3. **Nonces de un solo uso:** Marcar `used: true` inmediatamente al verificar la firma. Los nonces tienen TTL de 5 minutos.

4. **Roles estrictos en endpoints:**
   - Solo `health_center` puede buscar pacientes por DNI.
   - Solo `individual` puede gestionar sus propios accesos.
   - Solo `admin` puede registrar centros de salud.

5. **Soroban es secundario al MongoDB:** Si la transacción Soroban falla, el registro en MongoDB persiste. El campo `isOnChain` indica si se sincronizó. Reintentos de sincronización son posibles.

6. **Rate limiting:** Auth endpoints tienen límite más estricto (200 req/5min). No elevar este límite sin revisión de seguridad.

---

## Endpoints Principales

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/api/auth/nonce` | No | Genera nonce para firma |
| POST | `/api/auth/verify` | No | Verifica firma, retorna JWT |
| GET | `/api/auth/me` | JWT | Perfil del usuario autenticado |
| POST | `/api/identity/individual/register` | JWT | Registrar individuo |
| POST | `/api/identity/health-center/register` | JWT Admin | Registrar HC |
| GET | `/api/identity/search?dni=...` | JWT HC | Buscar paciente por DNI |
| POST | `/api/records` | JWT | Crear registro médico |
| GET | `/api/records/my` | JWT | Registros propios |
| GET | `/api/records/patient/:wallet` | JWT HC | Registros de paciente (requiere acceso) |
| POST | `/api/access/grant` | JWT Individual | Otorgar acceso a HC |
| POST | `/api/access/revoke` | JWT Individual | Revocar acceso |
| GET | `/api/explorer/stats` | No | Estadísticas globales |

---

## Variables de Entorno Requeridas

```env
PORT=3001
MONGODB_URI=mongodb+srv://...
JWT_SECRET=...
JWT_EXPIRES_IN=24h
SERVER_SIGNING_SECRET=SD...   # Clave privada Stellar para firma de txs
STELLAR_NETWORK=testnet
STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
STELLAR_RPC_URL=https://soroban-testnet.stellar.org
IDENTITY_REGISTRY_CONTRACT_ID=CCBLMVUJ...
ACCESS_CONTROL_CONTRACT_ID=CDT2LNO...
MEDICAL_RECORD_REGISTRY_CONTRACT_ID=CBVCGN5...
ADMIN_WALLET=GBVSG3GQ...
ALLOWED_ORIGINS=http://localhost:3000
UPLOAD_DIR=uploads
MAX_FILE_SIZE_MB=10
```

---

## Convenciones de Código

- Un módulo = un directorio con `routes.ts`, `controller.ts`, `service.ts`.
- La lógica de negocio va en `service.ts`. Los controllers solo validan y delegan.
- Usar `Zod` para validar bodies de request en los controllers.
- Errores con `next(error)` al middleware de manejo de errores.
- Archivos subidos en `uploads/` con nombre `{uuid}.{ext}`.
- No retornar `documentPath` en respuestas de API (solo `documentHash`).
