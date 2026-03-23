# Flujos de Negocio — Redcis

Descripción detallada de los flujos principales del sistema.

---

## Flujo 1: Registro de Individuo

**Actor:** Persona natural que desea registrar su identidad en el sistema.

```
Usuario                 Frontend               Backend              Blockchain
  │                        │                      │                     │
  │── Conecta Freighter ──▶│                      │                     │
  │                        │── GET /auth/nonce ──▶│                     │
  │                        │◀── { nonce, msg } ───│                     │
  │◀── Solicita firma ─────│                      │                     │
  │── Firma con wallet ───▶│                      │                     │
  │                        │── POST /auth/verify ▶│                     │
  │                        │   { wallet, sig }    │── Verifica Ed25519  │
  │                        │◀── { JWT, user } ────│                     │
  │                        │                      │                     │
  │ (si isNewUser=true)    │                      │                     │
  │◀── Modal completar ────│                      │                     │
  │── Ingresa nombre, DNI ▶│                      │                     │
  │                        │── POST /identity/   ▶│                     │
  │                        │   individual/register│── SHA256(DNI+salt)  │
  │                        │                      │── Guarda en MongoDB │
  │                        │                      │── TX a Soroban ────▶│
  │                        │                      │                     │── register_individual()
  │◀── Dashboard ──────────│                      │                     │
```

**Notas:**
- El DNI nunca viaja en texto plano fuera del dispositivo del usuario (se hashea en el servidor inmediatamente).
- El nonce tiene TTL de 5 minutos y es de un solo uso.
- Si la TX a Soroban falla, el usuario queda registrado en MongoDB pero `isOnChain=false`. Se puede reintentar.

---

## Flujo 2: Registro de Centro de Salud

**Actor:** Administrador del sistema.

```
Admin                    Frontend              Backend              Blockchain
  │                        │                      │                     │
  │── Autenticarse ───────▶│── POST /auth/* ─────▶│                     │
  │◀── JWT (rol admin) ────│◀─────────────────────│                     │
  │── Ir a /admin ────────▶│                      │                     │
  │── Form: nombre, NIT ──▶│── POST /identity/ ──▶│                     │
  │   país, wallet         │   health-center/     │── Guarda en MongoDB │
  │                        │   register           │── TX a Soroban ────▶│
  │                        │                      │                     │── register_health_center()
  │◀── HC creado ──────────│                      │                     │
```

---

## Flujo 3: Centro de Salud Atiende Paciente

**Actor:** Profesional de salud en un centro registrado.

```
HC User                Frontend              Backend              Blockchain
  │                        │                     │                     │
  │── /dashboard/hc ──────▶│                     │                     │
  │── Buscar por DNI ─────▶│── GET /identity/   ▶│                     │
  │                        │   search?dni=XXX    │── SHA256(DNI+salt)  │
  │                        │                     │── Query MongoDB     │
  │                        │                     │   (dniHash match)   │
  │◀── Paciente encontrado │◀────────────────────│                     │
  │                        │                     │                     │
  │── Ver historial ──────▶│── GET /records/    ▶│                     │
  │   (si tiene acceso)    │   patient/:wallet   │── Verifica AccessGrant
  │                        │                     │   active + no expirado
  │◀── Lista de registros ─│◀────────────────────│                     │
  │                        │                     │                     │
  │── Agregar registro ───▶│── POST /records ───▶│                     │
  │   + documento adjunto  │   { form + file }   │── SHA256(archivo)   │
  │                        │                     │── MongoDB record    │
  │                        │                     │── TX a Soroban ────▶│
  │                        │                     │                     │── add_record()
  │◀── Registro creado ────│                     │                     │
```

**Precondición:** El paciente debe haber otorgado acceso al HC previamente.

---

## Flujo 4: Paciente Otorga Acceso a Centro de Salud

**Actor:** Individuo registrado.

