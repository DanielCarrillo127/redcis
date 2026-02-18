# AccessControl — Arquitectura Técnica

## Propósito

`AccessControl` implementa el **sistema de permisos** del producto: el paciente decide explícitamente qué centros de salud pueden ver su historial clínico. Es el contrato que materializa la propuesta de valor central de redcis: *"El individuo es dueño de su información médica"*.

**Modelo de permisos:**
- El paciente otorga (`grant_access`) o revoca (`revoke_access`) accesos.
- Los permisos tienen una duración opcional.
- El MedicalRecordRegistry **no** verifica acceso antes de devolver datos — esa lógica es del cliente. El AccessControl es el oráculo de permisos que el frontend consulta antes de mostrar el historial.

---

## Modelo de Datos

### `AccessGrant`

```rust
pub struct AccessGrant {
    pub patient_wallet: Address,  // Paciente que otorga el permiso
    pub center_wallet: Address,   // Centro de salud autorizado
    pub granted_at: u64,          // Unix timestamp cuando se otorgó
    pub expires_at: u64,          // 0 = sin expiración, >0 = timestamp de expiración
    pub active: bool,             // false = revocado por el paciente
}
```

---

## Storage Layout

```
Instance Storage:
  DataKey::Admin              →  Address
  DataKey::IdentityRegistryId →  Address

Persistent Storage:
  DataKey::Access(patient_wallet, center_wallet)  →  AccessGrant
```

**Clave compuesta**: La clave del permiso es la tupla `(patient_wallet, center_wallet)`. Esto significa:
- Un paciente puede tener múltiples permisos activos (uno por cada centro).
- Un centro puede tener acceso a múltiples pacientes.
- Solo puede existir un permiso por par paciente-centro (no historial de permisos).

---

## Flujo de `grant_access`

```
1. patient_wallet.require_auth()  →  El paciente firmó la tx

2. Cross-contract calls al IdentityRegistry:
   a. is_registered(patient_wallet)  → PatientNotFound si no existe
   b. is_health_center(center_wallet) → HealthCenterNotFound si no es HC

3. Verificar permiso existente:
   existing = storage.get(Access(patient, center))
   if existing.active AND (expires_at == 0 OR expires_at > now):
     return Err(AccessAlreadyGranted)
   // Si el permiso expiró, se permite crear uno nuevo

4. Calcular expiración:
   now = env.ledger().timestamp()
   expires_at = if duration_secs == 0 { 0 } else { now + duration_secs }

5. Almacenar AccessGrant:
   storage.set(Access(patient, center), grant)
   extend_ttl(Access(patient, center), 100, 1_000_000)

6. Evento:
   topic: "acc_grnt", data: (patient, center, granted_at, expires_at)
```

---

## Flujo de `revoke_access`

```
1. patient_wallet.require_auth()

2. Cargar permiso:
   grant = storage.get(Access(patient, center))  → AccessNotFound si no existe

3. Verificar que está activo:
   if !grant.active → AccessNotFound (ya fue revocado)

4. Marcar como inactivo:
   grant.active = false
   storage.set(Access(patient, center), grant)
   // No se elimina la entrada — se mantiene como registro de auditoría

5. Evento:
   topic: "acc_rvk", data: (patient, center, revoked_at)
```

**Diseño de auditoría**: La revocación no elimina el `AccessGrant`, solo marca `active = false`. Esto permite:
- Saber cuándo fue otorgado y cuándo fue revocado (`granted_at` vs timestamp del evento de revocación).
- Re-otorgar acceso en el futuro (misma clave, nuevo grant).
- Auditar el historial de permisos via los eventos on-chain.

---

## Verificación de Acceso (`has_access`)

```rust
pub fn has_access(env: Env, patient_wallet: Address, center_wallet: Address) -> bool {
    let grant = storage.get(Access(patient, center))?;

    // 1. ¿Está activo (no revocado)?
    if !grant.active { return false; }

    // 2. ¿Ha expirado?
    if grant.expires_at != 0 {
        let now = env.ledger().timestamp();
        if now >= grant.expires_at { return false; }
    }

    true
}
```

Este método es `view` (no modifica estado) — no requiere firma y no consume fees en consultas off-chain via Horizon.

---

## Permisos con Expiración

El parámetro `duration_secs` permite otorgar accesos temporales:

```
grant_access(patient, center, duration_secs=86400)  // 24 horas
grant_access(patient, center, duration_secs=0)      // Sin expiración
```

