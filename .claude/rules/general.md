---
description: Reglas generales del proyecto Redcis aplicables a todos los servicios
---

# Reglas Generales — Redcis

## Idioma
- Código (variables, funciones, tipos, comentarios inline): **inglés**
- UI, mensajes al usuario, documentación: **español**
- Commits y PRs: **español o inglés** (consistente dentro del PR)

## Mantenimiento de Documentación
- Al modificar código en `backend/`: revisar si `backend/CLAUDE.md` necesita actualización.
- Al modificar código en `contracts/`: revisar si `contracts/CLAUDE.md` necesita actualización.
- Al modificar código en `frontend/`: revisar si `frontend/CLAUDE.md` necesita actualización.
- Cambios cross-cutting (arquitectura, nuevos servicios, flujos): actualizar `CLAUDE.md` raíz.
- Nunca dejar `docs/` desactualizado respecto al código real.

## Seguridad
- Nunca leer, loggear ni retornar en API: DNI en texto plano, rutas de archivos, sales de hashing.
- Los archivos `.env`, `.env.local`, `.contract-ids.env` nunca van a git.
- No hacer `git push --force` sin confirmación explícita del usuario.
- No `console.log` en código de producción; usar el logger configurado (`morgan` en backend).

## Wallets y Hashes
- Wallets Stellar: siempre formato `G...` (56 caracteres, clave pública).
- IDs de contratos Soroban: siempre formato `C...` (56 caracteres).
- Hashes SHA-256: siempre hex lowercase de 64 caracteres.

## Control de Calidad
- Antes de marcar una tarea completa, verificar que TypeScript compile sin errores (`tsc --noEmit`).
- Los tests de contratos Rust deben pasar (`cargo test`) antes de proponer cambios a los contratos.