```
Paciente              Frontend              Backend              Blockchain
  │                       │                     │                     │
  │── /dashboard/patient  │                     │                     │
  │── /accesses ─────────▶│── GET /access/     ▶│                     │
  │                       │   my-grants         │── Query AccessGrants│
  │◀── Lista de accesos ──│◀────────────────────│                     │
  │                       │                     │                     │
  │── Nuevo acceso ──────▶│                     │                     │
  │── Selecciona HC ─────▶│                     │                     │
  │── Configura: permiso  │                     │                     │
  │   duración ──────────▶│── POST /access/    ▶│                     │
  │                       │   grant             │── Crea AccessGrant  │
  │                       │                     │── TX a Soroban ────▶│
  │                       │                     │                     │── grant_access()
  │◀── Acceso activo ─────│                     │                     │
```

---

## Flujo 5: Paciente Revoca Acceso

```
Paciente               Frontend              Backend              Blockchain
  │                       │                     │                     │
  │── /accesses ─────────▶│                     │                     │
  │── Click "Revocar" ───▶│── POST /access/    ▶│                     │
  │   (confirm modal)     │   revoke            │── AccessGrant.active=false
  │                       │                     │── TX a Soroban ────▶│
  │                       │                     │                     │── revoke_access()
  │◀── Acceso revocado ───│                     │                     │
```

**Efecto:** El HC pierde acceso inmediatamente. Intentar `GET /records/patient/:wallet` retornará 403.

---

## Flujo 6: Paciente Sube Registro Propio

**Actor:** Individuo que quiere registrar un examen externo u otro documento personal.

```
Paciente               Frontend               Backend
  │                        │                      │
  │── /add-record ────────▶│                      │
  │── Completa formulario  │                      │
  │   tipo, fecha, desc ──▶│                      │
  │── Adjunta archivo ────▶│── POST /records ────▶│
  │   (PDF, imagen, <10MB) │   multipart/form-data│── Multer recibe archivo
  │                        │                      │── SHA256(archivo)
  │                        │                      │── Guarda archivo en /uploads
  │                        │                      │── Crea ClinicalRecord en MongoDB
  │                        │                      │   source: 'patient'
  │◀── Registro guardado ──│◀─────────────────────│
```

---

## Flujo 7: Verificación de Integridad

**Actor:** Cualquier usuario que quiere verificar que un documento no fue alterado.

```
Usuario               Frontend              Backend              Stellar Expert
  │                       │                     │                      │
  │── /record/:id ───────▶│── GET /records/:id ▶│                      │
  │◀── Metadatos + hash ──│◀────────────────────│                      │
  │                       │                     │                      │
  │─ Descargar documento ▶│── GET /file ───────▶│── Retorna archivo    │
  │◀─ Archivo descargado ─│                     │                      │
  │                       │                     │                      │
  │── "Verificar" ───────▶│ SHA256(archivo local)                      │
  │◀── Match / No match ──│ === documentHash?                          │
  │                       │                     │                      │
  │ (si isOnChain=true)   │                     │                      │
  │─ "Ver en blockchain" ▶│                     │─Abrir stellarTxHash-▶│
  │                       │                     │                      │── Tx details
```

---

## Flujo 8: Explorador Público

**Actor:** Cualquier persona, sin autenticación.

- `GET /api/explorer/stats` → Total de registros, usuarios registrados, centros activos
- `GET /api/explorer/recent-records` → Últimos N registros (sin datos personales, solo hashes y metadatos públicos)
- `GET /api/explorer/record-types` → Distribución de tipos de registros
- `GET /api/explorer/top-health-centers` → Centros más activos

Los datos del explorador son **completamente anonimizados**: no se exponen wallets de pacientes ni información personal.

---

## Manejo de Errores Críticos

| Situación | Comportamiento esperado |
|-----------|------------------------|
| TX Soroban falla | Persistir en MongoDB, marcar `isOnChain=false`, continuar |
| Nonce expirado | Retornar 401, frontend solicita nuevo nonce automáticamente |
| AccessGrant expirado | Retornar 403 en cualquier endpoint de registros del paciente |
| Freighter no instalado | Frontend muestra instrucciones de instalación, no continúa |
| Archivo > 10MB | Rechazar con 413, mostrar mensaje al usuario |
| DNI ya registrado | Retornar 409, no se puede registrar el mismo DNI dos veces |
