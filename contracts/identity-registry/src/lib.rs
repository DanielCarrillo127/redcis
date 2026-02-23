//! # IdentityRegistry Contract
//!
//! Contrato Soroban para la red Stellar que gestiona la identidad de usuarios
//! del sistema de Historia Clínica Descentralizada (redcis).
//!
//! ## Responsabilidades
//! - Registrar individuos (personas naturales) vinculando un hash de DNI a su wallet.
//! - Registrar centros de salud con metadata institucional.
//! - Consultar el rol y datos de un usuario dado su wallet.
//! - Administrar el contrato mediante un rol de admin.
//!
//! ## Modelo de Privacidad
//! El DNI nunca se almacena en texto claro. El cliente debe calcular:
//!   `hash_dni = SHA256(DNI + salt)` off-chain y enviar solo el hash.
//! El salt se guarda fuera de la cadena (backend/frontend) y sirve para
//! verificar el DNI en consultas posteriores sin revelar el valor real.

#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, contracterror,
    symbol_short, Env, Address, String, Symbol, BytesN,
};

// ---------------------------------------------------------------------------
// Storage keys
// ---------------------------------------------------------------------------

#[contracttype]
pub enum DataKey {
    /// Administrador del contrato (Address)
    Admin,
    /// Rol asignado a una wallet (UserRole)
    Role(Address),
    /// Datos de identidad de un individuo (IndividualData)
    Individual(Address),
    /// Datos de un centro de salud (HealthCenterData)
    HealthCenter(Address),
    /// Lookup inverso: hash_dni (BytesN<32>) → wallet (Address)
    DniToWallet(BytesN<32>),
}

// ---------------------------------------------------------------------------
// Custom types
// ---------------------------------------------------------------------------

/// Rol de un usuario registrado en el sistema.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum UserRole {
    /// Persona natural dueña de su historial clínico.
    Individual,
    /// Centro de salud habilitado para registrar eventos clínicos.
    HealthCenter,
}

/// Datos on-chain de una persona natural.
/// El DNI real nunca se almacena; solo el hash.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct IndividualData {
    /// Wallet Stellar del individuo.
    pub wallet: Address,
    /// SHA256(DNI + salt) — calculado off-chain por el cliente.
    pub dni_hash: BytesN<32>,
    /// Timestamp de registro (unix seconds, provisto por el ledger).
    pub registered_at: u64,
    /// Indica si el registro está activo.
    pub active: bool,
}

/// Datos on-chain de un centro de salud.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct HealthCenterData {
    /// Wallet institucional del centro.
    pub wallet: Address,
    /// Nombre del centro (máx 64 chars, almacenado como Soroban String).
    pub name: String,
    /// Identificador fiscal / NIT (hash o código público, no sensible).
    pub nit: String,
    /// País de operación (código ISO-3166 α-2, ej. "CO").
    pub country: String,
    /// Timestamp de registro.
    pub registered_at: u64,
    /// Estado del centro.
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
    /// La wallet ya está registrada.
    AlreadyRegistered = 3,
    /// El hash de DNI ya está vinculado a otra wallet.
    DniHashAlreadyUsed = 4,
    /// El usuario no existe en el registro.
    UserNotFound = 5,
    /// El contrato no está inicializado.
    NotInitialized = 6,
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

const TOPIC_INDIVIDUAL_REGISTERED: Symbol  = symbol_short!("ind_reg");
const TOPIC_HEALTHCENTER_REGISTERED: Symbol = symbol_short!("hc_reg");
const TOPIC_ADMIN_CHANGED: Symbol           = symbol_short!("adm_chg");

// ---------------------------------------------------------------------------
// Contract
// ---------------------------------------------------------------------------

#[contract]
pub struct IdentityRegistry;

#[contractimpl]
impl IdentityRegistry {

    // -----------------------------------------------------------------------
    // Admin
    // -----------------------------------------------------------------------

