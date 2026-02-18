# Proyecto: Historia Clínica Descentralizada (MVP Web3)

## 1. Visión General del Producto

### Descripción
Historia Clínica Descentralizada es una plataforma Web3 que permite a individuos y centros de salud **registrar, consultar y verificar información clínica histórica de manera confiable**, usando blockchain como capa de inmutabilidad, trazabilidad y control de accesos.

El producto se centra en que:
- El **individuo es dueño de su información médica**.
- Los **centros de salud pueden registrar y consultar eventos clínicos** de forma confiable.
- Blockchain garantiza **quién creó qué información, cuándo y sin posibilidad de alteración**.

Este MVP está diseñado para ser **visual, demostrable y validable**, no para operar como sistema clínico productivo.

---

## 2. Problema que Resuelve

- La información clínica está fragmentada entre múltiples entidades.
- El paciente no tiene control real ni acceso completo a su historial.
- Los centros médicos no confían en información externa.
- No existe una fuente de verdad verificable e interoperable.
- Cambios de EPS, ciudad o clínica rompen el historial médico.

---

## 3. Propuesta de Valor

### Para Personas Naturales (Individuos)
- Acceso a su **historial clínico completo y verificado**.
- Control sobre quién puede ver o agregar información.
- Registro único, portable y permanente.
- Identidad clínica ligada a una wallet.

### Para Centros de Salud
- Consulta rápida de historial validado por blockchain.
- Capacidad de registrar eventos médicos verificables.
- Reducción de riesgos médicos y operativos.
- Sin integraciones complejas con otros sistemas.

---

## 4. Roles de Usuario

### 4.1 Persona Natural (Individuo)
- Se registra con wallet.
- Vincula su identidad (DNI).
- Visualiza su historial clínico.
- Puede cargar registros personales (ej. exámenes externos).
- Autoriza acceso a centros de salud.

### 4.2 Centro de Salud (Empresa)
- Se registra como entidad verificada.
- Vincula su wallet institucional.
- Busca pacientes por DNI.
- Consulta historial clínico autorizado.
- Agrega nuevos registros clínicos al paciente.

---

## 5. Modelo de Identidad Web3

### Identidad Base
- Cada usuario (persona o centro) tiene:
  - Wallet Stellar
  - Dirección pública
  - Rol (Persona / Centro de Salud)

### Relación clave
- **DNI ↔ Wallet**
- El DNI NO se expone en blockchain.
- Se almacena:
  - Hash(DNI + salt)
  - Referencia a wallet del individuo

---

## 6. Uso de Blockchain (Stellar)

### ¿Qué va on-chain?
- Hash de registros médicos.
- Metadatos del evento clínico.
- Wallet emisora.
- Timestamp.
- Tipo de evento.

### ¿Qué va off-chain?
- Documentos médicos completos.
- PDFs, imágenes, resultados clínicos.
- Datos sensibles.

---

## 7. Smart Contracts (Soroban – MVP)

### Contrato 1: IdentityRegistry
Responsable de:
- Registrar usuarios.
- Asignar rol.
- Vincular hash de DNI a wallet.

Funciones:
- registerIndividual(hashDNI)
- registerHealthCenter(metadata)
- getUserRole(wallet)

---

### Contrato 2: MedicalRecordRegistry
Responsable de:
- Registrar eventos clínicos.
- Asociar registros a un paciente.
- Mantener historial inmutable.

Funciones:
- addRecord(patientWallet, recordHash, recordType)
- getRecords(patientWallet)
- getRecordMetadata(recordId)

---

### Contrato 3 (MVP opcional): AccessControl
Responsable de:
- Autorizar acceso a centros de salud.

Funciones:
- grantAccess(patientWallet, centerWallet)
- revokeAccess(...)
- hasAccess(...)

---

## 8. Arquitectura MVP (Alta Nivel)

### Frontend
- Next.js / Vue / React
- Wallet connection (Freighter u otra)
- UI 100% enfocada en visualización

### Backend (ligero)
- API para:
  - Subida de archivos
  - Almacenamiento off-chain
  - Indexado rápido
- NO lógica crítica

### Blockchain
- Stellar Network
- Soroban Smart Contracts
- Stellar SDK (JS)

---

## 9. Landing Page (Estructura)

### Secciones
1. Hero
   - Claim: "Tu historia clínica, verificable y bajo tu control"
   - CTA: Conectar Wallet

2. Cómo funciona
   - Identidad
   - Registro
   - Consulta

3. Para quién es
   - Personas
   - Centros de Salud

4. Tecnología
   - Blockchain
   - Seguridad
   - Inmutabilidad

5. Call to Action
   - Crear cuenta

---

## 10. Dashboard (Post Login)

### 10.1 Dashboard – Persona Natural

**Sidebar**
- Mi Historial
- Agregar Registro
- Accesos
- Perfil

**Vista Principal**
- Timeline clínico (visual)
- Cada evento:
  - Tipo
  - Fecha
  - Centro emisor
  - Estado verificado (check)

**Agregar Registro**
- Formulario simple
- Upload documento
- Tipo de evento
- Guardar (hash → blockchain)

---

### 10.2 Dashboard – Centro de Salud

**Sidebar**
- Buscar Paciente
- Registrar Evento
- Historiales Consultados
- Perfil Institucional

**Buscar Paciente**
- Input DNI
- Resolución hash → wallet
- Validación acceso

**Historial del Paciente**
- Timeline clínico
- Eventos previos
- Origen del registro

**Registrar Evento**
- Selección paciente
- Tipo de evento
- Documento
- Registro on-chain

---

## 11. MVP Scope (Qué SÍ / Qué NO)

### Incluido
- Registro con wallet
- Roles básicos
- Visualización de historial
- Registro de eventos
- Smart contracts simples

### No incluido
- Integraciones EPS
- Firmas médicas legales
- Emergencias
- Escalabilidad productiva
- Cumplimiento regulatorio completo

---

## 12. Objetivo del MVP

- Validar UX y flujos.
- Demostrar uso real de blockchain.
- Mostrar trazabilidad e inmutabilidad.
- Ser entendible por no técnicos.
- Servir como base para escalar.

---

## 13. Próximos Pasos Técnicos

1. Crear repos:
   - frontend/
   - backend/
   - contracts/
2. Deploy contratos Soroban (testnet).
3. Mock de datos clínicos.
4. Prototipo visual funcional.
5. Feedback y refinamiento.

---

## Fin del Documento
