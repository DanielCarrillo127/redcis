# CLAUDE.md — Redcis (Historia Clínica Descentralizada)

## Instrucciones Permanentes para Claude

- **Al modificar código en `backend/`:** actualizar `backend/CLAUDE.md` si el cambio afecta estructura de módulos, modelos, endpoints o reglas de negocio.
- **Al modificar código en `contracts/`:** actualizar `contracts/CLAUDE.md` si el cambio afecta funciones de contratos, storage, eventos o IDs desplegados.
- **Al modificar código en `frontend/`:** actualizar `frontend/CLAUDE.md` si el cambio afecta páginas, flujos de autenticación, componentes clave o convenciones.
- **Si el cambio es cross-cutting** (afecta arquitectura, flujos de negocio, stack o reglas generales): actualizar también este `CLAUDE.md` raíz.
- **Cambios en `docs/`:** mantener sincronizados con los cambios reales del código. No dejar documentación desactualizada.
- Siempre actualizar los CLAUDE.md **en el mismo commit o sesión** que el cambio de código, no después.

## Contexto del Proyecto

**Redcis** es una plataforma Web3 para la gestión descentralizada de historias clínicas. Permite que individuos sean dueños de su información médica y que centros de salud puedan registrar y consultar eventos clínicos de forma verificable e inmutable, usando la blockchain de Stellar (Soroban) como capa de confianza.

**Dominio de negocio:** Salud digital, identidad soberana, registros médicos.
**Estado:** MVP funcional desplegado en testnet de Stellar.
**Idioma del dominio:** Español. Variables y código en inglés.

---

## Estructura del Monorepo

```
redcis/
├── backend/      # API REST — Express.js + TypeScript + MongoDB
├── contracts/    # Smart contracts — Rust + Soroban SDK
├── frontend/     # Interfaz — Next.js + React + TypeScript
└── docs/         # Documentación extendida del modelo de negocio
```

Cada sub-proyecto tiene su propio `CLAUDE.md` con reglas específicas.

---

## Roles de Usuario

| Rol | Capacidades |
|-----|-------------|
| `individual` | Ver su historial, subir registros propios, gestionar accesos |
| `health_center` | Buscar pacientes por DNI, consultar historial autorizado, agregar registros |
| `admin` | Registrar centros de salud, ver estadísticas globales |

---

## Reglas de Negocio Críticas

1. **Propiedad del dato:** El paciente (individual) es el único dueño de su información. Nadie puede acceder a su historial sin un `AccessGrant` activo.

2. **Privacidad del DNI:** El DNI nunca se almacena en texto plano ni en blockchain. Siempre como `SHA256(DNI + salt)`. La sal no se expone en ningún endpoint.

3. **Doble capa de persistencia:** Los datos residen en MongoDB (off-chain, velocidad) y en Soroban (on-chain, inmutabilidad). El hash del documento es el puente entre ambas capas.

4. **Control de accesos con tiempo:** Un `AccessGrant` puede tener expiración (`expiresAt`). Si `duration_secs = 0`, no expira. El sistema debe verificar activamente la expiración antes de servir datos.

5. **Autenticación sin contraseña:** Solo via firma Ed25519 de wallet Stellar (Freighter). Nunca almacenar credenciales tradicionales.

6. **Documentos off-chain, hashes on-chain:** Los archivos (PDF, imágenes) se almacenan en el servidor backend. Solo el `SHA256` del documento va a blockchain.

7. **Inmutabilidad en Soroban:** Una vez registrado en el contrato `MedicalRecordRegistry`, un evento clínico no puede modificarse ni eliminarse. Solo puede agregarse información.

8. **Fuentes de registro:** Un registro puede tener `source: 'health_center'` o `source: 'patient'`. Los auto-reportados tienen validez diferenciada.

---

## Stack Tecnológico

| Capa | Tech |
|------|------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS, Radix UI |
| Backend | Express.js, TypeScript, MongoDB/Mongoose, JWT |
| Contratos | Rust, Soroban SDK 25.1, Stellar testnet |
| Auth | Freighter wallet, Ed25519, JWT (24h) |
| Archivos | Multer, SHA-256, almacenamiento local |

---

## Contratos Desplegados (Testnet)

```
IDENTITY_REGISTRY:      CCBLMVUJVDHK7KQKK4AFQ5NEHKPUVV6UGS5ASXOIDPVIIYZVTKTXJJ5O
ACCESS_CONTROL:         CDT2LNOFNVLRII4NWI3CPA2Z3VW37ZWAKSBIJ6NLB7MM4NYIEQK7EY47
MEDICAL_RECORD_REGISTRY: CBVCGN56BQ4UESHPSXHC7O4OSOQNYQW4OUTSOD2NGL4YTOJQAYSPGIYZ
```

---

## Convenciones Generales

- **Lenguaje del código:** inglés (variables, funciones, tipos, comentarios de código).
- **Lenguaje de UI y documentación:** español.
- **Wallets Stellar:** siempre en formato `G...` (clave pública).
- **Hashes:** siempre hexadecimales lowercase de 64 caracteres (SHA-256).
- **IDs de contratos:** siempre en formato `C...` (Soroban contract ID).
- No usar `console.log` en producción; usar el logger configurado.
- No commitear `.env` ni `.env.local`.

---

## Flujos Principales

Ver [docs/business-flows.md](docs/business-flows.md) para la descripción detallada de cada flujo.

**Resumen:**
1. **Registro individual** → Conectar wallet → Firmar nonce → Completar perfil con DNI
2. **Registro HC** → Admin crea el centro de salud en backend + contrato
3. **Subir registro médico** → Formulario → Hash del doc → MongoDB → (opcional) Soroban
4. **Otorgar acceso** → Paciente autoriza HC → AccessGrant en MongoDB + Soroban
5. **Consultar historial** → HC busca por DNI → Verifica acceso → Retorna registros

---

## Lo que NO incluye este MVP

- Integraciones con EPS o sistemas externos
- Firmas médicas digitales con validez legal
- Protocolo de emergencias
- Cumplimiento HIPAA/GDPR completo
- Escalabilidad para producción (sin load balancers, CDN, etc.)
