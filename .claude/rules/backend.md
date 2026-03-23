---
description: Reglas específicas para el servicio backend de Redcis (Express + MongoDB)
paths:
  - backend/**
---

# Reglas Backend — Redcis

## Arquitectura de Módulos
- Cada módulo sigue estrictamente: `routes.ts → controller.ts → service.ts`
- La lógica de negocio va **solo** en `service.ts`. Los controllers validan y delegan.
- No hacer queries a MongoDB directamente en controllers ni en routes.

## Validación
- Todos los request bodies deben validarse con **Zod** en el controller antes de pasar al service.
- Nunca confiar en datos del cliente sin validación.

## Manejo de Errores
- Propagar errores con `next(error)` al middleware centralizado.
- No hacer `try/catch` inline en controllers; el middleware de error lo maneja.
- Errores de Soroban no deben tumbar la operación: loggear y continuar con `isOnChain=false`.

## Privacidad
- Nunca retornar `documentPath` en ninguna respuesta de API.
- Nunca retornar `dniHash` en respuestas (es un identificador interno).
- El campo `email` solo se retorna al propio usuario autenticado.

## Archivos
- Nombres de archivo almacenados siempre como `{uuid}.{extension}`.
- Validar tipo MIME y extensión antes de aceptar upload.
- Máximo `MAX_FILE_SIZE_MB` (default: 10MB).

## Soroban
- Si una TX falla, persistir el registro en MongoDB con `isOnChain=false` y continuar.
- No bloquear el flujo principal esperando confirmación de Soroban.
