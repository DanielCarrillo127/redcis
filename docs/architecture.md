# Arquitectura Técnica — Redcis

## Visión General

```
┌──────────────────────────────────────────────────────────────────────┐
│                         Cliente (Navegador)                          │
│                                                                      │
│   ┌─────────────────────────────────────────────────────────────┐    │
│   │               Next.js Frontend (Port 3000)                  |    │
│   │  - App Router (SSR/CSR híbrido)                             │    │
│   │  - AuthContext → JWT en localStorage                        │    │
│   │  - Freighter API para firma de transacciones                │    │
│   └──────────────────────────┬──────────────────────────────────┘    │
│                              │ HTTPS / Axios + JWT                   │
└──────────────────────────────┼───────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    Backend Express.js (Port 3001)                    │
│                                                                      │
│  Middlewares: Helmet, CORS, RateLimit, Auth JWT                      │
│                                                                      │
│  ┌──────────┐  ┌──────────┐  ┌─────────┐  ┌──────────┐               │
│  │   auth   │  │ identity │  │ records │  │  access  │               │
│  └──────────┘  └──────────┘  └─────────┘  └──────────┘               │
│  ┌──────────┐  ┌──────────┐                                          │
│  │ explorer │  │ soroban  │ ← Builders de TXs para contratos         │ 
│  └──────────┘  └──────────┘                                          │
│                                                                      │
│  ┌─────────────────────┐    ┌────────────────────────────────────┐   │
│  │   MongoDB/Mongoose  │    │  Local File Storage (/uploads)     │   │
│  │   (Off-chain data)  │    │  (Documentos médicos físicos)      │   │
│  └─────────────────────┘    └────────────────────────────────────┘   │
│                                                                      │
│                     │ Stellar SDK + RPC                              │
└─────────────────────┼────────────────────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     Stellar Testnet / Soroban                        │
│                                                                      │
│  ┌──────────────────┐  ┌─────────────────────┐  ┌────────────────┐   │
│  │ IdentityRegistry │  │ MedicalRecordRegistry│ │ AccessControl  │   │
│  │ (Rust/WASM)      │  │ (Rust/WASM)          │ │ (Rust/WASM)    │   │
│  └──────────────────┘  └─────────────────────┘  └────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Capa de Autenticación

### Protocolo (Challenge-Response Web3)

```
1. Cliente solicita nonce         GET /api/auth/nonce?wallet=G...
2. Backend genera:                { nonce: uuid, message: "Redcis: <nonce>", expiresAt }
3. Backend guarda en MongoDB con TTL de 5min
4. Freighter firma el mensaje     sign(message) → signature (Ed25519)
5. Cliente envía:                 POST /api/auth/verify { wallet, signature, nonce }
6. Backend verifica:              Keypair.verify(message, signature, wallet)
7. Backend marca nonce como used
8. Backend emite JWT (24h)        { sub: wallet, role: user.role }
```

**Seguridad:** Nonces de un solo uso + TTL previenen replay attacks. No hay contraseñas en ningún punto.

---

## Persistencia Dual (Off-chain + On-chain)

El sistema mantiene dos capas de persistencia sincronizadas:

### MongoDB (Off-chain)
- **Velocidad:** Lecturas rápidas sin depender de RPC de blockchain.
- **Datos completos:** Almacena nombre, email, rutas de archivos, metadatos de UI.
- **Indexado:** Queries complejas (filtro por tipo, fecha, rol).
- **Verdad de trabajo:** El backend opera principalmente contra MongoDB.

### Soroban (On-chain)
- **Inmutabilidad:** Datos que llegan aquí no pueden modificarse.
- **Verificabilidad pública:** Cualquiera puede verificar sin confiar en el backend.
- **Hashes únicamente:** Solo `documentHash`, wallets y metadatos básicos.
- **Verdad final:** En caso de discrepancia entre MongoDB y Soroban, Soroban prevalece.

### Campo de Sincronización
```typescript
// En ClinicalRecord de MongoDB:
isOnChain: boolean           // ¿Se sincronizó a Soroban?
onChainRecordId: number      // ID en MedicalRecordRegistry
stellarTxHash: string        // Hash de la TX de Stellar
```

Si la TX Soroban falla, el registro persiste en MongoDB con `isOnChain=false`. La sincronización puede reintentarse.

---

## Seguridad

### Rate Limiting
```
Global:      200 requests / 15 minutos
Auth endpoints: 200 requests / 5 minutos
```

### Headers HTTP (Helmet)
- `Content-Security-Policy`
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Strict-Transport-Security`

