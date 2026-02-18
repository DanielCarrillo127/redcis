# redcis — Smart Contracts (Soroban / Stellar)

Este directorio contiene los contratos inteligentes del sistema **Historia Clínica Descentralizada (redcis)**, escritos en Rust usando el [Soroban SDK](https://developers.stellar.org/docs/build/smart-contracts) y desplegados en la red **Stellar**.

---

## Tabla de Contenidos

1. [Arquitectura General](#1-arquitectura-general)
2. [Estructura del Proyecto](#2-estructura-del-proyecto)
3. [Contratos](#3-contratos)
   - [IdentityRegistry](#31-identityregistry)
   - [MedicalRecordRegistry](#32-medicalrecordregistry)
   - [AccessControl](#33-accesscontrol)
4. [Modelo de Privacidad](#4-modelo-de-privacidad)
5. [Flujos de Usuario](#5-flujos-de-usuario)
6. [Tecnología](#6-tecnología)
7. [Desarrollo Local](#7-desarrollo-local)
8. [Despliegue en Testnet](#8-despliegue-en-testnet)
9. [Estructura de Storage](#9-estructura-de-storage)
10. [Eventos On-Chain](#10-eventos-on-chain)
11. [Manejo de Errores](#11-manejo-de-errores)

---

## 1. Arquitectura General

```
┌─────────────────────────────────────────────────────────┐
│                    STELLAR NETWORK                       │
│                                                          │
│  ┌─────────────────────┐                                 │
│  │  IdentityRegistry   │  ← Registro de usuarios y roles │
│  │  (Contrato 1)       │                                 │
│  └──────────┬──────────┘                                 │
│             │  cross-contract call (is_registered,       │
│             │  is_health_center)                         │
│             ▼                                            │
│  ┌─────────────────────┐   ┌─────────────────────┐      │
│  │ MedicalRecordReg.   │   │   AccessControl     │      │
│  │ (Contrato 2)        │   │   (Contrato 3)      │      │
│  │                     │   │                     │      │
│  │ - Historial clínico │   │ - grant_access()    │      │
│  │ - Hashes documentos │   │ - revoke_access()   │      │
│  │ - Metadatos eventos │   │ - has_access()      │      │
│  └─────────────────────┘   └─────────────────────┘      │
└─────────────────────────────────────────────────────────┘
           ▲                          ▲
           │                          │
    ┌──────┴──────────────────────────┴──────┐
    │           CLIENTE (Frontend/Backend)    │
    │                                         │
    │  - Calcula hashes off-chain             │
    │  - Almacena documentos off-chain        │
    │  - Conecta wallets (Freighter)          │
    └─────────────────────────────────────────┘
```

**Principio clave**: Blockchain es la capa de verdad e inmutabilidad. Los documentos médicos reales viven off-chain. En cadena solo se almacenan hashes y metadatos.

---

## 2. Estructura del Proyecto

```
contracts/
├── Cargo.toml                      ← Workspace raíz (Rust)
├── README.MD                       ← Este archivo
│
├── identity-registry/
│   ├── Cargo.toml
│   ├── src/
│   │   └── lib.rs                  ← Contrato + tests unitarios
│   └── ARCHITECTURE.md
│
├── medical-record-registry/
│   ├── Cargo.toml
│   ├── src/
│   │   └── lib.rs
│   └── ARCHITECTURE.md
│
├── access-control/
│   ├── Cargo.toml
│   ├── src/
│   │   └── lib.rs
│   └── ARCHITECTURE.md
│
└── scripts/
    ├── deploy.sh                   ← Deploy + inicialización en testnet
    └── invoke.sh                   ← Ejemplos de invocación
```

---

## 3. Contratos

### 3.1 IdentityRegistry

**Propósito**: Registro central de identidades del sistema.

| Función | Actor | Descripción |
|---|---|---|
| `initialize(admin)` | Admin | Configura el contrato. Se llama una sola vez. |
| `register_individual(wallet, dni_hash)` | Individuo | El individuo registra su propia wallet + hash de DNI. |
| `register_health_center(caller, wallet, name, nit, country)` | Admin | Registra un centro de salud verificado. |
| `get_user_role(wallet)` | Cualquiera | Retorna `Individual` o `HealthCenter`. |
| `get_individual(wallet)` | Cualquiera | Retorna datos del individuo. |
| `get_health_center(wallet)` | Cualquiera | Retorna datos del centro de salud. |
| `resolve_dni(dni_hash)` | Cualquiera | Busca la wallet asociada a un hash de DNI. |
| `is_registered(wallet)` | Cualquiera | `true` si la wallet tiene algún rol. |
| `is_health_center(wallet)` | Cualquiera | `true` si la wallet es un HealthCenter. |
| `set_admin(caller, new_admin)` | Admin | Transfiere el rol de admin. |
| `get_admin()` | Cualquiera | Retorna la wallet admin actual. |

**Tipos de datos almacenados**:
- `IndividualData { wallet, dni_hash, registered_at, active }`
- `HealthCenterData { wallet, name, nit, country, registered_at, active }`
- `UserRole { Individual | HealthCenter }`

---

### 3.2 MedicalRecordRegistry

**Propósito**: Registro inmutable de eventos clínicos.

| Función | Actor | Descripción |
|---|---|---|
| `initialize(admin, identity_registry_id)` | Admin | Configura el contrato referenciando el IdentityRegistry. |
| `add_record(issuer, patient_wallet, document_hash, record_type, source, description)` | HC o Paciente | Registra un evento clínico. |
| `get_records(patient_wallet)` | Cualquiera | Lista los IDs de registros de un paciente. |
| `get_record_metadata(record_id)` | Cualquiera | Retorna los metadatos de un registro. |
| `get_record_count()` | Cualquiera | Total de registros en el sistema. |
| `get_admin()` | Cualquiera | Admin actual. |

**Tipos de eventos clínicos** (`RecordType`):

| Valor | Descripción |
|---|---|
| `LabResult` | Resultado de laboratorio |
| `Diagnosis` | Diagnóstico médico |
| `Prescription` | Prescripción / fórmula médica |
| `Procedure` | Procedimiento quirúrgico o terapéutico |
| `ImagingReport` | Imagen diagnóstica (RX, TAC, RMN) |
| `Vaccination` | Vacunación |
| `ProgressNote` | Nota de evolución |
| `SelfReported` | Registro cargado por el propio paciente |
| `Other` | Otro tipo |

**Metadatos on-chain por registro** (`RecordMetadata`):

```
record_id         u64        — ID único auto-incremental
patient_wallet    Address    — Wallet del paciente
issuer_wallet     Address    — Wallet del emisor (HC o paciente)
document_hash     BytesN<32> — SHA256 del documento off-chain
record_type       RecordType — Tipo de evento
source            RecordSource — HealthCenter | Patient
description       String     — Descripción breve
timestamp         u64        — Unix seconds del ledger
ledger_sequence   u32        — Número de ledger (trazabilidad)
```

---

### 3.3 AccessControl

**Propósito**: Gestión de permisos de acceso al historial clínico.

| Función | Actor | Descripción |
|---|---|---|
| `initialize(admin, identity_registry_id)` | Admin | Configura el contrato. |
| `grant_access(patient_wallet, center_wallet, duration_secs)` | Paciente | Autoriza a un centro de salud. `duration_secs=0` = sin expiración. |
| `revoke_access(patient_wallet, center_wallet)` | Paciente | Revoca el acceso. |
| `has_access(patient_wallet, center_wallet)` | Cualquiera | `true` si el permiso está activo y vigente. |
| `get_access_grant(patient_wallet, center_wallet)` | Cualquiera | Datos completos del permiso. |
| `get_admin()` | Cualquiera | Admin actual. |

**Datos del permiso** (`AccessGrant`):

```
patient_wallet  Address — Paciente que otorga
center_wallet   Address — Centro autorizado
granted_at      u64     — Timestamp de otorgamiento
expires_at      u64     — Timestamp de expiración (0 = nunca)
active          bool    — false si fue revocado
```

---

## 4. Modelo de Privacidad

### DNI — Nunca on-chain

El DNI real **nunca** se almacena en la blockchain. El flujo es:

```
Cliente (off-chain)                    Blockchain (on-chain)
─────────────────────                  ─────────────────────
DNI = "123456789"
salt = random_bytes()         →        dni_hash = SHA256(DNI + salt)
                                       wallet → dni_hash (mapping)

Para verificar:
SHA256(DNI + salt) == dni_hash ✓       Solo el hash es verificable
```

- El **salt** se almacena de forma segura en el backend/wallet del usuario.
- El **hash** permite búsqueda y verificación sin exponer el DNI.
- Un centro de salud busca al paciente calculando el hash del DNI ingresado y llamando a `resolve_dni(hash)`.

### Documentos Médicos — Off-chain

| Dato | Ubicación |
|---|---|
| PDF / imágenes / resultados | Off-chain (IPFS, backend cifrado) |
| Hash SHA256 del documento | On-chain en `MedicalRecordRegistry` |
| Metadatos del evento | On-chain en `MedicalRecordRegistry` |

El hash garantiza **inmutabilidad**: si el documento es alterado, el hash no coincide.

---

## 5. Flujos de Usuario

### Flujo A: Registro de Individuo

```
1. Usuario conecta wallet (Freighter)
2. Frontend calcula: salt = random(), dni_hash = SHA256(DNI + salt)
3. Frontend almacena salt de forma segura (backend/local)
4. Usuario firma tx → IdentityRegistry.register_individual(wallet, dni_hash)
5. Blockchain registra: wallet → IndividualData { dni_hash, timestamp }
6. Usuario recibe confirmación de registro
```

### Flujo B: Registro de Centro de Salud

```
1. Operador admin conecta wallet
2. Admin firma tx → IdentityRegistry.register_health_center(
     caller=admin, wallet=hc_wallet, name, nit, country)
3. Blockchain registra: hc_wallet → HealthCenterData
4. Centro puede ahora registrar eventos clínicos
```

### Flujo C: Centro busca paciente por DNI

```
1. Médico ingresa DNI del paciente en el dashboard
2. Backend/frontend calcula: dni_hash = SHA256(DNI_ingresado + salt)
3. Frontend llama: IdentityRegistry.resolve_dni(dni_hash) → patient_wallet
4. Frontend verifica: AccessControl.has_access(patient_wallet, hc_wallet)
5. Si tiene acceso → MedicalRecordRegistry.get_records(patient_wallet)
6. Para cada record_id → MedicalRecordRegistry.get_record_metadata(id)
7. Frontend renderiza timeline clínico
```

### Flujo D: Centro registra evento clínico

```
1. Médico sube documento al backend off-chain
2. Backend calcula: document_hash = SHA256(documento)
3. Médico firma tx → MedicalRecordRegistry.add_record(
     issuer=hc_wallet,
     patient_wallet=...,
     document_hash=...,
     record_type=RecordType::Diagnosis,
     source=RecordSource::HealthCenter,
     description="Diagnóstico: ...")
4. Blockchain asigna record_id y almacena metadatos
5. El documento original queda en backend; el hash en blockchain
```

### Flujo E: Paciente otorga/revoca acceso

```
Otorgar:
  Paciente firma tx → AccessControl.grant_access(
    patient_wallet, center_wallet, duration_secs=0)

Revocar:
  Paciente firma tx → AccessControl.revoke_access(
    patient_wallet, center_wallet)
```

### Flujo F: Paciente carga registro personal

```
1. Paciente sube documento al backend
2. Backend calcula: document_hash = SHA256(documento)
3. Paciente firma tx → MedicalRecordRegistry.add_record(
     issuer=patient_wallet,
     patient_wallet=patient_wallet,
     document_hash=...,
     record_type=RecordType::SelfReported,
     source=RecordSource::Patient,
     description="Examen externo")
```

---

## 6. Tecnología

| Componente | Detalle |
|---|---|
| Lenguaje | Rust (`no_std`) |
| SDK | `soroban-sdk = "25.1.0"` |
| Target WASM | `wasm32v1-none` |
| Rust mínimo | `1.84.0` |
| CLI | `stellar-cli v25.1.0` |
| Red | Stellar Testnet / Mainnet |
| Storage | Persistent (datos críticos) + Instance (config) |
| Hashing | SHA256 calculado off-chain por el cliente |

---

## 7. Desarrollo Local

### Prerequisitos

```bash
# Instalar Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Agregar target WASM
rustup target add wasm32v1-none

# Instalar Stellar CLI
cargo install --locked stellar-cli@25.1.0
```

### Compilar

```bash
# Desde el directorio contracts/
stellar contract build

# O directamente con cargo:
cargo build --target wasm32v1-none --release
```

Los `.wasm` quedan en `target/wasm32v1-none/release/`.

### Ejecutar tests

```bash
# Todos los contratos
cargo test

# Un contrato específico
cargo test -p identity-registry

# Con output detallado
cargo test -p identity-registry -- --nocapture
```

---

## 8. Despliegue en Testnet

### 1. Crear y fondear identidad de despliegue

```bash
stellar keys generate deployer --network testnet --fund
stellar keys address deployer
```

### 2. Ejecutar script de despliegue

```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh testnet
```

El script:
1. Compila todos los contratos.
2. Despliega cada uno en testnet.
3. Llama `initialize()` en cada contrato.
4. Guarda los contract IDs en `.contract-ids.env`.

### 3. Verificar en Stellar Expert

```
https://stellar.expert/explorer/testnet/contract/<CONTRACT_ID>
```

---

## 9. Estructura de Storage

### IdentityRegistry

| Clave | Tier | Tipo de valor | Descripción |
|---|---|---|---|
| `DataKey::Admin` | Instance | `Address` | Wallet administradora |
| `DataKey::Role(wallet)` | Persistent | `UserRole` | Rol del usuario |
| `DataKey::Individual(wallet)` | Persistent | `IndividualData` | Datos del individuo |
| `DataKey::HealthCenter(wallet)` | Persistent | `HealthCenterData` | Datos del centro |
| `DataKey::DniToWallet(hash)` | Persistent | `Address` | Lookup inverso DNI→wallet |

### MedicalRecordRegistry

| Clave | Tier | Tipo de valor | Descripción |
|---|---|---|---|
| `DataKey::Admin` | Instance | `Address` | Wallet administradora |
| `DataKey::IdentityRegistryId` | Instance | `Address` | Contract ID del IdentityRegistry |
| `DataKey::RecordCounter` | Instance | `u64` | Contador global de registros |
| `DataKey::PatientRecords(wallet)` | Persistent | `Vec<u64>` | Lista de IDs del paciente |
| `DataKey::Record(id)` | Persistent | `RecordMetadata` | Metadatos del registro |

### AccessControl

| Clave | Tier | Tipo de valor | Descripción |
|---|---|---|---|
| `DataKey::Admin` | Instance | `Address` | Wallet administradora |
| `DataKey::IdentityRegistryId` | Instance | `Address` | Contract ID del IdentityRegistry |
| `DataKey::Access(patient, center)` | Persistent | `AccessGrant` | Permiso activo |

**Tiers de storage Soroban**:
- **Instance**: Ligado al TTL del contrato. Para config global.
- **Persistent**: TTL independiente por entrada. Para datos críticos de usuarios. Archivable y restaurable.
- **Temporary**: Se elimina permanentemente al expirar. No usado en redcis (datos clínicos deben persistir).

---

## 10. Eventos On-Chain

### IdentityRegistry

| Topic | Datos | Descripción |
|---|---|---|
| `ind_reg` | `(wallet, timestamp)` | Individuo registrado |
| `hc_reg` | `(wallet, timestamp)` | Centro de salud registrado |
| `adm_chg` | `(old_admin, new_admin)` | Admin cambiado |

### MedicalRecordRegistry

| Topic | Datos | Descripción |
|---|---|---|
| `rec_add` | `(record_id, patient_wallet, issuer_wallet, timestamp)` | Registro clínico añadido |

### AccessControl

| Topic | Datos | Descripción |
|---|---|---|
| `acc_grnt` | `(patient_wallet, center_wallet, granted_at, expires_at)` | Acceso otorgado |
| `acc_rvk` | `(patient_wallet, center_wallet, revoked_at)` | Acceso revocado |

Los eventos son indexados por Stellar Horizon y pueden consultarse vía API.

---

## 11. Manejo de Errores

### IdentityRegistry

| Código | Nombre | Descripción |
|---|---|---|
| 1 | `AlreadyInitialized` | El contrato ya fue inicializado |
| 2 | `Unauthorized` | Sin permiso para esta operación |
| 3 | `AlreadyRegistered` | La wallet ya tiene un rol asignado |
| 4 | `DniHashAlreadyUsed` | El hash de DNI ya está vinculado a otra wallet |
| 5 | `UserNotFound` | La wallet no existe en el registro |
| 6 | `NotInitialized` | El contrato no ha sido inicializado |

### MedicalRecordRegistry

| Código | Nombre | Descripción |
|---|---|---|
| 1 | `AlreadyInitialized` | El contrato ya fue inicializado |
| 2 | `Unauthorized` | Sin permiso para esta operación |
| 3 | `NotInitialized` | El contrato no ha sido inicializado |
| 4 | `IssuerNotAuthorized` | El emisor no es un HC registrado |
| 5 | `PatientNotFound` | El paciente no está registrado |
| 6 | `RecordNotFound` | El registro no existe |
| 7 | `InvalidSource` | El emisor no puede usar esa fuente |

### AccessControl

| Código | Nombre | Descripción |
|---|---|---|
| 1 | `AlreadyInitialized` | El contrato ya fue inicializado |
| 2 | `Unauthorized` | Sin permiso para esta operación |
| 3 | `NotInitialized` | El contrato no ha sido inicializado |
| 4 | `PatientNotFound` | El paciente no está registrado |
| 5 | `HealthCenterNotFound` | El centro no está registrado como HC |
| 6 | `AccessAlreadyGranted` | Ya existe un permiso activo |
| 7 | `AccessNotFound` | No existe permiso para revocar |
| 8 | `InvalidExpiry` | Período de expiración inválido |

---

## Referencias

- [Soroban SDK Docs](https://developers.stellar.org/docs/build/smart-contracts)
- [Stellar CLI Reference](https://developers.stellar.org/docs/tools/stellar-cli)
- [Stellar Expert (Testnet Explorer)](https://stellar.expert/explorer/testnet)
- [Freighter Wallet](https://www.freighter.app/)
- [soroban-sdk crate](https://docs.rs/soroban-sdk/latest/soroban_sdk/)
