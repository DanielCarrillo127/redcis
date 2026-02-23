#!/bin/bash
#
# Script de pruebas para contratos desplegados
# Uso: ./test-contracts.sh
#

set -e

# Cargar IDs de contratos
if [ ! -f ".contract-ids.env" ]; then
    echo "❌ Error: No se encuentra .contract-ids.env"
    echo "Ejecuta primero: ./scripts/deploy-step-by-step.sh"
    exit 1
fi

source .contract-ids.env

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 Probando contratos desplegados"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Network: $NETWORK"
echo "Admin: $ADMIN_ADDRESS"
echo ""

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# TEST 1: Verificar que get_admin funciona
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 1: Verificar admin de identity-registry"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

REGISTRY_ADMIN=$(stellar contract invoke \
    --id "$IDENTITY_REGISTRY_CONTRACT_ID" \
    --source deployer \
    --network "$NETWORK" \
    -- \
    get_admin | tr -d '"')

echo "Admin registrado: $REGISTRY_ADMIN"

if [ "$REGISTRY_ADMIN" != "$ADMIN_ADDRESS" ]; then
    echo "❌ Error: Admin no coincide"
    echo "   Esperado: $ADMIN_ADDRESS"
    echo "   Obtenido: $REGISTRY_ADMIN"
    exit 1
fi

echo "✅ Admin correcto"
echo ""

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# TEST 2: Registrar un paciente de prueba
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 2: Registrar individuo de prueba"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Generar wallet de prueba si no existe
if ! stellar keys address test-patient &> /dev/null; then
    echo "Generando wallet de prueba..."
    stellar keys generate test-patient --network "$NETWORK"
fi

PATIENT_WALLET=$(stellar keys address test-patient)
echo "Patient wallet: $PATIENT_WALLET"

# Fondear si es necesario
echo "Fondeando wallet de prueba..."
stellar keys fund test-patient --network "$NETWORK" || true

# Generar hash de DNI de prueba (SHA256 de "12345678")
DNI_HASH="7509e5bda0c762d2bac7f90d758b5b2263fa01ccbc542ab5e3df163be08e6ca9"

echo "Registrando individuo..."
stellar contract invoke \
    --id "$IDENTITY_REGISTRY_CONTRACT_ID" \
    --source test-patient \
    --network "$NETWORK" \
    -- \
    register_individual \
    --wallet "$PATIENT_WALLET" \
    --dni_hash "$DNI_HASH" \
    || echo "⚠️  Ya registrado (esperado si ejecutas el test varias veces)"

echo ""

# Verificar registro
echo "Verificando registro..."
IS_REGISTERED=$(stellar contract invoke \
    --id "$IDENTITY_REGISTRY_CONTRACT_ID" \
    --source deployer \
    --network "$NETWORK" \
    -- \
    is_registered \
    --wallet "$PATIENT_WALLET" | tr -d '"')

echo "is_registered: $IS_REGISTERED"

if [ "$IS_REGISTERED" = "true" ]; then
    echo "✅ Paciente registrado correctamente"
else
    echo "❌ Error: Paciente no registrado"
    exit 1
fi

echo ""

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# TEST 3: Registrar un Health Center
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 3: Registrar Health Center de prueba"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Generar wallet de HC si no existe
if ! stellar keys address test-hc &> /dev/null; then
    echo "Generando wallet de Health Center..."
    stellar keys generate test-hc --network "$NETWORK"
fi

HC_WALLET=$(stellar keys address test-hc)
echo "HC wallet: $HC_WALLET"

# Fondear si es necesario
stellar keys fund test-hc --network "$NETWORK" || true

echo "Registrando Health Center (como admin)..."
stellar contract invoke \
    --id "$IDENTITY_REGISTRY_CONTRACT_ID" \
    --source deployer \
    --network "$NETWORK" \
    -- \
    register_health_center \
    --caller "$ADMIN_ADDRESS" \
    --wallet "$HC_WALLET" \
    --name "Clinica Test" \
    --nit "900123456-1" \
    --country "CO" \
    || echo "⚠️  Ya registrado (esperado si ejecutas el test varias veces)"

echo ""

# Verificar que es HC
IS_HC=$(stellar contract invoke \
    --id "$IDENTITY_REGISTRY_CONTRACT_ID" \
    --source deployer \
    --network "$NETWORK" \
    -- \
    is_health_center \
    --wallet "$HC_WALLET" | tr -d '"')

echo "is_health_center: $IS_HC"

if [ "$IS_HC" = "true" ]; then
    echo "✅ Health Center registrado correctamente"
else
    echo "❌ Error: Health Center no registrado"
    exit 1
fi

echo ""

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# TEST 4: Otorgar acceso
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 4: Otorgar acceso de paciente a HC"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "Otorgando acceso (paciente → HC)..."
stellar contract invoke \
    --id "$ACCESS_CONTROL_CONTRACT_ID" \
    --source test-patient \
    --network "$NETWORK" \
    -- \
    grant_access \
    --patient_wallet "$PATIENT_WALLET" \
    --center_wallet "$HC_WALLET" \
    --duration_secs 0 \
    || echo "⚠️  Acceso ya otorgado (esperado si ejecutas el test varias veces)"

echo ""

# Verificar acceso
HAS_ACCESS=$(stellar contract invoke \
    --id "$ACCESS_CONTROL_CONTRACT_ID" \
    --source deployer \
    --network "$NETWORK" \
    -- \
    has_access \
    --patient_wallet "$PATIENT_WALLET" \
    --center_wallet "$HC_WALLET" | tr -d '"')

echo "has_access: $HAS_ACCESS"

if [ "$HAS_ACCESS" = "true" ]; then
    echo "✅ Acceso otorgado correctamente"
else
    echo "❌ Error: Acceso no otorgado"
    exit 1
fi

echo ""

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# RESUMEN
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 Todas las pruebas pasaron"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Wallets de prueba creadas:"
echo ""
echo "  Paciente:       $PATIENT_WALLET"
echo "  Health Center:  $HC_WALLET"
echo ""
echo "Puedes usarlas en el frontend para desarrollo."
echo ""
