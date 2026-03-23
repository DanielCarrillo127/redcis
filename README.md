# Redcis — Historia Clínica Descentralizada

Plataforma Web3 que permite a individuos ser dueños de su historia clínica y a centros de salud registrar y consultar eventos médicos de forma verificable e inmutable, usando la blockchain de Stellar como capa de confianza.

> MVP funcional desplegado en Stellar Testnet.

---

## El Problema

La información clínica está fragmentada entre múltiples entidades. El paciente no tiene control real de su historial, los centros médicos no confían en información externa, y no existe una fuente de verdad verificable ni interoperable. Cambiar de EPS, ciudad o clínica rompe el historial médico.

---

## La Solución

Una historia clínica ligada a una wallet Stellar:
- **El paciente controla quién accede** a su información.
- **Los documentos médicos se almacenan off-chain** (privacidad), pero sus hashes van on-chain (verificabilidad).
- **Blockchain garantiza** quién registró qué, cuándo, y sin posibilidad de alteración.

---

## Roles

| Rol | Qué puede hacer |
|-----|-----------------|
| **Individuo** | Ver su historial, subir registros propios, otorgar/revocar acceso a centros |
| **Centro de Salud** | Buscar pacientes por DNI, consultar historial autorizado, agregar eventos clínicos |
| **Admin** | Registrar centros de salud, ver estadísticas globales |

---

## Arquitectura

```
┌─────────────────┐     ┌─────────────────┐     ┌───────────────────────┐
│   Frontend      │────▶│    Backend      │────▶│  Stellar / Soroban    │
│  Next.js + TS   │     │ Express + Mongo │     │   Smart Contracts     │
│  Freighter UI   │     │  Off-chain data │     │   On-chain truth      │
└─────────────────┘     └─────────────────┘     └───────────────────────┘
```

**Backend** = API REST + almacenamiento de archivos + indexado rápido. No es la fuente de verdad final.

**Soroban** = La fuente de verdad. Tres contratos independientes:

| Contrato | Responsabilidad |
|----------|-----------------|
| `IdentityRegistry` | Registro de usuarios y vinculación DNI ↔ wallet |
| `MedicalRecordRegistry` | Registro inmutable de eventos clínicos con hash del documento |
| `AccessControl` | Permisos de acceso entre paciente y centros de salud |

---

## Flujos Clave

**1. Registro de usuario**
Conectar Freighter → Firmar nonce → Completar perfil (DNI → se guarda como hash, nunca en texto plano)

**2. Subir un registro médico**
Paciente sube archivo → Backend calcula SHA-256 → Guarda en MongoDB → (Opcional) sincroniza hash a Soroban

**3. Centro de salud atiende un paciente**
HC busca por DNI → Backend verifica `AccessGrant` activo → HC consulta historial → HC agrega nuevo registro

**4. Otorgar acceso**
Paciente selecciona HC + duración → `AccessGrant` en MongoDB + Soroban `AccessControl`

**5. Verificación de integridad**
Usuario descarga documento → Recalcula SHA-256 → Compara con hash en blockchain → Verifica tx en Stellar Expert

---

## Stack Tecnológico

| Capa | Tecnologías |
|------|-------------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS, Radix UI, Freighter API |
| Backend | Express.js, TypeScript, MongoDB/Mongoose, JWT, Multer |
| Contratos | Rust, Soroban SDK 25.1, WASM |
| Blockchain | Stellar Network (Testnet) |

---

## Estructura del Repositorio

```
redcis/
├── backend/      # API REST — ver backend/CLAUDE.md
├── contracts/    # Smart contracts Soroban — ver contracts/CLAUDE.md
├── frontend/     # Interfaz web — ver frontend/CLAUDE.md
└── docs/         # Documentación extendida del modelo de negocio
```

---

## Inicio Rápido

**Backend**
```bash
cd backend
npm install
cp .env.example .env   # Configurar variables
npm run dev            # Puerto 3001
```

**Frontend**
```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev            # Puerto 3000
```

**Contratos**
```bash
cd contracts
cargo test             # Tests unitarios
./scripts/deploy.sh    # Desplegar en testnet
```

Requiere [Freighter](https://freighter.app) instalado en el navegador y una cuenta en Stellar Testnet.

---

## Contratos Desplegados (Testnet)

```
IdentityRegistry:        CCBLMVUJVDHK7KQKK4AFQ5NEHKPUVV6UGS5ASXOIDPVIIYZVTKTXJJ5O
AccessControl:           CDT2LNOFNVLRII4NWI3CPA2Z3VW37ZWAKSBIJ6NLB7MM4NYIEQK7EY47
MedicalRecordRegistry:   CBVCGN56BQ4UESHPSXHC7O4OSOQNYQW4OUTSOD2NGL4YTOJQAYSPGIYZ
```

---

## Documentación

- [Modelo de negocio y contexto extendido](docs/business-model.md)
- [Flujos de datos detallados](docs/business-flows.md)
- [Arquitectura técnica](docs/architecture.md)
- [Seguridad y privacidad](docs/security.md)

---

## Alcance del MVP

**Incluido:** Autenticación Web3, roles de usuario, historial clínico, subida de archivos, control de accesos con expiración, explorador blockchain público, integración Soroban.

**No incluido:** Integraciones EPS, firmas médicas legales, emergencias, cumplimiento HIPAA/GDPR, escalabilidad productiva.