### CORS
Solo orígenes configurados en `ALLOWED_ORIGINS` (whitelist explícita).

### Privacidad del DNI
```
Entrada:   DNI en texto plano (solo llega al backend por HTTPS)
Proceso:   salt = uuid_v4()
           dniHash = SHA256(dni + salt)
Almacén:   MongoDB: { dniHash } — sin sal expuesta
           Soroban: { dniHash } — mismo hash
Salida:    Nunca se retorna el DNI ni la sal en ningún endpoint
```

### Archivos
- Validación de tipo MIME y extensión (whitelist: PDF, JPG, PNG, etc.)
- Tamaño máximo: 10MB por archivo
- Nombre de archivo: `{uuid}.{ext}` (no preserva nombre original)
- Ruta nunca expuesta en respuestas de API (solo el hash)

---

## Módulo Soroban (Backend)

El módulo `soroban` del backend actúa como builder de transacciones. El flujo es:

```
1. Service llama soroban.buildTx(contractId, function, args)
2. soroban construye la operación con stellar-sdk
3. Simula la TX en el RPC (soroban-testnet)
4. Firma con SERVER_SIGNING_SECRET
5. Envía la TX firmada al RPC
6. Retorna stellarTxHash
```

**Nota:** En el MVP, el backend firma las TXs de Soroban con su propia keypair (`SERVER_SIGNING_SECRET`). En producción, las TXs deberían ser firmadas por el wallet del usuario via Freighter para mayor descentralización.

---

## Diagrama de Módulos Backend

```
index.ts
    └── Express App
         ├── middlewares/
         │   ├── helmet, cors, rate-limit (global)
         │   └── auth.middleware (JWT verification)
         ├── modules/
         │   ├── auth/        → routes → controller → service
         │   │                   ↕ AuthNonce schema
         │   ├── identity/    → routes → controller → service
         │   │                   ↕ User schema
         │   │                   ↕ soroban.service (IdentityRegistry)
         │   ├── records/     → routes → controller → service
         │   │                   ↕ ClinicalRecord schema
         │   │                   ↕ multer (file upload)
         │   │                   ↕ soroban.service (MedicalRecordRegistry)
         │   ├── access/      → routes → controller → service
         │   │                   ↕ AccessGrant schema
         │   │                   ↕ soroban.service (AccessControl)
         │   ├── explorer/    → routes → controller → service
         │   │                   ↕ (queries read-only sobre todos los schemas)
         │   └── soroban/     → service only (no routes)
         │                       ↕ @stellar/stellar-sdk
         └── shared/
              ├── schemas/    → Mongoose models
              ├── types/      → TypeScript interfaces
              └── utils/      → SHA-256, validators, etc.
```

---

## Decisiones de Diseño

### ¿Por qué backend centralizado + blockchain?

Blockchain puro sería demasiado lento y costoso para almacenar documentos médicos. El backend centralizado aporta:
- Almacenamiento de archivos
- Queries complejas y rápidas
- Gestión de sesiones y JWT
- APIs cómodas para el frontend

Blockchain aporta:
- Inmutabilidad y verificabilidad
- Independencia del backend para verificar hashes
- Resistencia a censura

### ¿Por qué Stellar/Soroban?

- Costos de transacción muy bajos (~$0.00001 por TX)
- Tiempo de finalidad rápido (~5 segundos)
- SDK maduro en JavaScript (stellar-sdk)
- Soroban permite contratos en Rust con lógica compleja

### ¿Por qué MongoDB?

- Schema flexible para evolucionar el modelo de datos
- Ideal para documentos JSON complejos con campos opcionales
- Atlas Cloud con failover automático disponible
- Mongoose ofrece validación y tipado integrados

---

## Limitaciones del MVP

1. **Sin alta disponibilidad:** Single instance de backend y MongoDB.
2. **Firma de TXs por backend:** No totalmente descentralizado; el backend firma las TXs Soroban.
3. **Archivos en disco local:** Sin CDN ni object storage externo (S3, GCS).
4. **Sin caché:** Cada request consulta MongoDB directamente.
5. **Testnet únicamente:** Los contratos no están en mainnet de Stellar.
6. **Sin monitoreo:** No hay alerting, tracing ni APM configurados.