**Caso de uso real**: Un paciente llega a urgencias a una clínica nueva. Otorga acceso temporal por 48 horas para que el médico pueda ver su historial durante la atención. Al finalizar la atención el acceso expira automáticamente.

**Implementación de expiración**: La expiración se verifica en tiempo de consulta (`has_access`), no en tiempo de almacenamiento. Esto significa que no hay ningún job de limpieza — los permisos expirados simplemente retornan `false` sin necesitar ser eliminados.

---

## Re-otorgamiento Después de Expiración

```
Escenario:
  T=0: grant_access(patient, center, 3600)  → expires_at = T+3600
  T=3601: has_access → false (expirado)
  T=3602: grant_access(patient, center, 0)  → nuevo grant, expires_at=0

La función grant_access permite re-otorgar si el permiso anterior expiró:
  if existing.active AND NOT expired → AccessAlreadyGranted
  if NOT existing.active OR expired → permitir nuevo grant
```

---

## Integración con el Frontend

El flujo correcto en el frontend al buscar el historial de un paciente:

```javascript
// 1. Resolver wallet del paciente
const patientWallet = await identityRegistry.resolve_dni(dniHash);

// 2. Verificar acceso ANTES de mostrar datos
const hasAccess = await accessControl.has_access(patientWallet, myHcWallet);

if (!hasAccess) {
    showError("No tienes acceso al historial de este paciente");
    return;
}

// 3. Solo si tiene acceso, consultar historial
const recordIds = await medicalRecordRegistry.get_records(patientWallet);
const records = await Promise.all(
    recordIds.map(id => medicalRecordRegistry.get_record_metadata(id))
);

// 4. Renderizar timeline
renderTimeline(records);
```

**Importante**: El `MedicalRecordRegistry` no bloquea la consulta por permisos — es el cliente quien debe hacer esta verificación. En producción, el backend también debería verificar el acceso antes de servir los documentos off-chain.

---

## Eventos para Auditoría

Los eventos emitidos permiten reconstruir el historial completo de permisos:

```
acc_grnt: (patient, center, granted_at, expires_at)  ← Acceso otorgado
acc_rvk:  (patient, center, revoked_at)              ← Acceso revocado
```

Usando la API de Horizon, es posible consultar todos los eventos de un contrato y reconstruir un log de auditoría:

```
GET https://horizon-testnet.stellar.org/accounts/<patient_wallet>/effects
```

O usando el Stellar CLI:
```bash
stellar contract events \
  --id <ACCESS_CONTROL_ID> \
  --network testnet \
  --start-ledger <from>
```

---

## Tests Unitarios

| Test | Descripción |
|---|---|
| `test_initialize_once` | Doble `initialize` falla |
| `test_grant_access` | Grant exitoso, `has_access` retorna `true` |
| `test_revoke_access` | Tras revocar, `has_access` retorna `false` |
| `test_no_access_by_default` | Sin grant, `has_access` retorna `false` |
| `test_double_grant_fails` | Segundo grant sin revocar falla con `AccessAlreadyGranted` |
| `test_revoke_nonexistent_fails` | Revocar sin grant previo falla con `AccessNotFound` |
| `test_access_with_expiry` | Acceso temporal expira correctamente |
| `test_get_access_grant_data` | Datos del grant son correctos |
| `test_re_grant_after_expiry` | Re-otorgar acceso después de expiración funciona |

```bash
cargo test -p access-control
```

---

## Limitaciones MVP y Camino a Producción

**Limitaciones del MVP:**

1. **Sin listado de permisos activos por paciente**: No hay `get_grants(patient_wallet) → Vec<AccessGrant>`. Para conocer todos los centros con acceso, el cliente debe llevar un registro off-chain o consultar eventos.

2. **Sin delegación de permisos**: El paciente no puede delegar a alguien más la capacidad de otorgar accesos en su nombre.

3. **Sin permisos granulares**: El permiso es todo-o-nada. En producción, podría existir control granular por tipo de registro (`LabResult`, `Diagnosis`, etc.).

**Para producción:**
- Agregar `get_patient_grants(patient_wallet) → Vec<(center_wallet, AccessGrant)>` para que el paciente pueda ver todos sus permisos activos.
- Implementar permisos por `RecordType` para control granular.
- Considerar un sistema de notificaciones off-chain cuando se otorga/revoca acceso.
