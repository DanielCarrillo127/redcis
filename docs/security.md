# Seguridad y Privacidad — Redcis

## Modelo de Amenazas

Este documento describe las consideraciones de seguridad del MVP de Redcis y los controles implementados.

---

## Autenticación y Sesiones

### Protocolo Challenge-Response Web3

**Sin contraseñas:** La autenticación se basa exclusivamente en la posesión de la clave privada de una wallet Stellar.

**Flujo:**
1. El backend genera un nonce único (UUID v4) con TTL de 5 minutos.
2. El usuario firma el mensaje `"Redcis: <nonce>"` con su clave privada via Freighter.
3. El backend verifica la firma criptográfica Ed25519 usando la clave pública (wallet).
4. El nonce se marca como `used=true` inmediatamente (no reutilizable).
5. Se emite un JWT con expiración de 24 horas.

**Protecciones:**
- **Replay attacks:** El nonce de un solo uso + TTL de 5min previene reutilización de firmas.
- **Impersonación:** Sin la clave privada, no es posible generar una firma válida.
- **Secuestro de sesión:** JWT firmado con `JWT_SECRET`. Expiración corta (24h).

### Tokens JWT

```
Header: { alg: HS256, typ: JWT }
Payload: { sub: <wallet>, role: <role>, iat, exp }
```

- Firmados con `JWT_SECRET` del entorno (mínimo 32 caracteres recomendado).
- Verificados en cada request protegido via `auth.middleware.ts`.
- No se almacenan en el servidor (stateless).
- Persistidos en `localStorage` del cliente (aceptable para MVP; considerar httpOnly cookies en producción).

---

## Privacidad del DNI

El DNI es el dato más sensible del sistema. Controles:

### Almacenamiento

```
Al recibir:  dni = "123456789"  (solo llega por HTTPS al backend)
Proceso:     salt = crypto.randomUUID()
             dniHash = SHA256(dni + salt)
En MongoDB:  { dniHash: "<hex>", ... }  // Sin sal, sin DNI
En Soroban:  { dni_hash: "<hex>" }      // Mismo hash
```

**La sal se descarta** después de calcular el hash. No se almacena.

### Búsqueda de paciente por DNI

Cuando un HC busca un paciente por DNI:
1. El HC envía el DNI al backend (por HTTPS).
2. El backend NO puede hacer lookup directo (la sal se descartó).
3. **Solución:** El hash del DNI está en Soroban con su wallet correspondiente.
4. El backend llama `resolve_dni(dniHash)` en el contrato IdentityRegistry.
5. El contrato retorna la wallet del individuo.

> **Nota MVP:** En la implementación actual, el backend recalcula el hash de búsqueda de una manera específica. Ver [business-flows.md](business-flows.md) para detalles.

### Qué se expone

| Dato | API Response | Blockchain |
|------|-------------|------------|
| DNI texto plano | ❌ Nunca | ❌ Nunca |
| dniHash | ❌ No en respuestas | ✅ Solo para lookup |
| Wallet (pública) | ✅ Truncada en UI | ✅ Pública |
| Nombre | ✅ Solo al titular | ❌ No |
| Email | ✅ Solo al titular | ❌ No |
| documentHash | ✅ Público | ✅ Público |
| documentPath | ❌ Nunca | ❌ No aplica |

---

## Control de Accesos

### Matriz de Permisos por Rol

