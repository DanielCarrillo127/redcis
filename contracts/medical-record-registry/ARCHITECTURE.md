# MedicalRecordRegistry — Arquitectura Técnica

## Propósito

`MedicalRecordRegistry` es el contrato que mantiene el **historial clínico inmutable** de los pacientes. Es la pieza central del producto: cada evento médico queda registrado on-chain con su hash de documento y metadatos verificables.

**Invariantes del contrato:**
- Los registros nunca se eliminan ni modifican una vez creados.
- Solo actores autorizados pueden crear registros (centros de salud verificados o el propio paciente).
- El paciente solo puede registrar eventos para sí mismo (`source = Patient`).
- Un centro de salud puede registrar eventos para cualquier paciente registrado, siempre que el paciente exista en el IdentityRegistry.

---

## Modelo de Datos

### `RecordType`

Clasifica el tipo de evento clínico:

```rust
pub enum RecordType {
    LabResult,      // Resultado de laboratorio
    Diagnosis,      // Diagnóstico
    Prescription,   // Fórmula médica
    Procedure,      // Procedimiento quirúrgico/terapéutico
    ImagingReport,  // Imagen diagnóstica (RX, TAC, RMN)
    Vaccination,    // Vacunación
    ProgressNote,   // Nota de evolución
    SelfReported,   // Cargado por el paciente
    Other,          // Otro tipo
}
```

### `RecordSource`

Indica quién creó el registro:

```rust
pub enum RecordSource {
    HealthCenter,   // Registrado por un centro de salud
    Patient,        // Cargado por el propio paciente
}
```

### `RecordMetadata`

Datos almacenados on-chain por cada evento:

```rust
pub struct RecordMetadata {
    pub record_id: u64,              // ID único auto-incremental
    pub patient_wallet: Address,     // Wallet del paciente
    pub issuer_wallet: Address,      // Wallet del emisor
    pub document_hash: BytesN<32>,   // SHA256 del documento off-chain
    pub record_type: RecordType,
    pub source: RecordSource,
    pub description: String,         // Descripción breve (Soroban String)
    pub timestamp: u64,              // Unix seconds (env.ledger().timestamp())
    pub ledger_sequence: u32,        // Nro. de ledger (env.ledger().sequence())
}
```

---

## Storage Layout

```
Instance Storage (config del contrato):
  DataKey::Admin              →  Address
  DataKey::IdentityRegistryId →  Address   (contract ID del IdentityRegistry)
  DataKey::RecordCounter      →  u64       (contador global auto-incremental)

Persistent Storage (datos de usuarios):
  DataKey::PatientRecords(wallet)  →  Vec<u64>        (IDs de registros del paciente)
  DataKey::Record(record_id)       →  RecordMetadata  (metadatos del evento)
```

**Decisión de diseño — RecordCounter en Instance:**
El contador global se almacena en Instance porque:
- Se actualiza en cada `add_record`, accedido con alta frecuencia.
- Es parte de la configuración del contrato (no dato de usuario).
- Instance storage se carga junto con el contrato — cero overhead adicional.

**Decisión — PatientRecords como Vec:**
Se eligió `Vec<u64>` (lista de IDs) sobre un Map para mantener el historial ordenado cronológicamente (los IDs son secuenciales). La alternativa sería `Map<u64, RecordMetadata>` pero implica mayor overhead de almacenamiento duplicado.

---

## Flujo de `add_record`

```
1. issuer.require_auth()  →  El emisor firmó la tx

2. Cargar identity_registry_id desde Instance storage

3. Cross-contract call:
   registry.is_registered(patient_wallet)
   → Falla con PatientNotFound si el paciente no existe

4. Validar fuente según rol:
   if source == HealthCenter:
     registry.is_health_center(issuer)  → IssuerNotAuthorized si no es HC
   if source == Patient:
     issuer == patient_wallet  → InvalidSource si son distintos

5. Generar record_id:
   counter = get(RecordCounter)
   record_id = counter + 1
   set(RecordCounter, record_id)

6. Crear RecordMetadata con timestamp y ledger_sequence del env

7. Almacenar metadatos:
   set(Record(record_id), metadata)
   extend_ttl(Record(record_id), 100, 1_000_000)

8. Actualizar lista del paciente:
   records = get(PatientRecords(patient)) || []
   records.push_back(record_id)
   set(PatientRecords(patient), records)
   extend_ttl(PatientRecords(patient), 100, 1_000_000)

9. Emitir evento:
   topic: "rec_add", data: (record_id, patient_wallet, issuer_wallet, timestamp)

10. Retornar record_id
```

