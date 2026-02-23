#!/bin/bash
#
# Script de despliegue paso a paso para contratos Soroban — redcis
#
# Uso:
#   ./deploy-step-by-step.sh [all|identity|access|records]
#
# Argumentos:
#   all       — (default) compila y despliega los tres contratos en orden
#   identity  — compila y redespliega solo identity-registry
#   access    — compila y redespliega solo access-control
#               (requiere IDENTITY_REGISTRY_CONTRACT_ID en .contract-ids.env)
#   records   — compila y redespliega solo medical-record-registry
#               (requiere IDENTITY_REGISTRY_CONTRACT_ID en .contract-ids.env)
#
# Al redesplegar un contrato individual, los IDs de los demás se preservan
# leyéndolos desde .contract-ids.env antes de ejecutar.
#

set -e

NETWORK="testnet"
DEPLOYER_IDENTITY="deployer"
ENV_FILE=".contract-ids.env"
CONTRACT="${1:-all}"

# Proxy socat para evitar error TLS de rustls con Sectigo Root R46
PROXY_PORT=18080
TESTNET_RPC_HOST="soroban-testnet.stellar.org"
TESTNET_PASSPHRASE="Test SDF Network ; September 2015"
SOCAT_PID=""
PROXY_SCRIPT=""

# ─────────────────────────────────────────────────────────────────────────────
# Validar argumento
# ─────────────────────────────────────────────────────────────────────────────

case "$CONTRACT" in
  all|identity|access|records) ;;
  *)
    echo "Uso: $0 [all|identity|access|records]"
    echo ""
    echo "  all      — despliega los tres contratos"
    echo "  identity — redespliega solo identity-registry"
    echo "  access   — redespliega solo access-control"
    echo "  records  — redespliega solo medical-record-registry"
    exit 1
    ;;
esac

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Despliegue Soroban — redcis  [${CONTRACT}]"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# Prerequisitos
# ─────────────────────────────────────────────────────────────────────────────

if ! command -v stellar &> /dev/null; then
    echo "Error: stellar CLI no encontrado"
    echo "Instalar con: cargo install --locked stellar-cli --features opt"
    exit 1
fi
echo "stellar CLI: $(stellar --version)"

if ! command -v python3 &> /dev/null; then
    echo "Error: python3 no encontrado (necesario para el proxy TLS)"
    exit 1
fi

if ! stellar keys address "$DEPLOYER_IDENTITY" &> /dev/null; then
    echo ""
    echo "Error: no existe la identidad '${DEPLOYER_IDENTITY}'"
    echo "Crear con:"
    echo "  stellar keys generate ${DEPLOYER_IDENTITY} --network ${NETWORK}"
    echo "  stellar keys fund     ${DEPLOYER_IDENTITY} --network ${NETWORK}"
    exit 1
fi

ADMIN_ADDRESS=$(stellar keys address "$DEPLOYER_IDENTITY")
echo "Admin address: $ADMIN_ADDRESS"
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# Cargar IDs existentes (preservar contratos no afectados)
# ─────────────────────────────────────────────────────────────────────────────

IDENTITY_CONTRACT_ID=""
ACCESS_CONTRACT_ID=""
RECORDS_CONTRACT_ID=""

if [ -f "$ENV_FILE" ]; then
    # shellcheck disable=SC1090
    source "$ENV_FILE"
    IDENTITY_CONTRACT_ID="${IDENTITY_REGISTRY_CONTRACT_ID:-}"
    ACCESS_CONTRACT_ID="${ACCESS_CONTROL_CONTRACT_ID:-}"
    RECORDS_CONTRACT_ID="${MEDICAL_RECORD_REGISTRY_CONTRACT_ID:-}"
fi

# Verificar dependencias para despliegue individual
if [ "$CONTRACT" = "access" ] && [ -z "$IDENTITY_CONTRACT_ID" ]; then
    echo "Error: se necesita IDENTITY_REGISTRY_CONTRACT_ID en ${ENV_FILE}"
    echo "Ejecuta primero: $0 identity"
    exit 1
