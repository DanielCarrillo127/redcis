#!/usr/bin/env bash
# =============================================================================
# invoke.sh — Ejemplos de invocación de contratos redcis en Stellar Testnet
#
# Carga los contract IDs desde .contract-ids.env y ejecuta ejemplos
# de invocación para demostrar el flujo completo del sistema.
#
# Uso:
#   ./scripts/invoke.sh
#
# Prerequisitos:
#   - .contract-ids.env generado por deploy.sh
#   - stellar CLI v25.1.0+
# =============================================================================

set -euo pipefail

# Cargar contract IDs
ENV_FILE=".contract-ids.env"
if [ ! -f "${ENV_FILE}" ]; then
  echo "ERROR: ${ENV_FILE} no encontrado. Ejecuta deploy.sh primero."
  exit 1
fi
source "${ENV_FILE}"

SOURCE_ACCOUNT="deployer"
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_step() { echo -e "\n${YELLOW}>>> $1${NC}"; }
log_ok()   { echo -e "${GREEN}OK${NC} $1"; }

# =============================================================================
# FLUJO 1: Registrar un individuo
# =============================================================================
# Nota: el hash del DNI debe calcularse off-chain.
# Aquí usamos un hash de ejemplo (32 bytes hex = 64 chars).
DNI_HASH="0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20"

log_step "Flujo 1: Obtener rol del admin"
stellar contract invoke \
  --id "${IDENTITY_REGISTRY_ID}" \
  --source-account "${SOURCE_ACCOUNT}" \
  --network "${NETWORK}" \
  -- get_admin

log_step "Flujo 2: Registrar un centro de salud (solo admin puede)"
HEALTH_CENTER_ADDRESS=$(stellar keys address "${SOURCE_ACCOUNT}")

stellar contract invoke \
  --id "${IDENTITY_REGISTRY_ID}" \
  --source-account "${SOURCE_ACCOUNT}" \
  --network "${NETWORK}" \
  -- register_health_center \
  --caller "${ADMIN_ADDRESS}" \
  --wallet "${HEALTH_CENTER_ADDRESS}" \
  --name "\"Clinica Central Bogota\"" \
  --nit "\"900123456-1\"" \
  --country "\"CO\""

log_ok "Centro de salud registrado"

log_step "Flujo 3: Verificar rol del centro de salud"
stellar contract invoke \
  --id "${IDENTITY_REGISTRY_ID}" \
  --source-account "${SOURCE_ACCOUNT}" \
  --network "${NETWORK}" \
  -- get_user_role \
  --wallet "${HEALTH_CENTER_ADDRESS}"

log_step "Flujo 4: Verificar is_health_center"
stellar contract invoke \
  --id "${IDENTITY_REGISTRY_ID}" \
  --source-account "${SOURCE_ACCOUNT}" \
  --network "${NETWORK}" \
  -- is_health_center \
  --wallet "${HEALTH_CENTER_ADDRESS}"

log_step "Flujo 5: Consultar conteo de registros medicos"
stellar contract invoke \
  --id "${MEDICAL_RECORD_REGISTRY_ID}" \
  --source-account "${SOURCE_ACCOUNT}" \
  --network "${NETWORK}" \
  -- get_record_count

echo ""
echo "===== EJEMPLOS COMPLETADOS ====="
echo ""
echo "Para registrar un individuo, el usuario debe:"
echo "  1. Calcular SHA256(DNI + salt) off-chain"
echo "  2. Llamar register_individual con su propia wallet firmando la tx"
echo ""
echo "Para agregar un registro medico, el centro de salud debe:"
echo "  1. Verificar que tiene acceso (has_access en AccessControl)"
echo "  2. Calcular SHA256(documento) off-chain"
echo "  3. Llamar add_record con los metadatos"
echo ""
echo "Ver contratos en Stellar Expert:"
echo "  https://stellar.expert/explorer/testnet/contract/${IDENTITY_REGISTRY_ID}"
echo "  https://stellar.expert/explorer/testnet/contract/${MEDICAL_RECORD_REGISTRY_ID}"
echo "  https://stellar.expert/explorer/testnet/contract/${ACCESS_CONTROL_ID}"
