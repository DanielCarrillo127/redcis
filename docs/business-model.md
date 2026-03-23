# Modelo de Negocio — Redcis

## Visión

**Redcis** (Historia Clínica Descentralizada) es una plataforma Web3 que resuelve uno de los problemas más persistentes del sector salud latinoamericano: la fragmentación e inaccesibilidad del historial médico personal.

El sistema establece que **el individuo es el propietario soberano de su información clínica**, y que cualquier acceso a esa información requiere su autorización explícita.

---

## Problema Raíz

En el sistema de salud actual:

- El historial médico del paciente vive en los servidores del prestador de salud, no del paciente.
- Al cambiar de EPS, de ciudad o de clínica, el historial queda inaccesible o se pierde.
- Los centros médicos no tienen forma de verificar información de otras entidades.
- El paciente no tiene visibilidad ni control sobre quién ha accedido a sus datos.
- No existe una fuente de verdad única, verificable y neutral.

---

## Propuesta de Valor

### Para el Individuo (Paciente)
- Historia clínica **portable y permanente** ligada a su identidad digital (wallet).
- **Control total de accesos**: él decide quién puede ver o agregar información.
- Registro de exámenes, diagnósticos y procedimientos propios.
- Verificabilidad criptográfica: saber que ningún documento fue alterado.

### Para Centros de Salud
- Acceso a historial **validado por blockchain** sin depender de otros sistemas.
- Capacidad de registrar eventos clínicos de forma **auditable e irrefutable**.
- Reducción de errores médicos por falta de información.
- Sin integraciones complejas: solo requieren wallet Stellar.

### Para el Sistema
- Interoperabilidad sin necesidad de acuerdos entre instituciones.
- Trazabilidad completa de quién registró qué y cuándo.
- Base de datos pública de estadísticas de salud (anonimizada).

---

## Modelo de Identidad

Cada participante tiene una **identidad dual**:

1. **Wallet Stellar** — Identificador público en blockchain. Actúa como llave de acceso.
2. **DNI vinculado** — Solo para individuos. Se almacena como `SHA256(DNI + salt)` — nunca en texto plano.

La vinculación `DNI ↔ Wallet` permite a los centros de salud buscar pacientes por DNI sin que el DNI real quede expuesto en ninguna base de datos pública.

### Tipos de usuarios

| Tipo | Registro | Verificación |
|------|----------|--------------|
| Individuo | Auto-registro con wallet + DNI | Firma criptográfica |
| Centro de Salud | Registro por admin con NIT | Verificación fuera de cadena |
| Admin | Predefinido | Wallet hardcodeada en contratos |

---

## Modelo de Datos Clínicos

### Registro Médico (Clinical Record)

Un registro médico es la unidad básica de información del sistema. Representa un **evento clínico único** con:

- Tipo de evento (diagnóstico, examen, prescripción, vacunación, etc.)
- Fecha del evento
- Descripción textual
- Documento adjunto (PDF, imagen) — almacenado off-chain
- Hash SHA-256 del documento — almacenado on-chain
- Wallet del emisor y del paciente
- Fuente: `health_center` o `patient`

### Fuentes de Registros

Los registros tienen dos fuentes posibles:

- **`health_center`**: Registrado por un centro de salud autorizado. Mayor peso clínico.
- **`patient`**: Auto-registrado por el individuo (exámenes externos, anotaciones personales). Útil pero con validez diferenciada.

### Tipos de Registros

```
lab_result       → Resultados de laboratorio
diagnosis        → Diagnósticos médicos
prescription     → Prescripciones y medicamentos
procedure        → Procedimientos quirúrgicos u otros
imaging_report   → Radiografías, ecografías, tomografías
vaccination      → Registro de vacunas
progress_note    → Notas de evolución
self_reported    → Auto-reportado por el paciente
other            → Otros eventos clínicos
```

---

## Modelo de Control de Accesos

El acceso a la historia clínica de un paciente funciona mediante **grants explícitos**:

1. El paciente otorga acceso a un centro de salud específico.
2. El grant tiene una duración (puede ser indefinida).
3. El paciente puede revocar el acceso en cualquier momento.
4. El sistema verifica activamente la expiración antes de servir datos.

### Permisos

| Permiso | Capacidad |
|---------|-----------|
| `view` | Solo puede consultar el historial |
| `add` | Puede consultar y agregar nuevos registros |

### Mirroring on-chain

Los grants de acceso se replican en el contrato `AccessControl` de Soroban. Esto garantiza que la autorización sea verificable de forma independiente al backend.

---

## Modelo de Privacidad

| Dato | Almacenamiento | Exposición |
|------|---------------|------------|
| Documentos médicos | Servidor backend (off-chain) | Solo al titular y a HCs autorizadas |
| Hash del documento | Blockchain (on-chain) | Público |
| DNI | Nunca almacenado | N/A |
| Hash del DNI | MongoDB + Blockchain | Solo como identificador de lookup |
| Wallet pública | MongoDB + Blockchain | Pública |
| Nombre, email | MongoDB (off-chain) | Solo al titular |

---

## Diferenciadores vs. Alternativas

| Criterio | Redcis | EHR Centralizados | Papel / Físico |
|----------|--------|------------------|----------------|
| Portabilidad | Alta (wallet universal) | Baja (por institución) | Ninguna |
| Verificabilidad | Alta (blockchain) | Media (auditorías internas) | Ninguna |
| Control del paciente | Total | Bajo | Medio |
| Privacidad | Alta (off-chain + hash) | Media | Alta |
| Interoperabilidad | Nativa | Requiere integraciones | Ninguna |

---

## Alcance del MVP

### Incluido
- Autenticación sin contraseña via wallet Stellar (Freighter)
- Registro de individuos y centros de salud
- Subida y visualización de registros médicos
- 9 tipos de eventos clínicos
- Control de accesos con expiración temporal
- Explorador público de estadísticas
- Verificación de integridad de documentos
- Sincronización con contratos Soroban en testnet

### Excluido deliberadamente
- Integraciones con sistemas EPS/HIS existentes
- Firmas digitales con validez legal (notaría, cámara de comercio)
- Protocolo de acceso de emergencia
- Notificaciones en tiempo real
- Cumplimiento regulatorio formal (Resolución 1995/1999, HIPAA, GDPR)
- Escalabilidad para producción (clustering, CDN, multi-región)

---

## Hoja de Ruta Post-MVP
0. **v0.1 — Multitenant:** Multiples "personas" conectados a un mismo usuario/wallet (Custodio de wallets acceso con nonce + mail/oauth google).
1. **v0.2 — Correccion registro on-chain de la descripción médica:** No registrar descripciones médicas en la cadena de bloques.
2. **v1.1 — Notificaciones:** Alertas cuando un HC accede al historial o agrega un registro.
4. **v1.2 — Emergencias:** Acceso de lectura temporal sin autorización previa en situaciones de emergencia.
5. **v1.3 — Firmas médicas:** Validación de firma electrónica de profesionales de salud.
6. **v2.0 — Integraciones:** API pública para que sistemas HIS/EHR puedan escribir en Redcis.
6. **v2.1 — Mainnet:** Migración de testnet a mainnet de Stellar con contratos auditados.
7. **v3.0 — IA clínica:** Análisis del historial completo para alertas preventivas.
