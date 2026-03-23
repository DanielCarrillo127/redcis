---
name: sync-docs
description: Revisa si los CLAUDE.md y docs/ están desactualizados respecto al código reciente y propone actualizaciones
user-invocable: true
argument-hint: "backend|contracts|frontend|all"
---

# Sync Docs

Revisa los archivos de documentación del proyecto y detecta inconsistencias con el código actual.

## Argumento
`$ARGUMENTS` puede ser: `backend`, `contracts`, `frontend`, o `all` (default).

## Proceso

1. Identifica el scope según `$ARGUMENTS` (si está vacío, usa `all`).

2. Para cada servicio en scope:
   - Lee el `CLAUDE.md` del servicio.
   - Revisa los archivos de código principales del servicio.
   - Compara: ¿hay endpoints, modelos, funciones o convenciones en el código que no están en el CLAUDE.md?
   - Compara: ¿hay información en el CLAUDE.md que ya no corresponde al código actual?

3. Para `all`, también revisa:
   - `CLAUDE.md` raíz — ¿refleja el estado actual del stack y reglas?
   - `docs/` — ¿los flujos documentados coinciden con la implementación real?

4. Presenta un reporte con:
   - Qué está desactualizado (con evidencia del código)
   - Qué falta documentar
   - Propuesta de cambios concretos

5. Pregunta al usuario si desea aplicar los cambios antes de editar nada.