    /// Inicializa el contrato estableciendo el administrador.
    /// Solo puede llamarse una vez.
    pub fn initialize(env: Env, admin: Address) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(Error::AlreadyInitialized);
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().extend_ttl(100, 1_000_000);
        Ok(())
    }

    /// Transfiere el rol de admin a una nueva wallet.
    /// Solo el admin actual puede invocar este método.
    pub fn set_admin(env: Env, caller: Address, new_admin: Address) -> Result<(), Error> {
        caller.require_auth();
        Self::assert_admin(&env, &caller)?;
        env.storage().instance().set(&DataKey::Admin, &new_admin);
        env.events().publish(
            (TOPIC_ADMIN_CHANGED,),
            (caller, new_admin),
        );
        Ok(())
    }

    /// Devuelve el administrador actual.
    pub fn get_admin(env: Env) -> Result<Address, Error> {
        env.storage().instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)
    }

    // -----------------------------------------------------------------------
    // Registro de individuos
    // -----------------------------------------------------------------------

    /// Registra una persona natural.
    ///
    /// # Argumentos
    /// - `wallet`:   dirección Stellar del individuo (quien firma la tx).
    /// - `dni_hash`: SHA256(DNI + salt) calculado off-chain.
    ///
    /// La wallet debe firmar la transacción (`require_auth`).
    pub fn register_individual(
        env: Env,
        wallet: Address,
        dni_hash: BytesN<32>,
    ) -> Result<(), Error> {
        wallet.require_auth();

        // Verificar que la wallet no esté ya registrada
        if env.storage().persistent().has(&DataKey::Role(wallet.clone())) {
            return Err(Error::AlreadyRegistered);
        }

        // Verificar que el hash de DNI no esté en uso
        if env.storage().persistent().has(&DataKey::DniToWallet(dni_hash.clone())) {
            return Err(Error::DniHashAlreadyUsed);
        }

        let timestamp = env.ledger().timestamp();

        let data = IndividualData {
            wallet: wallet.clone(),
            dni_hash: dni_hash.clone(),
            registered_at: timestamp,
            active: true,
        };

        // Almacenar datos del individuo
        env.storage().persistent().set(&DataKey::Individual(wallet.clone()), &data);
        env.storage().persistent().extend_ttl(&DataKey::Individual(wallet.clone()), 100, 1_000_000);

        // Almacenar rol
        env.storage().persistent().set(&DataKey::Role(wallet.clone()), &UserRole::Individual);
        env.storage().persistent().extend_ttl(&DataKey::Role(wallet.clone()), 100, 1_000_000);

        // Lookup inverso DNI → Wallet
        env.storage().persistent().set(&DataKey::DniToWallet(dni_hash.clone()), &wallet);
        env.storage().persistent().extend_ttl(&DataKey::DniToWallet(dni_hash), 100, 1_000_000);

        // Extender TTL del contrato
        env.storage().instance().extend_ttl(100, 1_000_000);

        // Emitir evento
        env.events().publish(
            (TOPIC_INDIVIDUAL_REGISTERED,),
            (wallet, timestamp),
        );

        Ok(())
    }

    // -----------------------------------------------------------------------
    // Registro de centros de salud
    // -----------------------------------------------------------------------

    /// Registra un centro de salud.
    ///
    /// Solo el admin del contrato puede registrar centros de salud,
    /// garantizando que solo entidades verificadas operen en el sistema.
    ///
    /// # Argumentos
    /// - `caller`:  wallet del admin (quien firma la tx).
    /// - `wallet`:  wallet institucional del centro de salud.
    /// - `name`:    nombre del centro.
    /// - `nit`:     identificador fiscal / NIT.
    /// - `country`: código de país (ej. "CO").
    pub fn register_health_center(
        env: Env,
        caller: Address,
        wallet: Address,
        name: String,
        nit: String,
        country: String,
    ) -> Result<(), Error> {
        caller.require_auth();
        Self::assert_admin(&env, &caller)?;

        // Verificar que la wallet no esté ya registrada
        if env.storage().persistent().has(&DataKey::Role(wallet.clone())) {
            return Err(Error::AlreadyRegistered);
        }

        let timestamp = env.ledger().timestamp();

        let data = HealthCenterData {
            wallet: wallet.clone(),
            name,
            nit,
            country,
            registered_at: timestamp,
            active: true,
        };

        env.storage().persistent().set(&DataKey::HealthCenter(wallet.clone()), &data);
        env.storage().persistent().extend_ttl(&DataKey::HealthCenter(wallet.clone()), 100, 1_000_000);

        env.storage().persistent().set(&DataKey::Role(wallet.clone()), &UserRole::HealthCenter);
        env.storage().persistent().extend_ttl(&DataKey::Role(wallet.clone()), 100, 1_000_000);

        env.storage().instance().extend_ttl(100, 1_000_000);

        env.events().publish(
            (TOPIC_HEALTHCENTER_REGISTERED,),
            (wallet, timestamp),
        );

        Ok(())
    }

    // -----------------------------------------------------------------------
    // Gestión de usuarios (Admin)
    // -----------------------------------------------------------------------

    /// Desactiva un usuario (soft delete).
    /// Solo el admin puede llamar esta función.
    pub fn deactivate_user(
        env: Env,
        caller: Address,
        wallet: Address,
    ) -> Result<(), Error> {
        caller.require_auth();
        Self::assert_admin(&env, &caller)?;

        let role: UserRole = env.storage().persistent()
            .get(&DataKey::Role(wallet.clone()))
            .ok_or(Error::UserNotFound)?;

        match role {
            UserRole::Individual => {
                let mut data: IndividualData = env.storage().persistent()
                    .get(&DataKey::Individual(wallet.clone()))
                    .ok_or(Error::UserNotFound)?;
                data.active = false;
                env.storage().persistent().set(&DataKey::Individual(wallet.clone()), &data);
                env.storage().persistent().extend_ttl(&DataKey::Individual(wallet), 100, 1_000_000);
            }
            UserRole::HealthCenter => {
                let mut data: HealthCenterData = env.storage().persistent()
                    .get(&DataKey::HealthCenter(wallet.clone()))
                    .ok_or(Error::UserNotFound)?;
                data.active = false;
                env.storage().persistent().set(&DataKey::HealthCenter(wallet.clone()), &data);
                env.storage().persistent().extend_ttl(&DataKey::HealthCenter(wallet), 100, 1_000_000);
            }
        }

        Ok(())
    }

    /// Reactiva un usuario previamente desactivado.
    /// Solo el admin puede llamar esta función.
    pub fn activate_user(
        env: Env,
        caller: Address,
        wallet: Address,
    ) -> Result<(), Error> {
        caller.require_auth();
        Self::assert_admin(&env, &caller)?;

        let role: UserRole = env.storage().persistent()
            .get(&DataKey::Role(wallet.clone()))
            .ok_or(Error::UserNotFound)?;

        match role {
            UserRole::Individual => {
                let mut data: IndividualData = env.storage().persistent()
                    .get(&DataKey::Individual(wallet.clone()))
                    .ok_or(Error::UserNotFound)?;
                data.active = true;
                env.storage().persistent().set(&DataKey::Individual(wallet.clone()), &data);
                env.storage().persistent().extend_ttl(&DataKey::Individual(wallet), 100, 1_000_000);
            }
            UserRole::HealthCenter => {
                let mut data: HealthCenterData = env.storage().persistent()
                    .get(&DataKey::HealthCenter(wallet.clone()))
                    .ok_or(Error::UserNotFound)?;
                data.active = true;
                env.storage().persistent().set(&DataKey::HealthCenter(wallet.clone()), &data);
                env.storage().persistent().extend_ttl(&DataKey::HealthCenter(wallet), 100, 1_000_000);
            }
        }

        Ok(())
    }

    // -----------------------------------------------------------------------
    // Consultas
    // -----------------------------------------------------------------------

    /// Devuelve el rol de un usuario dado su wallet.
    pub fn get_user_role(env: Env, wallet: Address) -> Result<UserRole, Error> {
        env.storage().persistent()
            .get(&DataKey::Role(wallet))
            .ok_or(Error::UserNotFound)
    }

    /// Devuelve los datos de un individuo.
    pub fn get_individual(env: Env, wallet: Address) -> Result<IndividualData, Error> {
        env.storage().persistent()
            .get(&DataKey::Individual(wallet))
            .ok_or(Error::UserNotFound)
    }

    /// Devuelve los datos de un centro de salud.
    pub fn get_health_center(env: Env, wallet: Address) -> Result<HealthCenterData, Error> {
        env.storage().persistent()
            .get(&DataKey::HealthCenter(wallet))
            .ok_or(Error::UserNotFound)
    }

    /// Resuelve un hash de DNI a la wallet del individuo.
    /// Utilizado por centros de salud para encontrar al paciente por DNI.
    pub fn resolve_dni(env: Env, dni_hash: BytesN<32>) -> Result<Address, Error> {
        env.storage().persistent()
            .get(&DataKey::DniToWallet(dni_hash))
            .ok_or(Error::UserNotFound)
    }

    /// Verifica si una wallet está registrada Y activa.
    pub fn is_registered(env: Env, wallet: Address) -> bool {
        if let Some(role) = env.storage().persistent().get::<DataKey, UserRole>(&DataKey::Role(wallet.clone())) {
            match role {
                UserRole::Individual => {
                    if let Some(data) = env.storage().persistent().get::<DataKey, IndividualData>(&DataKey::Individual(wallet)) {
                        return data.active;
                    }
                }
                UserRole::HealthCenter => {
                    if let Some(data) = env.storage().persistent().get::<DataKey, HealthCenterData>(&DataKey::HealthCenter(wallet)) {
                        return data.active;
                    }
                }
            }
        }
        false
    }

    /// Verifica si una wallet tiene el rol de centro de salud Y está activa.
    pub fn is_health_center(env: Env, wallet: Address) -> bool {
        if let Some(role) = env.storage().persistent().get::<DataKey, UserRole>(&DataKey::Role(wallet.clone())) {
            if role == UserRole::HealthCenter {
                if let Some(data) = env.storage().persistent().get::<DataKey, HealthCenterData>(&DataKey::HealthCenter(wallet)) {
                    return data.active;
                }
            }
        }
        false
    }

    // -----------------------------------------------------------------------
    // Helpers privados
    // -----------------------------------------------------------------------

    fn assert_admin(env: &Env, caller: &Address) -> Result<(), Error> {
        let admin: Address = env.storage().instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)?;
        if *caller != admin {
            return Err(Error::Unauthorized);
        }
        Ok(())
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{Env, Address, BytesN, String};

    fn setup() -> (Env, Address, IdentityRegistryClient<'static>) {
        let env = Env::default();
        env.mock_all_auths();
        let admin = Address::generate(&env);
        let contract_id = env.register(IdentityRegistry, ());
        let client = IdentityRegistryClient::new(&env, &contract_id);
        client.initialize(&admin);
        (env, admin, client)
    }

    fn make_dni_hash(env: &Env) -> BytesN<32> {
        BytesN::from_array(env, &[1u8; 32])
    }

    #[test]
    fn test_initialize_once() {
        let (env, admin, client) = setup();
        let result = client.try_initialize(&admin);
        assert_eq!(result, Err(Ok(Error::AlreadyInitialized)));
    }

    #[test]
    fn test_get_admin() {
        let (env, admin, client) = setup();
        assert_eq!(client.get_admin(), admin);
    }

    #[test]
    fn test_register_individual() {
        let (env, _admin, client) = setup();
        let wallet = Address::generate(&env);
        let dni_hash = make_dni_hash(&env);
        client.register_individual(&wallet, &dni_hash);
        assert_eq!(client.get_user_role(&wallet), UserRole::Individual);
    }

    #[test]
    fn test_register_individual_duplicate_wallet() {
        let (env, _admin, client) = setup();
        let wallet = Address::generate(&env);
        let dni_hash1 = BytesN::from_array(&env, &[1u8; 32]);
        let dni_hash2 = BytesN::from_array(&env, &[2u8; 32]);
        client.register_individual(&wallet, &dni_hash1);
        let result = client.try_register_individual(&wallet, &dni_hash2);
        assert_eq!(result, Err(Ok(Error::AlreadyRegistered)));
    }

    #[test]
    fn test_register_individual_duplicate_dni_hash() {
        let (env, _admin, client) = setup();
        let wallet1 = Address::generate(&env);
        let wallet2 = Address::generate(&env);
        let dni_hash = make_dni_hash(&env);
        client.register_individual(&wallet1, &dni_hash);
        let result = client.try_register_individual(&wallet2, &dni_hash);
        assert_eq!(result, Err(Ok(Error::DniHashAlreadyUsed)));
    }

    #[test]
    fn test_resolve_dni() {
        let (env, _admin, client) = setup();
        let wallet = Address::generate(&env);
        let dni_hash = make_dni_hash(&env);
        client.register_individual(&wallet, &dni_hash);
        assert_eq!(client.resolve_dni(&dni_hash), wallet);
    }

    #[test]
    fn test_register_health_center() {
        let (env, admin, client) = setup();
        let hc_wallet = Address::generate(&env);
        client.register_health_center(
            &admin,
            &hc_wallet,
            &String::from_str(&env, "Clinica Central"),
            &String::from_str(&env, "900123456-1"),
            &String::from_str(&env, "CO"),
        );
        assert_eq!(client.get_user_role(&hc_wallet), UserRole::HealthCenter);
        assert!(client.is_health_center(&hc_wallet));
    }

    #[test]
    fn test_register_health_center_unauthorized() {
        let (env, _admin, client) = setup();
        let intruder = Address::generate(&env);
        let hc_wallet = Address::generate(&env);
        let result = client.try_register_health_center(
            &intruder,
            &hc_wallet,
            &String::from_str(&env, "Fake Clinic"),
            &String::from_str(&env, "000000000"),
            &String::from_str(&env, "CO"),
        );
        assert_eq!(result, Err(Ok(Error::Unauthorized)));
    }

    #[test]
    fn test_user_not_found() {
        let (env, _admin, client) = setup();
        let unknown = Address::generate(&env);
        let result = client.try_get_user_role(&unknown);
        assert_eq!(result, Err(Ok(Error::UserNotFound)));
    }

    #[test]
    fn test_is_registered() {
        let (env, _admin, client) = setup();
        let wallet = Address::generate(&env);
        assert!(!client.is_registered(&wallet));
        client.register_individual(&wallet, &make_dni_hash(&env));
        assert!(client.is_registered(&wallet));
    }

    #[test]
    fn test_set_admin() {
        let (env, admin, client) = setup();
        let new_admin = Address::generate(&env);
        client.set_admin(&admin, &new_admin);
        assert_eq!(client.get_admin(), new_admin);
    }

    #[test]
    fn test_get_individual_data() {
        let (env, _admin, client) = setup();
        let wallet = Address::generate(&env);
        let dni_hash = make_dni_hash(&env);
        client.register_individual(&wallet, &dni_hash);
        let data = client.get_individual(&wallet);
        assert_eq!(data.wallet, wallet);
        assert_eq!(data.dni_hash, dni_hash);
        assert!(data.active);
    }
}
