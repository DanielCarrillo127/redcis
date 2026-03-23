# CLAUDE.md — Frontend (Redcis Web App)

## Propósito del Servicio

Interfaz web que permite a individuos, centros de salud y administradores interactuar con la plataforma Redcis. La UI refleja los tres roles del sistema y adapta el dashboard según el tipo de usuario autenticado.

---

## Stack

- **Framework:** Next.js 16 (App Router)
- **Lenguaje:** TypeScript 5.7
- **UI:** React 19, Radix UI, Tailwind CSS 4.1
- **Wallet:** @stellar/freighter-api 6.0
- **Forms:** React Hook Form + Zod
- **HTTP:** Axios (con interceptor JWT automático)
- **Notificaciones:** Sonner
- **Charts:** Recharts
- **Tema:** next-themes (light/dark)

---

## Estructura de Páginas

```
app/
├── page.tsx                      # Landing pública
├── login/                        # Conexión de wallet Freighter
├── dashboard/
│   ├── patient/                  # Dashboard individuo
│   │   ├── page.tsx              # Resumen + timeline de eventos
│   │   ├── add-record/           # Subir registro médico
│   │   ├── accesses/             # Gestionar accesos a HC
│   │   └── profile/              # Perfil e identidad
│   ├── health-center/            # Dashboard HC
│   │   ├── page.tsx              # Pacientes autorizados + acciones rápidas
│   │   ├── search/               # Buscar paciente por DNI
│   │   ├── patient/[id]/         # Historial de un paciente específico
│   │   └── accesses/             # Ver accesos otorgados
│   ├── admin/                    # Dashboard administrador
│   └── record/[id]/              # Detalle de un registro médico
└── explorer/                     # Explorador blockchain público
```

---

## Estructura de Componentes y Lógica

```
components/
├── ui/                           # Wrappers de Radix UI (Button, Dialog, etc.)
├── dashboard-layout.tsx          # Sidebar + layout principal
├── landing-client.tsx            # Contenido de la landing page
├── complete-profile-modal.tsx    # Modal primer acceso (completar perfil)
├── clinical-event-card.tsx       # Tarjeta de registro médico
├── timeline.tsx                  # Visualización de historial
└── register-health-center-modal.tsx

lib/
├── api/                          # Clientes HTTP por módulo
│   ├── axios-client.ts           # Instancia Axios con JWT automático
│   ├── auth.ts
│   ├── identity.ts
│   ├── records.ts
│   ├── access.ts
│   └── explorer.ts
├── contexts/
│   └── auth-context.tsx          # Estado global de autenticación
├── hooks/                        # Custom React hooks
├── services/                     # Lógica de negocio del lado cliente
├── types/                        # Interfaces TypeScript
└── utils/                        # Helpers
```

---

## Autenticación (AuthContext)

El contexto `auth-context.tsx` es el núcleo de la autenticación. Maneja:

**Estado:** `currentUser`, `token`, `isAuthenticated`, `isLoading`, `isInitializing`

**Flujo `loginWithFreighter()`:**
1. Verificar que Freighter esté instalado
2. Obtener `wallet` (clave pública del usuario)
3. Pedir `nonce` al backend (`GET /api/auth/nonce`)
4. Firmar el nonce con Freighter
5. Enviar firma al backend (`POST /api/auth/verify`)
6. Recibir JWT y datos del usuario
7. Persistir sesión en `localStorage`

**Persistencia:** Al montar la app, valida el token guardado vía `GET /api/auth/me`. Si expira o es inválido, cierra sesión automáticamente.

---

## Reglas de Negocio en el Frontend

1. **Redirección por rol:** Tras autenticarse, redirigir según `user.role`:
   - `individual` → `/dashboard/patient`
   - `health_center` → `/dashboard/health-center`
   - `admin` → `/dashboard/admin`

2. **Primer acceso (isNewUser):** Si `user.isNewUser === true`, mostrar `CompleteProfileModal` antes de dejar acceder al dashboard.

3. **Protección de rutas:** Todas las rutas bajo `/dashboard/*` requieren autenticación. Redirigir a `/login` si no hay sesión activa.

4. **Freighter obligatorio:** Si el usuario no tiene Freighter instalado, mostrar instrucciones de instalación. No hay alternativa de autenticación.

5. **Verificación de integridad:** En la vista de detalle de un registro, permitir al usuario recalcular el SHA-256 del documento descargado y compararlo con el hash almacenado.

6. **Accesos expirados:** Mostrar visualmente cuando un `AccessGrant` está expirado (fecha vencida) aunque `active` sea true en el servidor.

7. **Registros on-chain:** Mostrar indicador visual diferenciado para registros con `isOnChain === true` y proveer link a Stellar Expert.

---

## API Clients (lib/api/)

Cada módulo exporta funciones tipadas que encapsulan los endpoints del backend.

**`axios-client.ts`:** Instancia Axios preconfigurada que inyecta el JWT del localStorage en cada request automáticamente via interceptor.

**Convención:** Nunca hacer llamadas `fetch` o `axios` directamente en componentes. Siempre usar las funciones de `lib/api/`.

---

## Convenciones de Código

- **App Router:** Usar Server Components por defecto; `'use client'` solo cuando se requiera estado o efectos.
- **Formularios:** Siempre React Hook Form + Zod para validación. No formularios no controlados.
- **Notificaciones:** Usar `sonner` (`toast.success`, `toast.error`) para feedback de acciones async.
- **Carga:** Mostrar estados de loading en botones y secciones mientras se resuelven promesas.
- **Tipos:** No usar `any`. Definir tipos en `lib/types/`.
- **Componentes UI:** Usar los wrappers de `components/ui/` (basados en Radix), no instalar Radix directamente en páginas.
- **Estilos:** Tailwind CSS exclusivamente. No CSS inline excepto para valores dinámicos imposibles de expresar con clases.
- **Wallet addresses:** Truncar para mostrar: `G...XXXX` (primeros 4 + últimos 4 caracteres).

---

## Variables de Entorno

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```