---

## Verificación de Integridad Off-chain

El flujo correcto para verificar que un documento no fue alterado:

```
1. Cliente descarga el documento del backend off-chain
2. Calcula: sha256(documento_descargado)
3. Obtiene: MedicalRecordRegistry.get_record_metadata(record_id).document_hash
4. Compara: sha256(documento) == document_hash
   ✓ Si son iguales → documento íntegro, no fue alterado
   ✗ Si difieren → documento fue modificado o es falso
```

Este mecanismo es el núcleo de la propuesta de valor: **cualquier tercero puede verificar la integridad de un documento médico** sin necesidad de confiar en el emisor.

---

## Inmutabilidad de Registros

Los registros **no tienen función de actualización ni eliminación**. Una vez almacenado, un `RecordMetadata` es permanente.

Si un registro necesita ser "corregido" en escenarios reales, el flujo correcto es:
1. Registrar un nuevo evento con `RecordType::ProgressNote` o `RecordType::Other`.
2. En la `description` referenciar el `record_id` original.
3. Subir documento corregido off-chain con nuevo hash.

Esto preserva la **trazabilidad completa** y evita reescribir el historial.

---

## Conteo de Registros por Paciente

```rust
// Obtener todos los IDs de un paciente:
let ids: Vec<u64> = contract.get_records(patient_wallet);

// Para cada ID, obtener metadatos:
for id in ids {
    let meta: RecordMetadata = contract.get_record_metadata(id);
    // Renderizar en timeline...
}
```

Para construir el timeline clínico en el frontend, se recomienda:
1. Obtener todos los IDs con `get_records`.
2. Hacer batch de llamadas a `get_record_metadata` (o usar la API de Horizon para consultar los eventos emitidos).
3. Ordenar por `timestamp` (ya deberían estar en orden de inserción).

---

## Integración con IdentityRegistry

El contrato llama al IdentityRegistry via `contractimport!`:

```rust
mod identity_registry {
    soroban_sdk::contractimport!(
        file = "../target/wasm32v1-none/release/identity_registry.wasm"
    );
}
```

Funciones utilizadas:
- `is_registered(wallet) → bool`: valida que el paciente existe.
- `is_health_center(wallet) → bool`: valida que el emisor es un centro autorizado.

El `identity_registry_id` (contract ID del IdentityRegistry desplegado) se configura en `initialize()` y puede actualizarse con `set_identity_registry()` (solo admin).

---

## Tests Unitarios

Los tests usan un **mock del IdentityRegistry** que siempre retorna `true` para `is_registered` e `is_health_center`. Esto aísla los tests del `MedicalRecordRegistry` de la lógica del `IdentityRegistry`.

| Test | Descripción |
|---|---|
| `test_initialize_once` | Doble `initialize` falla |
| `test_add_record_by_health_center` | HC registra evento exitosamente, retorna record_id=1 |
| `test_get_records_empty` | Paciente sin registros retorna Vec vacío |
| `test_get_records_multiple` | Dos registros se acumulan correctamente en la lista |
| `test_get_record_metadata` | Metadatos almacenados son correctos y completos |
| `test_record_not_found` | ID inexistente retorna `RecordNotFound` |
| `test_patient_self_reported` | Paciente puede cargar sus propios registros |
| `test_invalid_source_patient_reporting_for_other` | Paciente no puede reportar para otro, retorna `InvalidSource` |

```bash
cargo test -p medical-record-registry
```

---

## Escalabilidad y Limitaciones MVP

**Limitaciones conocidas:**

1. **`PatientRecords` es un Vec lineal**: A medida que un paciente acumula registros, la entrada crece. Soroban tiene límites de tamaño por entrada de storage. Para el MVP esto es suficiente; en producción se implementaría paginación con múltiples entradas.

2. **Sin filtrado on-chain**: No hay `get_records_by_type()` o `get_records_by_date()`. El filtrado se hace off-chain en el cliente.

3. **Sin acceso controlado en la lectura**: `get_records` y `get_record_metadata` son públicos. La verificación de acceso es responsabilidad del cliente (verificar `AccessControl.has_access` antes de mostrar los datos).

**Para producción se recomendaría:**
- Paginación de registros con offsets.
- Indexado off-chain via Horizon events para consultas rápidas.
- Cifrado de la `description` con la clave pública del paciente.
