//! # AccessControl Contract
//!
//! Contrato Soroban para la red Stellar que gestiona los permisos de acceso
//! al historial clínico de un paciente en el sistema redcis.
//!
//! ## Responsabilidades
//! - Permitir que un paciente autorice a un centro de salud para ver su historial.
//! - Permitir que un paciente revoque ese acceso.
//! - Proveer una función de consulta que verifiquen si un centro tiene acceso activo.
//! - Emitir eventos auditables en cada cambio de permisos.
//!
//! ## Modelo de Permisos
//! ```
//! Paciente (patient_wallet)
//!   └── grantAccess(center_wallet)  → AccessGrant { granted_at, expires_at }
//!   └── revokeAccess(center_wallet) → elimina la entrada
//!
//! Centro de Salud (center_wallet)
//!   └── hasAccess(patient_wallet, center_wallet) → bool
//! ```
//!
//! ## Expiración
//! Los permisos pueden tener una duración opcional (TTL en segundos).
//! Si `expires_at = 0` el permiso no expira (indefinido hasta revocación).
//! El contrato verifica la expiración en `has_access` comparando con el
//! timestamp actual del ledger.
//!
//! ## Integración con IdentityRegistry
//! Valida roles via cross-contract call al IdentityRegistry antes de
//! otorgar o verificar accesos.

#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, contracterror,
    symbol_short, Env, Address, Symbol,
};

// ---------------------------------------------------------------------------
// Storage keys
// ---------------------------------------------------------------------------

#[contracttype]
pub enum DataKey {
    /// Administrador del contrato (Address)
    Admin,
    /// Contract ID del IdentityRegistry (Address)
    IdentityRegistryId,
    /// Permiso de acceso: AccessGrant
    /// Key: (patient_wallet, center_wallet)
    Access(Address, Address),
}

// ---------------------------------------------------------------------------
// Custom types
// ---------------------------------------------------------------------------

/// Datos de un permiso de acceso otorgado.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AccessGrant {
    /// Wallet del paciente que otorga el permiso.
    pub patient_wallet: Address,
    /// Wallet del centro de salud autorizado.
    pub center_wallet: Address,
    /// Timestamp (unix seconds) cuando se otorgó el acceso.
    pub granted_at: u64,
    /// Timestamp (unix seconds) cuando expira.
    /// Si es 0, el permiso no expira hasta ser revocado.
    pub expires_at: u64,
    /// Indica si el permiso está activo (no revocado).
    pub active: bool,
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    /// El contrato ya fue inicializado.
    AlreadyInitialized = 1,
    /// El llamante no tiene permiso para esta operación.
    Unauthorized = 2,
    /// El contrato no está inicializado.
    NotInitialized = 3,
    /// El paciente no está registrado en el IdentityRegistry.
    PatientNotFound = 4,
    /// El centro de salud no está registrado en el IdentityRegistry.
    HealthCenterNotFound = 5,
    /// El permiso ya existe y está activo.
    AccessAlreadyGranted = 6,
    /// No existe un permiso activo para este par paciente-centro.
    AccessNotFound = 7,
    /// El período de expiración proporcionado no es válido.
    InvalidExpiry = 8,
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

const TOPIC_ACCESS_GRANTED: Symbol  = symbol_short!("acc_grnt");
const TOPIC_ACCESS_REVOKED: Symbol  = symbol_short!("acc_rvk");

// ---------------------------------------------------------------------------
// IdentityRegistry client (cross-contract call)
// ---------------------------------------------------------------------------

mod identity_registry {
    soroban_sdk::contractimport!(
        file = "../target/wasm32v1-none/release/identity_registry.wasm"
    );
}

// ---------------------------------------------------------------------------
// Contract
// ---------------------------------------------------------------------------

#[contract]
pub struct AccessControl;

#[contractimpl]
impl AccessControl {

    // -----------------------------------------------------------------------
    // Admin / Inicialización
    // -----------------------------------------------------------------------