fi
if [ "$CONTRACT" = "records" ] && [ -z "$IDENTITY_CONTRACT_ID" ]; then
    echo "Error: se necesita IDENTITY_REGISTRY_CONTRACT_ID en ${ENV_FILE}"
    echo "Ejecuta primero: $0 identity"
    exit 1
fi

# ─────────────────────────────────────────────────────────────────────────────
# Proxy socat (workaround TLS rustls / Sectigo Root R46)
# ─────────────────────────────────────────────────────────────────────────────

start_proxy() {
    # Proxy HTTP→HTTPS en Python: reescribe el header Host para que el servidor
    # de Stellar no rechace la petición con 403 (socat no modifica headers).
    PROXY_SCRIPT=$(mktemp /tmp/soroban_proxy.XXXXXX.py)
    cat > "$PROXY_SCRIPT" << 'PYEOF'
# Proxy HTTP local que reenvía peticiones a soroban-testnet usando curl del sistema.
# curl en macOS usa el TLS/CA del sistema operativo (incluye Sectigo Root R46),
# solucionando el problema de rustls que usa su propio bundle de CAs.
import sys, subprocess, http.server

TARGET_HOST = "soroban-testnet.stellar.org"
TARGET_URL  = f"https://{TARGET_HOST}"

class Proxy(http.server.BaseHTTPRequestHandler):
    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length)
        ct   = self.headers.get("Content-Type", "application/json")

        result = subprocess.run(
            [
                "curl", "-s", "-S",
                "-X", "POST",
                "-H", f"Content-Type: {ct}",
                "-H", f"Host: {TARGET_HOST}",
                "--data-binary", "@-",
                "-w", "\n__STATUS__%{http_code}",
                TARGET_URL,
            ],
            input=body,
            capture_output=True,
        )

        raw = result.stdout
        marker = b"\n__STATUS__"
        idx = raw.rfind(marker)
        if idx >= 0:
            data        = raw[:idx]
            status_code = int(raw[idx + len(marker):].strip())
        else:
            data        = raw
            status_code = 500

        self.send_response(status_code)
        self.send_header("Content-Type",   "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, *_): pass

port = int(sys.argv[1]) if len(sys.argv) > 1 else 18080
http.server.HTTPServer(("127.0.0.1", port), Proxy).serve_forever()
PYEOF

    echo "Iniciando proxy Python en localhost:${PROXY_PORT} → https://${TESTNET_RPC_HOST} ..."
    python3 "$PROXY_SCRIPT" "$PROXY_PORT" &
    SOCAT_PID=$!

    # Esperar hasta que el puerto esté escuchando (máx 5 s)
    local attempts=0
    while ! nc -z 127.0.0.1 "$PROXY_PORT" 2>/dev/null; do
        sleep 0.2
        attempts=$((attempts + 1))
        if [ "$attempts" -ge 25 ]; then
            echo "Error: proxy no levantó en 5 segundos"
            kill "$SOCAT_PID" 2>/dev/null
            exit 1
        fi
    done
    echo "Proxy listo (PID=$SOCAT_PID)"
    echo ""
}

cleanup() {
    if [ -n "$SOCAT_PID" ]; then
        kill "$SOCAT_PID" 2>/dev/null || true
    fi
    [ -n "$PROXY_SCRIPT" ] && rm -f "$PROXY_SCRIPT"
}
trap cleanup EXIT

# ─────────────────────────────────────────────────────────────────────────────
# Rutas a los WASMs
# ─────────────────────────────────────────────────────────────────────────────

cd "$(dirname "$0")/.."

IDENTITY_WASM="target/wasm32v1-none/release/identity_registry.wasm"
ACCESS_WASM="target/wasm32v1-none/release/access_control.wasm"
RECORDS_WASM="target/wasm32v1-none/release/medical_record_registry.wasm"

