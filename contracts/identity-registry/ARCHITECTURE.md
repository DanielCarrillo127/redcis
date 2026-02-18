# IdentityRegistry — Arquitectura Técnica

## Propósito

`IdentityRegistry` es el contrato base del sistema redcis. Actúa como la **fuente de verdad de identidades**: cualquier wallet que quiera participar en el sistema (ya sea como paciente o como centro de salud) debe estar registrada aquí.

Los otros contratos (`MedicalRecordRegistry` y `AccessControl`) consultan este contrato via **cross-contract call** para validar que los actores que intentan operar están registrados con el rol correcto.

---

## Modelo de Datos

### `UserRole`

```rust
pub enum UserRole {
    Individual,    // Persona natural — dueña de su historial
    HealthCenter,  // Centro de salud — puede registrar eventos clínicos
}
```

### `IndividualData`

```rust
pub struct IndividualData {
    pub wallet: Address,       // Wallet Stellar del individuo
    pub dni_hash: BytesN<32>,  // SHA256(DNI + salt) — calculado off-chain
    pub registered_at: u64,    // Unix timestamp del registro
    pub active: bool,          // Estado del registro
}
```

### `HealthCenterData`

```rust
pub struct HealthCenterData {
    pub wallet: Address,     // Wallet institucional
    pub name: String,        // Nombre del centro (Soroban String, no std)
    pub nit: String,         // Identificador fiscal
    pub country: String,     // Código ISO-3166 α-2 (ej. "CO")
    pub registered_at: u64,
    pub active: bool,
}
```

---

## Storage Layout

```
Instance Storage (ligado al TTL del contrato):
  DataKey::Admin  →  Address (wallet administradora)

Persistent Storage (TTL independiente, archivable):
  DataKey::Role(wallet)            →  UserRole
  DataKey::Individual(wallet)      →  IndividualData
  DataKey::HealthCenter(wallet)    →  HealthCenterData
  DataKey::DniToWallet(BytesN<32>) →  Address
```

**Por qué Persistent y no Instance para los usuarios:**
- Los datos de usuarios son independientes entre sí y pueden tener TTL distintos.
- El storage Persistent es archivable (se puede restaurar) — crítico para registros médicos a largo plazo.
- El storage Instance se carga completo cada vez que se ejecuta el contrato, haciéndolo ineficiente para datos de usuarios.

---

## Flujo de Registro de Individuo

```
1. Cliente calcula off-chain:
   salt = crypto.randomBytes(32)
   dni_hash = SHA256(utf8(DNI) + salt)

2. Cliente llama al contrato:
   register_individual(wallet=<mi_wallet>, dni_hash=<hash>)

3. Contrato verifica:
   a. wallet.require_auth()  → el tx fue firmado por esa wallet
   b. !storage.has(Role(wallet))  → no está ya registrada
   c. !storage.has(DniToWallet(hash))  → el hash no está en uso

4. Contrato almacena:
   storage.set(Role(wallet), UserRole::Individual)
   storage.set(Individual(wallet), IndividualData { ... })
   storage.set(DniToWallet(hash), wallet)

5. Contrato emite evento:
   topic: "ind_reg", data: (wallet, timestamp)
```

---

## Flujo de Registro de Centro de Salud

```
1. Admin conecta wallet
2. Admin llama:
   register_health_center(caller=admin, wallet=hc_wallet, name, nit, country)

3. Contrato verifica:
   a. caller.require_auth()
   b. assert_admin(env, caller)  → caller debe ser el admin almacenado
   c. !storage.has(Role(hc_wallet))  → no registrada

4. Contrato almacena:
   storage.set(Role(hc_wallet), UserRole::HealthCenter)
   storage.set(HealthCenter(hc_wallet), HealthCenterData { ... })

5. Evento emitido:
   topic: "hc_reg", data: (wallet, timestamp)
```

**Nota de diseño**: Los centros de salud solo pueden ser registrados por el admin. Esto garantiza que únicamente entidades verificadas (clínicas, hospitales, laboratorios) puedan registrar eventos clínicos en el sistema.

---

## Búsqueda por DNI (`resolve_dni`)

El lookup inverso `DniToWallet` permite que un centro de salud encuentre la wallet de un paciente a partir de su DNI:

```
Centro de salud recibe DNI del paciente en papel/formulario
→ Calcula dni_hash = SHA256(DNI + salt_compartido)
→ Llama: IdentityRegistry.resolve_dni(dni_hash) → patient_wallet
→ Verifica: AccessControl.has_access(patient_wallet, hc_wallet)
→ Si tiene acceso → consulta historial
```

**Consideración de privacidad**: El mapping `DniToWallet` es público en la blockchain, pero el DNI real nunca está expuesto. Solo quien conozca el salt puede invertir el hash. El salt es una responsabilidad del sistema off-chain.

---

## Manejo de Auth (`require_auth`)

Soroban usa un modelo de auth declarativo. Cuando un contrato llama `address.require_auth()`, el host de Soroban verifica que la transacción incluya una autorización firmada por esa dirección.

```rust
pub fn register_individual(env: Env, wallet: Address, ...) {
    wallet.require_auth();  // <- Falla si la tx no fue firmada por `wallet`
    // ...
}
```

Esto significa que:
- Un individuo **debe** firmar su propia transacción de registro.
- Nadie puede registrar a otro individuo sin su firma.
- El admin debe firmar las transacciones de registro de centros de salud.

---

## Errores y Códigos

| Código | Nombre | Cuándo se lanza |
|---|---|---|
| 1 | `AlreadyInitialized` | `initialize()` llamado más de una vez |
| 2 | `Unauthorized` | Admin diferente intenta operación privilegiada |
| 3 | `AlreadyRegistered` | `register_*()` con wallet ya registrada |
| 4 | `DniHashAlreadyUsed` | Mismo dni_hash enviado por distinta wallet |
| 5 | `UserNotFound` | `get_*()` con wallet no registrada |
| 6 | `NotInitialized` | Operación llamada antes de `initialize()` |

---

## TTL y Persistencia

Todas las entradas de usuarios usan TTL extendido a `1_000_000 ledgers`:

```
1 ledger ≈ 5 segundos
1_000_000 ledgers ≈ 5_000_000 segundos ≈ 57 días
```

Para un sistema de producción se recomienda:
1. TTL más alto (6_312_000 = ~1 año).
2. Un job periódico off-chain que llame `extend_ttl` para mantener las entradas activas.
3. Implementar lógica de restauración (`stellar contract restore`) para entradas archivadas.

---

## Tests Unitarios

Los tests están en el mismo archivo `src/lib.rs` bajo `#[cfg(test)]`.

| Test | Descripción |
|---|---|
| `test_initialize_once` | Doble `initialize` falla con `AlreadyInitialized` |
| `test_get_admin` | Admin almacenado es recuperable |
| `test_register_individual` | Registro exitoso asigna rol `Individual` |
| `test_register_individual_duplicate_wallet` | Segunda wallet igual falla con `AlreadyRegistered` |
| `test_register_individual_duplicate_dni_hash` | Mismo hash en dos wallets falla con `DniHashAlreadyUsed` |
| `test_resolve_dni` | Hash → wallet funciona correctamente |
| `test_register_health_center` | Admin registra HC exitosamente |
| `test_register_health_center_unauthorized` | No-admin falla con `Unauthorized` |
| `test_user_not_found` | Wallet no registrada retorna `UserNotFound` |
| `test_is_registered` | Verifica presencia antes y después del registro |
| `test_set_admin` | Transferencia de admin funciona |
| `test_get_individual_data` | Datos almacenados son correctos |

Para correr los tests:

```bash
cargo test -p identity-registry
```

---

## Interacción Cross-Contract

Los contratos `MedicalRecordRegistry` y `AccessControl` llaman a `IdentityRegistry` usando el cliente generado por `contractimport!`:

```rust
mod identity_registry {
    soroban_sdk::contractimport!(
        file = "../target/wasm32v1-none/release/identity_registry.wasm"
    );
}

// Uso dentro del contrato:
let registry_client = identity_registry::Client::new(&env, &registry_id);
if !registry_client.is_registered(&patient_wallet) {
    return Err(Error::PatientNotFound);
}
```

**Importante**: El WASM de `identity-registry` debe estar compilado antes de compilar los otros contratos, ya que el cliente se genera en tiempo de compilación a partir del WASM.

```bash
# Compilar en orden correcto:
cargo build -p identity-registry --target wasm32v1-none --release
cargo build -p medical-record-registry --target wasm32v1-none --release
cargo build -p access-control --target wasm32v1-none --release

# O simplemente:
stellar contract build  # construye todo en el orden correcto
```