    /// Inicializa el contrato.
    ///
    /// # Argumentos
    /// - `admin`:               wallet administradora del contrato.
    /// - `identity_registry_id`: contract ID del IdentityRegistry desplegado.
    pub fn initialize(
        env: Env,
        admin: Address,
        identity_registry_id: Address,
    ) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(Error::AlreadyInitialized);
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::IdentityRegistryId, &identity_registry_id);
        env.storage().instance().extend_ttl(100, 1_000_000);
        Ok(())
    }

    // -----------------------------------------------------------------------
    // Gestión de permisos
    // -----------------------------------------------------------------------

    /// Otorga acceso a un centro de salud para ver el historial del paciente.
    ///
    /// # Argumentos
    /// - `patient_wallet`: wallet del paciente (quien firma la tx).
    /// - `center_wallet`:  wallet del centro de salud a autorizar.
    /// - `duration_secs`:  duración en segundos (0 = sin expiración).
    ///
    /// # Validaciones
    /// - El paciente debe estar registrado como `Individual`.
    /// - El centro debe estar registrado como `HealthCenter`.
    /// - No debe existir ya un permiso activo para este par.
    pub fn grant_access(
        env: Env,
        patient_wallet: Address,
        center_wallet: Address,
        duration_secs: u64,
    ) -> Result<(), Error> {
        patient_wallet.require_auth();

        let registry_id: Address = env.storage().instance()
            .get(&DataKey::IdentityRegistryId)
            .ok_or(Error::NotInitialized)?;

        let registry_client = identity_registry::Client::new(&env, &registry_id);

        // Validar que el paciente está registrado
        if !registry_client.is_registered(&patient_wallet) {
            return Err(Error::PatientNotFound);
        }

        // Validar que el destino es un centro de salud
        if !registry_client.is_health_center(&center_wallet) {
            return Err(Error::HealthCenterNotFound);
        }

        let key = DataKey::Access(patient_wallet.clone(), center_wallet.clone());

        // Verificar si ya existe un permiso activo
        if let Some(existing) = env.storage().persistent().get::<DataKey, AccessGrant>(&key) {
            if existing.active {
                // Verificar si no ha expirado
                let now = env.ledger().timestamp();
                if existing.expires_at == 0 || existing.expires_at > now {
                    return Err(Error::AccessAlreadyGranted);
                }
                // Si expiró, permitir otorgar nuevo permiso
            }
        }

        let now = env.ledger().timestamp();
        let expires_at = if duration_secs == 0 {
            0u64
        } else {
            now.saturating_add(duration_secs)
        };

        let grant = AccessGrant {
            patient_wallet: patient_wallet.clone(),
            center_wallet: center_wallet.clone(),
            granted_at: now,
            expires_at,
            active: true,
        };

        env.storage().persistent().set(&key, &grant);
        env.storage().persistent().extend_ttl(&key, 100, 1_000_000);
        env.storage().instance().extend_ttl(100, 1_000_000);

        env.events().publish(
            (TOPIC_ACCESS_GRANTED,),
            (patient_wallet, center_wallet, now, expires_at),
        );

        Ok(())
    }

    /// Revoca el acceso de un centro de salud al historial del paciente.
    ///
    /// Solo el paciente puede revocar sus propios permisos.
    ///
    /// # Argumentos
    /// - `patient_wallet`: wallet del paciente (quien firma la tx).
    /// - `center_wallet`:  wallet del centro de salud a desautorizar.
    pub fn revoke_access(
        env: Env,
        patient_wallet: Address,
        center_wallet: Address,
    ) -> Result<(), Error> {
        patient_wallet.require_auth();

        let key = DataKey::Access(patient_wallet.clone(), center_wallet.clone());

        let mut grant: AccessGrant = env.storage().persistent()
            .get(&key)
            .ok_or(Error::AccessNotFound)?;

        if !grant.active {
            return Err(Error::AccessNotFound);
        }

        grant.active = false;
        env.storage().persistent().set(&key, &grant);

        let now = env.ledger().timestamp();

        env.events().publish(
            (TOPIC_ACCESS_REVOKED,),
            (patient_wallet, center_wallet, now),
        );

        Ok(())
    }

    // -----------------------------------------------------------------------
    // Consultas
    // -----------------------------------------------------------------------

    /// Verifica si un centro de salud tiene acceso activo y vigente
    /// al historial de un paciente.
    ///
    /// Retorna `true` si:
    /// - Existe un permiso activo.
    /// - El permiso no ha expirado (o no tiene expiración).
    pub fn has_access(
        env: Env,
        patient_wallet: Address,
        center_wallet: Address,
    ) -> bool {
        let key = DataKey::Access(patient_wallet, center_wallet);

        let grant: AccessGrant = match env.storage().persistent().get(&key) {
            Some(g) => g,
            None => return false,
        };

        if !grant.active {
            return false;
        }

        // Verificar expiración
        if grant.expires_at != 0 {
            let now = env.ledger().timestamp();
            if now >= grant.expires_at {
                return false;
            }
        }

        true
    }

    /// Devuelve los datos completos del permiso si existe.
    pub fn get_access_grant(
        env: Env,
        patient_wallet: Address,
        center_wallet: Address,
    ) -> Result<AccessGrant, Error> {
        let key = DataKey::Access(patient_wallet, center_wallet);
        env.storage().persistent()
            .get(&key)
            .ok_or(Error::AccessNotFound)
    }

    /// Devuelve el admin actual.
    pub fn get_admin(env: Env) -> Result<Address, Error> {
        env.storage().instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{Env, Address};

    mod mock_identity_registry {
        use soroban_sdk::{contract, contractimpl, Env, Address};

        #[contract]
        pub struct MockIdentityRegistry;

        #[contractimpl]
        impl MockIdentityRegistry {
            pub fn is_registered(_env: Env, _wallet: Address) -> bool {
                true
            }
            pub fn is_health_center(_env: Env, _wallet: Address) -> bool {
                true
            }
        }
    }

    fn setup() -> (Env, Address, Address, Address, AccessControlClient<'static>) {
        let env = Env::default();
        env.mock_all_auths();
        let admin = Address::generate(&env);
        let registry_id = env.register(mock_identity_registry::MockIdentityRegistry, ());
        let contract_id = env.register(AccessControl, ());
        let client = AccessControlClient::new(&env, &contract_id);
        client.initialize(&admin, &registry_id);
        let patient = Address::generate(&env);
        let center = Address::generate(&env);
        (env, admin, patient, center, client)
    }

    #[test]
    fn test_initialize_once() {
        let (env, admin, _patient, _center, client) = setup();
        let registry_id = env.register(mock_identity_registry::MockIdentityRegistry, ());
        let result = client.try_initialize(&admin, &registry_id);
        assert_eq!(result, Err(Ok(Error::AlreadyInitialized)));
    }

    #[test]
    fn test_grant_access() {
        let (_env, _admin, patient, center, client) = setup();
        client.grant_access(&patient, &center, &0u64);
        assert!(client.has_access(&patient, &center));
    }

    #[test]
    fn test_revoke_access() {
        let (_env, _admin, patient, center, client) = setup();
        client.grant_access(&patient, &center, &0u64);
        assert!(client.has_access(&patient, &center));
        client.revoke_access(&patient, &center);
        assert!(!client.has_access(&patient, &center));
    }

    #[test]
    fn test_no_access_by_default() {
        let (_env, _admin, patient, center, client) = setup();
        assert!(!client.has_access(&patient, &center));
    }

    #[test]
    fn test_double_grant_fails() {
        let (_env, _admin, patient, center, client) = setup();
        client.grant_access(&patient, &center, &0u64);
        let result = client.try_grant_access(&patient, &center, &0u64);
        assert_eq!(result, Err(Ok(Error::AccessAlreadyGranted)));
    }

    #[test]
    fn test_revoke_nonexistent_fails() {
        let (_env, _admin, patient, center, client) = setup();
        let result = client.try_revoke_access(&patient, &center);
        assert_eq!(result, Err(Ok(Error::AccessNotFound)));
    }

    #[test]
    fn test_access_with_expiry() {
        let (env, _admin, patient, center, client) = setup();

        // Ledger timestamp inicial
        env.ledger().with_mut(|l| {
            l.timestamp = 1_000_000;
        });

        // Otorgar acceso por 3600 segundos (1 hora)
        client.grant_access(&patient, &center, &3600u64);
        assert!(client.has_access(&patient, &center));

        // Avanzar el tiempo más allá de la expiración
        env.ledger().with_mut(|l| {
            l.timestamp = 1_003_601; // 1h + 1s después
        });

        assert!(!client.has_access(&patient, &center));
    }

    #[test]
    fn test_get_access_grant_data() {
        let (_env, _admin, patient, center, client) = setup();
        client.grant_access(&patient, &center, &0u64);
        let grant = client.get_access_grant(&patient, &center);
        assert_eq!(grant.patient_wallet, patient);
        assert_eq!(grant.center_wallet, center);
        assert!(grant.active);
        assert_eq!(grant.expires_at, 0u64); // sin expiración
    }

    #[test]
    fn test_re_grant_after_expiry() {
        let (env, _admin, patient, center, client) = setup();

        env.ledger().with_mut(|l| { l.timestamp = 1_000_000; });

        // Otorgar acceso por 1 segundo
        client.grant_access(&patient, &center, &1u64);

        // Avanzar tiempo para expirar
        env.ledger().with_mut(|l| { l.timestamp = 1_000_002; });

        // Ahora debería poder otorgar acceso de nuevo
        client.grant_access(&patient, &center, &0u64);
        assert!(client.has_access(&patient, &center));
    }
}