| Endpoint | Individual | Health Center | Admin | Público |
|----------|-----------|---------------|-------|---------|
| GET /auth/nonce | ✅ | ✅ | ✅ | ✅ |
| POST /auth/verify | ✅ | ✅ | ✅ | ✅ |
| POST /identity/individual/register | ✅ (propio) | ❌ | ❌ | ❌ |
| POST /identity/health-center/register | ❌ | ❌ | ✅ | ❌ |
| GET /identity/search?dni= | ❌ | ✅ | ✅ | ❌ |
| POST /records | ✅ (self) | ✅ (con acceso) | ✅ | ❌ |
| GET /records/my | ✅ | ❌ | ❌ | ❌ |
| GET /records/patient/:wallet | ❌ | ✅ (con grant) | ✅ | ❌ |
| POST /access/grant | ✅ (propio) | ❌ | ❌ | ❌ |
| POST /access/revoke | ✅ (propio) | ❌ | ❌ | ❌ |
| GET /explorer/* | ✅ | ✅ | ✅ | ✅ |

### Verificación de Access Grants

Antes de servir registros de un paciente a un HC:

```
1. ¿Existe AccessGrant para (patientWallet, centerWallet)?
2. ¿grant.active === true?
3. ¿grant.expiresAt === undefined OR grant.expiresAt > Date.now()?

Si alguno falla → HTTP 403 Forbidden
```

---

## Seguridad HTTP

### Helmet Headers
El middleware `helmet` aplica automáticamente:
- `Content-Security-Policy`
- `Cross-Origin-Embedder-Policy`
- `Cross-Origin-Opener-Policy`
- `Cross-Origin-Resource-Policy`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Strict-Transport-Security` (HSTS)
- `X-XSS-Protection`

### CORS
Whitelist explícita en `ALLOWED_ORIGINS`. Solo los orígenes configurados pueden hacer requests al API.

### Rate Limiting
```
Global:          200 req / 15min  (previene scraping y DDoS)
Auth endpoints:  200 req / 5min   (previene brute force de nonces)
```

---

## Seguridad de Archivos Médicos

### Validación de Upload
- **Extensiones permitidas:** `.pdf`, `.jpg`, `.jpeg`, `.png`, `.dicom` (whitelist)
- **MIME type:** Verificado con `file-type` o Multer config
- **Tamaño máximo:** 10MB (configurable en `MAX_FILE_SIZE_MB`)
- **Nombre del archivo:** Reemplazado por `{uuid}.{ext}` (no se preserva nombre original)

### Acceso a Archivos
- Los archivos están en `/uploads/` en el servidor
- Solo accesibles via endpoints autenticados
- La ruta del archivo (`documentPath`) nunca se expone en respuestas de API

---

## Consideraciones de Seguridad del MVP

### Limitaciones Conocidas (para producción futura)

1. **JWT en localStorage:** Vulnerable a XSS. En producción, usar httpOnly cookies.
2. **Firma de TXs por backend:** El `SERVER_SIGNING_SECRET` firma las TXs Soroban, centralizando la confianza. En producción, el usuario debería firmar con su Freighter.
3. **Archivos en disco local:** Sin encriptación en reposo. En producción, encriptar con KMS.
4. **Sin auditoría:** No hay log de accesos a datos de pacientes. En producción, implementar audit log.
5. **Single instance:** Sin replicación de MongoDB ni failover del backend.
6. **Testnet:** Los contratos Soroban no han sido auditados formalmente.

### No Aplicable al MVP (por diseño)
- **HIPAA / GDPR:** Cumplimiento regulatorio formal está fuera del alcance del MVP.
- **Cifrado E2E de documentos:** Los documentos se almacenan sin cifrado adicional.
- **Zero-knowledge proofs:** No se usan para la verificación de DNI.
- **Multisig:** Las wallets de HC son single-sig.

---

## Recomendaciones Pre-Producción

1. Migrar JWT a httpOnly + Secure cookies con CSRF protection.
2. Implementar firma de TXs Soroban desde el cliente (Freighter) en lugar del backend.
3. Encriptar documentos médicos en reposo (AES-256 o similar).
4. Migrar archivos a object storage con acceso controlado (S3 + presigned URLs).
5. Auditoría formal de contratos Soroban por terceros.
6. Implementar audit log de accesos a datos de pacientes.
7. Rate limiting más granular por wallet (no solo por IP).
8. Monitoreo activo de contratos (alertas por eventos sospechosos).
9. Key rotation para `JWT_SECRET` y `SERVER_SIGNING_SECRET`.
10. Migrar de testnet a mainnet con contratos auditados.