# ─────────────────────────────────────────────────────────────────────────────
# Funciones de compilación
# ─────────────────────────────────────────────────────────────────────────────

build_identity() {
    echo "Compilando identity-registry..."
    stellar contract build --package identity-registry
    echo "identity-registry compilado"
    echo ""
}

build_access() {
    echo "Compilando access-control..."
    stellar contract build --package access-control
    echo "access-control compilado"
    echo ""
}

build_records() {
    echo "Compilando medical-record-registry..."
    stellar contract build --package medical-record-registry
    echo "medical-record-registry compilado"
    echo ""
}

# ─────────────────────────────────────────────────────────────────────────────
# Funciones de despliegue
# ─────────────────────────────────────────────────────────────────────────────

deploy_identity() {
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Desplegando identity-registry..."
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    if [ ! -f "$IDENTITY_WASM" ]; then
        echo "Error: no se encuentra $IDENTITY_WASM"
        exit 1
    fi

    IDENTITY_CONTRACT_ID=$(stellar contract deploy \
        --wasm "$IDENTITY_WASM" \
        --source "$DEPLOYER_IDENTITY" \
        --rpc-url "http://localhost:${PROXY_PORT}" \
        --network-passphrase "$TESTNET_PASSPHRASE")

    echo "Contract ID: $IDENTITY_CONTRACT_ID"
    echo ""

    echo "Inicializando identity-registry (admin=$ADMIN_ADDRESS)..."
    stellar contract invoke \
        --id "$IDENTITY_CONTRACT_ID" \
        --source "$DEPLOYER_IDENTITY" \
        --rpc-url "http://localhost:${PROXY_PORT}" \
        --network-passphrase "$TESTNET_PASSPHRASE" \
        -- \
        initialize \
        --admin "$ADMIN_ADDRESS"

    echo "identity-registry inicializado"
    echo ""
}

deploy_access() {
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Desplegando access-control..."
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    if [ ! -f "$ACCESS_WASM" ]; then
        echo "Error: no se encuentra $ACCESS_WASM"
        exit 1
    fi

    ACCESS_CONTRACT_ID=$(stellar contract deploy \
        --wasm "$ACCESS_WASM" \
        --source "$DEPLOYER_IDENTITY" \
        --rpc-url "http://localhost:${PROXY_PORT}" \
        --network-passphrase "$TESTNET_PASSPHRASE")

    echo "Contract ID: $ACCESS_CONTRACT_ID"
    echo ""

    echo "Inicializando access-control..."
    echo "  admin=$ADMIN_ADDRESS"
    echo "  identity_registry_id=$IDENTITY_CONTRACT_ID"
    stellar contract invoke \
        --id "$ACCESS_CONTRACT_ID" \
        --source "$DEPLOYER_IDENTITY" \
        --rpc-url "http://localhost:${PROXY_PORT}" \
        --network-passphrase "$TESTNET_PASSPHRASE" \
        -- \
        initialize \
        --admin "$ADMIN_ADDRESS" \
        --identity_registry_id "$IDENTITY_CONTRACT_ID"

    echo "access-control inicializado"
    echo ""
}

deploy_records() {
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Desplegando medical-record-registry..."
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    if [ ! -f "$RECORDS_WASM" ]; then
        echo "Error: no se encuentra $RECORDS_WASM"
        exit 1
    fi

    RECORDS_CONTRACT_ID=$(stellar contract deploy \
        --wasm "$RECORDS_WASM" \
        --source "$DEPLOYER_IDENTITY" \
        --rpc-url "http://localhost:${PROXY_PORT}" \
        --network-passphrase "$TESTNET_PASSPHRASE")

    echo "Contract ID: $RECORDS_CONTRACT_ID"
    echo ""

    echo "Inicializando medical-record-registry..."
    echo "  admin=$ADMIN_ADDRESS"
    echo "  identity_registry_id=$IDENTITY_CONTRACT_ID"
    stellar contract invoke \
        --id "$RECORDS_CONTRACT_ID" \
        --source "$DEPLOYER_IDENTITY" \
        --rpc-url "http://localhost:${PROXY_PORT}" \
        --network-passphrase "$TESTNET_PASSPHRASE" \
        -- \
        initialize \
        --admin "$ADMIN_ADDRESS" \
        --identity_registry_id "$IDENTITY_CONTRACT_ID"

    echo "medical-record-registry inicializado"
    echo ""
}

