---
description: Reglas específicas para el frontend de Redcis (Next.js + React)
paths:
  - frontend/**
---

# Reglas Frontend — Redcis

## Componentes
- `'use client'` solo cuando sea estrictamente necesario (estado, efectos, eventos del browser).
- Preferir Server Components por defecto (App Router).
- Componentes UI: usar siempre los wrappers de `components/ui/` (Radix), no instalar Radix directamente en páginas.

## Llamadas HTTP
- Nunca hacer llamadas `fetch` o `axios` directamente en componentes o páginas.
- Siempre usar las funciones de `lib/api/` (auth.ts, records.ts, access.ts, etc.).

## Formularios
- Siempre React Hook Form + Zod. No formularios no controlados.

## Feedback al Usuario
- Toda acción async debe mostrar estado de loading en el botón/sección.
- Usar `sonner` (`toast.success`, `toast.error`) para notificaciones de resultado.
- No usar `alert()` ni `confirm()` nativos del browser.

## Tipos
- No usar `any`. Definir todos los tipos en `lib/types/`.
- No duplicar tipos que ya existen en `lib/types/index.ts`.

## Estilos
- Tailwind CSS exclusivamente para estilos.
- No CSS inline excepto para valores dinámicos imposibles de expresar con clases de Tailwind.
- No crear archivos `.css` adicionales (usar `globals.css` solo para resets/variables).

## Wallets en UI
- Truncar wallets para mostrar: `G...XXXX` (4 primeros caracteres + `...` + 4 últimos).
- Nunca mostrar la wallet completa en un label visible.
