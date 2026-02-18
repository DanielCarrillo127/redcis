#!/usr/bin/env bash
# =============================================================================
# deploy.sh — Script de despliegue de contratos redcis en Stellar Testnet
#
# Uso:
#   ./scripts/deploy.sh [testnet|mainnet]
#
# Prerequisitos:
#   - stellar CLI v25.1.0+   (cargo install --locked stellar-cli@25.1.0)
#   - Rust toolchain con target wasm32v1-none
#   - Identidad "deployer" generada: stellar keys generate deployer --network testnet --fund
#
# Resultado:
#   Escribe los contract IDs en .contract-ids.env para uso posterior.
# =============================================================================

set -euo pipefail

NETWORK="${1:-testnet}"
SOURCE_ACCOUNT="deployer"
BUILD_DIR="target/wasm32v1-none/release"
OUTPUT_FILE=".contract-ids.env"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info()    { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error()   { echo -e "${RED}[ERROR]${NC} $1"; }

# =============================================================================
# 1. Build
# =============================================================================

log_info "Compilando contratos para wasm32v1-none..."
stellar contract build
log_info "Build completado."

# =============================================================================
# 2. Deploy IdentityRegistry
# =============================================================================

log_info "Desplegando IdentityRegistry..."
IDENTITY_REGISTRY_ID=$(stellar contract deploy \
  --wasm "${BUILD_DIR}/identity_registry.wasm" \
  --source-account "${SOURCE_ACCOUNT}" \
  --network "${NETWORK}" \
  2>&1 | tail -1)

log_info "IdentityRegistry ID: ${IDENTITY_REGISTRY_ID}"

# =============================================================================
# 3. Deploy MedicalRecordRegistry
# =============================================================================

log_info "Desplegando MedicalRecordRegistry..."
MEDICAL_RECORD_REGISTRY_ID=$(stellar contract deploy \
  --wasm "${BUILD_DIR}/medical_record_registry.wasm" \
  --source-account "${SOURCE_ACCOUNT}" \
  --network "${NETWORK}" \
  2>&1 | tail -1)

log_info "MedicalRecordRegistry ID: ${MEDICAL_RECORD_REGISTRY_ID}"

# =============================================================================
# 4. Deploy AccessControl
# =============================================================================

log_info "Desplegando AccessControl..."
ACCESS_CONTROL_ID=$(stellar contract deploy \
  --wasm "${BUILD_DIR}/access_control.wasm" \
  --source-account "${SOURCE_ACCOUNT}" \
  --network "${NETWORK}" \
  2>&1 | tail -1)

log_info "AccessControl ID: ${ACCESS_CONTROL_ID}"

# =============================================================================
# 5. Obtener la admin wallet address
# =============================================================================

ADMIN_ADDRESS=$(stellar keys address "${SOURCE_ACCOUNT}")
log_info "Admin address: ${ADMIN_ADDRESS}"

# =============================================================================
# 6. Inicializar IdentityRegistry
# =============================================================================

log_info "Inicializando IdentityRegistry..."
stellar contract invoke \
  --id "${IDENTITY_REGISTRY_ID}" \
  --source-account "${SOURCE_ACCOUNT}" \
  --network "${NETWORK}" \
  -- initialize \
  --admin "${ADMIN_ADDRESS}"

log_info "IdentityRegistry inicializado."

# =============================================================================
# 7. Inicializar MedicalRecordRegistry
# =============================================================================

log_info "Inicializando MedicalRecordRegistry..."
stellar contract invoke \
  --id "${MEDICAL_RECORD_REGISTRY_ID}" \
  --source-account "${SOURCE_ACCOUNT}" \
  --network "${NETWORK}" \
  -- initialize \
  --admin "${ADMIN_ADDRESS}" \
  --identity_registry_id "${IDENTITY_REGISTRY_ID}"

log_info "MedicalRecordRegistry inicializado."

# =============================================================================
# 8. Inicializar AccessControl
# =============================================================================

log_info "Inicializando AccessControl..."
stellar contract invoke \
  --id "${ACCESS_CONTROL_ID}" \
  --source-account "${SOURCE_ACCOUNT}" \
  --network "${NETWORK}" \
  -- initialize \
  --admin "${ADMIN_ADDRESS}" \
  --identity_registry_id "${IDENTITY_REGISTRY_ID}"

log_info "AccessControl inicializado."

# =============================================================================
# 9. Guardar IDs
# =============================================================================

cat > "${OUTPUT_FILE}" <<EOF
# redcis Contract IDs — ${NETWORK} — $(date -u +"%Y-%m-%dT%H:%M:%SZ")
NETWORK=${NETWORK}
ADMIN_ADDRESS=${ADMIN_ADDRESS}
IDENTITY_REGISTRY_ID=${IDENTITY_REGISTRY_ID}
MEDICAL_RECORD_REGISTRY_ID=${MEDICAL_RECORD_REGISTRY_ID}
ACCESS_CONTROL_ID=${ACCESS_CONTROL_ID}
EOF

log_info "Contract IDs guardados en ${OUTPUT_FILE}"
echo ""
log_info "===== DESPLIEGUE COMPLETADO ====="
echo ""
cat "${OUTPUT_FILE}"
