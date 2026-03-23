---
description: Reglas específicas para los smart contracts Soroban de Redcis (Rust)
paths:
  - contracts/**
---

# Reglas Contratos — Redcis

## Inmutabilidad
- Los contratos NO tienen funciones de actualización ni eliminación de registros.
- Antes de agregar cualquier función de modificación, consultar con el usuario: rompe el principio de inmutabilidad del sistema.

## Storage
- Datos críticos (usuarios, registros, grants): siempre en `Persistent` tier.
- Configuración de admin/referencias: `Instance` tier.
- Nunca usar `Temporary` tier para datos que deban persistir entre transacciones.

## Autorización
- Toda función que modifique estado debe verificar autorización con `env.require_auth()`.
- `initialize()` siempre debe verificar que no fue llamada antes (error `AlreadyInitialized`).

## Errores
- Usar `soroban_sdk::contracterror` con códigos explícitos para todos los errores.
- Nunca hacer `panic!` ni `unwrap()` en producción; retornar `Result<T, Error>`.

## Tests
- Toda función pública debe tener al menos un test unitario.
- Ejecutar `cargo test` antes de proponer cambios.
- Los tests deben cubrir el caso de éxito y al menos un caso de error.

## Despliegue
- Nunca modificar los IDs de contratos desplegados en `.contract-ids.env` manualmente.
- Solo actualizar esos IDs después de un redespliegue real y verificado.
- Los scripts de despliegue están en `contracts/scripts/`.