# ─────────────────────────────────────────────────────────────────────────────
# Guardar IDs (preserva los valores existentes para contratos no afectados)
# ─────────────────────────────────────────────────────────────────────────────

save_env() {
    cat > "$ENV_FILE" << EOF
# Contract IDs desplegados en ${NETWORK}
# Generado: $(date)
# Ultima operacion: ${CONTRACT}

NETWORK=${NETWORK}
ADMIN_ADDRESS=${ADMIN_ADDRESS}

IDENTITY_REGISTRY_CONTRACT_ID=${IDENTITY_CONTRACT_ID}
ACCESS_CONTROL_CONTRACT_ID=${ACCESS_CONTRACT_ID}
MEDICAL_RECORD_REGISTRY_CONTRACT_ID=${RECORDS_CONTRACT_ID}
EOF

    echo "IDs guardados en: $ENV_FILE"
    echo ""
    cat "$ENV_FILE"
    echo ""
}

# ─────────────────────────────────────────────────────────────────────────────
# Ejecución según argumento
# ─────────────────────────────────────────────────────────────────────────────

case "$CONTRACT" in

  all)
    build_identity
    build_access
    build_records
    start_proxy
    deploy_identity
    deploy_access
    deploy_records
    save_env
    ;;

  identity)
    build_identity
    start_proxy
    deploy_identity
    save_env
    ;;

  access)
    build_access
    start_proxy
    deploy_access
    save_env
    ;;

  records)
    build_records
    start_proxy
    deploy_records
    save_env
    ;;

esac

# ─────────────────────────────────────────────────────────────────────────────
# Resumen
# ─────────────────────────────────────────────────────────────────────────────

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Despliegue completado"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  Network : $NETWORK"
echo "  Admin   : $ADMIN_ADDRESS"
echo ""
[ -n "$IDENTITY_CONTRACT_ID" ] && \
    echo "  identity-registry         : $IDENTITY_CONTRACT_ID"
[ -n "$ACCESS_CONTRACT_ID" ] && \
    echo "  access-control            : $ACCESS_CONTRACT_ID"
[ -n "$RECORDS_CONTRACT_ID" ] && \
    echo "  medical-record-registry   : $RECORDS_CONTRACT_ID"
echo ""
[ -n "$IDENTITY_CONTRACT_ID" ] && \
    echo "  https://stellar.expert/explorer/${NETWORK}/contract/${IDENTITY_CONTRACT_ID}"
[ -n "$ACCESS_CONTRACT_ID" ] && \
    echo "  https://stellar.expert/explorer/${NETWORK}/contract/${ACCESS_CONTRACT_ID}"
[ -n "$RECORDS_CONTRACT_ID" ] && \
    echo "  https://stellar.expert/explorer/${NETWORK}/contract/${RECORDS_CONTRACT_ID}"
echo ""
echo "Variables para el backend (.env):"
echo ""
[ -n "$IDENTITY_CONTRACT_ID" ] && \
    echo "  IDENTITY_REGISTRY_CONTRACT_ID=${IDENTITY_CONTRACT_ID}"
[ -n "$ACCESS_CONTRACT_ID" ] && \
    echo "  ACCESS_CONTROL_CONTRACT_ID=${ACCESS_CONTRACT_ID}"
[ -n "$RECORDS_CONTRACT_ID" ] && \
    echo "  MEDICAL_RECORD_REGISTRY_CONTRACT_ID=${RECORDS_CONTRACT_ID}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
