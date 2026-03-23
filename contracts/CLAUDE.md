# CLAUDE.md — Smart Contracts (Redcis Soroban)

## Propósito

Tres contratos Soroban (Stellar) que conforman la capa de inmutabilidad del sistema. Son la fuente de verdad final para identidades, registros médicos y permisos de acceso.

**Principio:** Una vez escrito en blockchain, no se puede modificar. Diseñar con cuidado.

---

## Stack

- **Lenguaje:** Rust (no_std)
- **SDK:** soroban-sdk 25.1.0
- **Target de compilación:** `wasm32v1-none --release`
- **Red:** Stellar Testnet
- **Build:** `stellar contract build` o `cargo build --target wasm32v1-none --release`
- **Tests:** `cargo test` (unit tests en cada contrato)

---

## Contratos

### 1. `identity-registry`

**Responsabilidad:** Registro canónico de usuarios en blockchain.

**Datos almacenados:**
- `IndividualData { wallet, dni_hash, registered_at, active }`
- `HealthCenterData { wallet, name, nit, country, registered_at, active }`
- Mapping `dni_hash → wallet` para búsqueda inversa

**Funciones principales:**
- `initialize(admin)` — Una sola vez
- `register_individual(wallet, dni_hash)` — Auto-registro
- `register_health_center(admin, wallet, name, nit, country)` — Solo admin
- `get_user_role(wallet)` → `Individual | HealthCenter`
- `resolve_dni(dni_hash)` → `wallet` — Búsqueda por DNI hasheado
- `is_registered(wallet)`, `is_health_center(wallet)`

**Reglas críticas:**
- `dni_hash` único — no se puede registrar el mismo DNI dos veces
- Solo el admin puede registrar centros de salud
- No hay función de eliminación de registros

---

### 2. `medical-record-registry`

**Responsabilidad:** Registro inmutable de eventos clínicos.

**Datos almacenados:**
- `RecordMetadata { record_id, patient_wallet, issuer_wallet, document_hash, record_type, source, description, timestamp, ledger_sequence }`
- Lista de `record_id` por `patient_wallet`
- Contador global de registros

**Tipos de registro (`RecordType`):**
`LabResult | Diagnosis | Prescription | Procedure | ImagingReport | Vaccination | ProgressNote | SelfReported | Other`

**Fuente (`RecordSource`):** `HealthCenter | Patient`

**Funciones principales:**
- `initialize(admin, identity_registry_id)` — Referencia al IdentityRegistry
- `add_record(issuer, patient_wallet, document_hash, record_type, source, description)` → `record_id`
- `get_records(patient_wallet)` → `Vec<u64>`
- `get_record_metadata(record_id)` → `RecordMetadata`
- `get_record_count()` → `u64`

**Reglas críticas:**
- `issuer` debe ser un HC registrado o el propio `patient_wallet`
- El `patient_wallet` debe estar registrado en IdentityRegistry
- El `document_hash` es el SHA-256 del documento real (off-chain)
- No hay función de actualización ni eliminación

---

### 3. `access-control`

**Responsabilidad:** Gestión de permisos de acceso paciente ↔ centro de salud.

**Datos almacenados:**
- `AccessGrant { patient_wallet, center_wallet, granted_at, expires_at, active }`

**Funciones principales:**
- `initialize(admin, identity_registry_id)`
- `grant_access(patient_wallet, center_wallet, duration_secs)` — `0` = sin expiración
- `revoke_access(patient_wallet, center_wallet)`
- `has_access(patient_wallet, center_wallet)` → `bool` — Verifica expiración automáticamente
- `get_access_grant(patient_wallet, center_wallet)` → `AccessGrant`

**Reglas críticas:**
- Solo el propio `patient_wallet` puede llamar `grant_access` y `revoke_access`
- `has_access` retorna `false` si el grant expiró (comparado con timestamp actual del ledger)
- No se puede hacer `grant_access` si ya existe un grant activo (usar revoke primero)

---

## IDs de Contratos Desplegados (Testnet)

```
IDENTITY_REGISTRY:        CCBLMVUJVDHK7KQKK4AFQ5NEHKPUVV6UGS5ASXOIDPVIIYZVTKTXJJ5O
ACCESS_CONTROL:           CDT2LNOFNVLRII4NWI3CPA2Z3VW37ZWAKSBIJ6NLB7MM4NYIEQK7EY47
MEDICAL_RECORD_REGISTRY:  CBVCGN56BQ4UESHPSXHC7O4OSOQNYQW4OUTSOD2NGL4YTOJQAYSPGIYZ
ADMIN_WALLET:             GBVSG3GQFUR4BWQCDGWJYNTE7ROSEWUSOESRMMHKNGNBA6GO7Y6ODTX5
```

---

## Storage Tiers

| Tier | Uso |
|------|-----|
| `Instance` | Admin wallet, referencias a otros contratos, contadores globales |
| `Persistent` | Datos de usuarios, registros médicos, grants de acceso |
| `Temporary` | No se usa en este MVP |

---

## Eventos Emitidos

| Contrato | Evento | Datos |
|----------|--------|-------|
| identity-registry | `ind_reg` | wallet, timestamp |
| identity-registry | `hc_reg` | wallet, timestamp |
| identity-registry | `adm_chg` | old_admin, new_admin |
| medical-record-registry | `rec_add` | record_id, patient_wallet, issuer_wallet, timestamp |
| access-control | `acc_grnt` | patient_wallet, center_wallet, granted_at, expires_at |
| access-control | `acc_rvk` | patient_wallet, center_wallet, revoked_at |

---

## Scripts de Despliegue

```bash
# Desplegar todos los contratos
./scripts/deploy.sh

# Despliegue paso a paso con logging
./scripts/deploy-step-by-step.sh

# Ejecutar tests
./scripts/test-contracts.sh

# Invocar contratos de ejemplo
./scripts/invoke.sh
```

---

## Convenciones de Código Rust/Soroban

- Usar `soroban_sdk::contracterror` para todos los errores con códigos explícitos.
- Los tipos complejos deben derivar `contracttype`.
- Almacenar datos críticos en `Persistent` tier, nunca en `Temporary`.
- `initialize()` siempre debe verificar que no fue llamado antes (error `AlreadyInitialized`).
- Funciones que modifican estado deben verificar autorización con `env.require_auth()`.
- No hacer llamadas cross-contract innecesarias; preferir cachear referencias en Instance storage.
- Toda función pública debe tener al menos un test unitario.
