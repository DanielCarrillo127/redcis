//! # MedicalRecordRegistry Contract
//!
//! Contrato Soroban para la red Stellar que gestiona el registro inmutable
//! de eventos clínicos dentro del sistema redcis.
//!
//! ## Responsabilidades
//! - Registrar eventos clínicos asociando un hash de documento a un paciente.
//! - Mantener un historial inmutable con metadatos verificables.
//! - Permitir la consulta del historial por paciente.
//! - Restringir el registro de eventos a emisores autorizados:
//!   únicamente wallets registradas como HealthCenter en el IdentityRegistry,
//!   o el propio paciente (para cargar registros personales).
//!
//! ## Modelo de Privacidad
//! Los documentos médicos completos (PDFs, imágenes, etc.) se almacenan
//! off-chain (IPFS, backend privado). On-chain solo se guarda:
//!   - Hash SHA256 del documento (inmutabilidad y verificabilidad).
//!   - Metadatos del evento (tipo, emisor, timestamp).
//!
//! ## Integración con IdentityRegistry
//! Este contrato referencia el contrato IdentityRegistry mediante su
//! contract_id para validar roles. El contract_id se configura en la
//! inicialización y puede actualizarse solo por el admin.

#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, contracterror,
    symbol_short, Env, Address, String, Symbol, BytesN, Vec,
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
    /// Lista de record IDs de un paciente: Vec<u64>
    PatientRecords(Address),
    /// Metadatos de un registro por su ID: RecordMetadata
    Record(u64),
    /// Contador global de registros (u64)
    RecordCounter,
}

// ---------------------------------------------------------------------------
// Custom types
// ---------------------------------------------------------------------------

/// Tipos de evento clínico soportados.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum RecordType {
    /// Resultado de laboratorio.
    LabResult,
    /// Diagnóstico médico.
    Diagnosis,
    /// Prescripción / fórmula médica.
    Prescription,
    /// Reporte de procedimiento quirúrgico o terapéutico.
    Procedure,
    /// Imagen diagnóstica (RX, TAC, RMN, etc.).
    ImagingReport,
    /// Vacunación.
    Vaccination,
    /// Nota de evolución o seguimiento.
    ProgressNote,
    /// Registro personal cargado por el individuo.
    SelfReported,
    /// Otro tipo no clasificado.
    Other,
}

/// Origen del registro (quién lo creó).
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum RecordSource {
    /// Registrado por un centro de salud.
    HealthCenter,
    /// Cargado directamente por el paciente.
    Patient,
}

/// Metadatos de un evento clínico almacenados on-chain.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RecordMetadata {
    /// Identificador único del registro (auto-incremental).
    pub record_id: u64,
    /// Wallet del paciente al que pertenece este registro.
    pub patient_wallet: Address,
    /// Wallet del emisor (centro de salud o paciente).
    pub issuer_wallet: Address,
    /// SHA256 del documento completo almacenado off-chain.
    pub document_hash: BytesN<32>,
    /// Tipo de evento clínico.
    pub record_type: RecordType,
    /// Origen del registro.
    pub source: RecordSource,
    /// Descripción corta del evento (máx ~64 chars recomendado).
    pub description: String,
    /// Timestamp del ledger al momento del registro.
    pub timestamp: u64,
    /// Número de ledger al momento del registro (trazabilidad adicional).
    pub ledger_sequence: u32,
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
    /// El emisor no está registrado como HealthCenter ni como paciente válido.
    IssuerNotAuthorized = 4,
    /// El paciente no está registrado en el IdentityRegistry.
    PatientNotFound = 5,
    /// El registro solicitado no existe.
    RecordNotFound = 6,
    /// El emisor intenta usar una fuente que no le corresponde.
    InvalidSource = 7,
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

const TOPIC_RECORD_ADDED: Symbol = symbol_short!("rec_add");

// ---------------------------------------------------------------------------
// IdentityRegistry client (cross-contract call)
// ---------------------------------------------------------------------------

/// Client mínimo para llamar al IdentityRegistry.
/// Solo necesitamos `is_registered` e `is_health_center`.
mod identity_registry {
    soroban_sdk::contractimport!(
        file = "../target/wasm32v1-none/release/identity_registry.wasm"
    );
}

// ---------------------------------------------------------------------------
// Contract
// ---------------------------------------------------------------------------

#[contract]
pub struct MedicalRecordRegistry;

#[contractimpl]
impl MedicalRecordRegistry {

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
        env.storage().instance().set(&DataKey::RecordCounter, &0_u64);
        env.storage().instance().extend_ttl(100, 1_000_000);
        Ok(())
    }

    /// Actualiza el contract ID del IdentityRegistry (solo admin).
    pub fn set_identity_registry(
        env: Env,
        caller: Address,
        identity_registry_id: Address,
    ) -> Result<(), Error> {
        caller.require_auth();
        Self::assert_admin(&env, &caller)?;
        env.storage().instance().set(&DataKey::IdentityRegistryId, &identity_registry_id);
        Ok(())
    }

    // -----------------------------------------------------------------------
    // Registro de eventos clínicos
    // -----------------------------------------------------------------------

    /// Registra un evento clínico en el historial de un paciente.
    ///
    /// # Quién puede llamar este método
    /// - Un **centro de salud** registrado en el IdentityRegistry
    ///   (`source = RecordSource::HealthCenter`).
    /// - El **propio paciente** para cargar sus registros personales
    ///   (`source = RecordSource::Patient`).
    ///
    /// # Argumentos
    /// - `issuer`:        wallet del emisor (firma la tx).
    /// - `patient_wallet`: wallet del paciente destinatario.
    /// - `document_hash`: SHA256 del documento off-chain.
    /// - `record_type`:   tipo de evento clínico.
    /// - `source`:        origen del registro.
    /// - `description`:   descripción breve del evento.
    pub fn add_record(
        env: Env,
        issuer: Address,
        patient_wallet: Address,
        document_hash: BytesN<32>,
        record_type: RecordType,
        source: RecordSource,
        description: String,
    ) -> Result<u64, Error> {
        issuer.require_auth();

        let registry_id: Address = env.storage().instance()
            .get(&DataKey::IdentityRegistryId)
            .ok_or(Error::NotInitialized)?;

        let registry_client = identity_registry::Client::new(&env, &registry_id);

        // Validar que el paciente está registrado
        if !registry_client.is_registered(&patient_wallet) {
            return Err(Error::PatientNotFound);
        }

        // Validar permisos según la fuente del registro
        match source {
            RecordSource::HealthCenter => {
                if !registry_client.is_health_center(&issuer) {
                    return Err(Error::IssuerNotAuthorized);
                }
            }
            RecordSource::Patient => {
                // El paciente solo puede registrar sus propios eventos
                if issuer != patient_wallet {
                    return Err(Error::InvalidSource);
                }
            }
        }

        // Obtener y actualizar el contador de registros
        let record_id: u64 = env.storage().instance()
            .get(&DataKey::RecordCounter)
            .unwrap_or(0_u64);
        let next_id = record_id + 1;
        env.storage().instance().set(&DataKey::RecordCounter, &next_id);

        let timestamp = env.ledger().timestamp();
        let ledger_seq = env.ledger().sequence();

        let metadata = RecordMetadata {
            record_id: next_id,
            patient_wallet: patient_wallet.clone(),
            issuer_wallet: issuer.clone(),
            document_hash,
            record_type,
            source,
            description,
            timestamp,
            ledger_sequence: ledger_seq,
        };

        // Almacenar metadatos del registro
        env.storage().persistent().set(&DataKey::Record(next_id), &metadata);
        env.storage().persistent().extend_ttl(&DataKey::Record(next_id), 100, 1_000_000);

        // Agregar el ID al historial del paciente
        let mut records: Vec<u64> = env.storage().persistent()
            .get(&DataKey::PatientRecords(patient_wallet.clone()))
            .unwrap_or_else(|| Vec::new(&env));
        records.push_back(next_id);
        env.storage().persistent().set(&DataKey::PatientRecords(patient_wallet.clone()), &records);
        env.storage().persistent().extend_ttl(
            &DataKey::PatientRecords(patient_wallet.clone()), 100, 1_000_000,
        );

        env.storage().instance().extend_ttl(100, 1_000_000);

        // Emitir evento
        env.events().publish(
            (TOPIC_RECORD_ADDED,),
            (next_id, patient_wallet, issuer, timestamp),
        );

        Ok(next_id)
    }

    // -----------------------------------------------------------------------
    // Consultas
    // -----------------------------------------------------------------------

    /// Devuelve todos los IDs de registros de un paciente.
    pub fn get_records(env: Env, patient_wallet: Address) -> Vec<u64> {
        env.storage().persistent()
            .get(&DataKey::PatientRecords(patient_wallet))
            .unwrap_or_else(|| Vec::new(&env))
    }

    /// Devuelve los metadatos de un registro específico.
    pub fn get_record_metadata(env: Env, record_id: u64) -> Result<RecordMetadata, Error> {
        env.storage().persistent()
            .get(&DataKey::Record(record_id))
            .ok_or(Error::RecordNotFound)
    }

    /// Devuelve el número total de registros en el sistema.
    pub fn get_record_count(env: Env) -> u64 {
        env.storage().instance()
            .get(&DataKey::RecordCounter)
            .unwrap_or(0_u64)
    }

    /// Devuelve el admin actual.
    pub fn get_admin(env: Env) -> Result<Address, Error> {
        env.storage().instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)
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

    // Registra el mock del IdentityRegistry para tests.
    // En tests usamos un contrato mock que simula las funciones is_registered
    // e is_health_center.
    mod mock_identity_registry {
        use soroban_sdk::{contract, contractimpl, Env, Address};

        #[contract]
        pub struct MockIdentityRegistry;

        #[contractimpl]
        impl MockIdentityRegistry {
            pub fn is_registered(_env: Env, _wallet: Address) -> bool {
                true
            }
            pub fn is_health_center(env: Env, wallet: Address) -> bool {
                // Consideramos que la wallet que termina en bytes impares es HC
                // En tests reales esto se controla con mock_all_auths y setup
                let _ = (env, wallet);
                true
            }
        }
    }

    fn make_hash(env: &Env, seed: u8) -> BytesN<32> {
        BytesN::from_array(env, &[seed; 32])
    }

    #[test]
    fn test_initialize_once() {
        let env = Env::default();
        env.mock_all_auths();
        let admin = Address::generate(&env);
        let registry_id = env.register(mock_identity_registry::MockIdentityRegistry, ());
        let contract_id = env.register(MedicalRecordRegistry, ());
        let client = MedicalRecordRegistryClient::new(&env, &contract_id);
        client.initialize(&admin, &registry_id);
        let result = client.try_initialize(&admin, &registry_id);
        assert_eq!(result, Err(Ok(Error::AlreadyInitialized)));
    }

    #[test]
    fn test_add_record_by_health_center() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let registry_id = env.register(mock_identity_registry::MockIdentityRegistry, ());
        let contract_id = env.register(MedicalRecordRegistry, ());
        let client = MedicalRecordRegistryClient::new(&env, &contract_id);
        client.initialize(&admin, &registry_id);

        let hc_wallet = Address::generate(&env);
        let patient_wallet = Address::generate(&env);
        let doc_hash = make_hash(&env, 42);

        let record_id = client.add_record(
            &hc_wallet,
            &patient_wallet,
            &doc_hash,
            &RecordType::Diagnosis,
            &RecordSource::HealthCenter,
            &String::from_str(&env, "Diagnostico: Hipertension leve"),
        );

        assert_eq!(record_id, 1u64);
        assert_eq!(client.get_record_count(), 1u64);
    }

    #[test]
    fn test_get_records_empty() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let registry_id = env.register(mock_identity_registry::MockIdentityRegistry, ());
        let contract_id = env.register(MedicalRecordRegistry, ());
        let client = MedicalRecordRegistryClient::new(&env, &contract_id);
        client.initialize(&admin, &registry_id);

        let patient = Address::generate(&env);
        let records = client.get_records(&patient);
        assert_eq!(records.len(), 0);
    }

    #[test]
    fn test_get_records_multiple() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let registry_id = env.register(mock_identity_registry::MockIdentityRegistry, ());
        let contract_id = env.register(MedicalRecordRegistry, ());
        let client = MedicalRecordRegistryClient::new(&env, &contract_id);
        client.initialize(&admin, &registry_id);

        let hc = Address::generate(&env);
        let patient = Address::generate(&env);

        client.add_record(
            &hc, &patient,
            &make_hash(&env, 1),
            &RecordType::LabResult,
            &RecordSource::HealthCenter,
            &String::from_str(&env, "Hemograma completo"),
        );
        client.add_record(
            &hc, &patient,
            &make_hash(&env, 2),
            &RecordType::Prescription,
            &RecordSource::HealthCenter,
            &String::from_str(&env, "Formula medica"),
        );

        let records = client.get_records(&patient);
        assert_eq!(records.len(), 2);
        assert_eq!(records.get(0).unwrap(), 1u64);
        assert_eq!(records.get(1).unwrap(), 2u64);
    }

    #[test]
    fn test_get_record_metadata() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let registry_id = env.register(mock_identity_registry::MockIdentityRegistry, ());
        let contract_id = env.register(MedicalRecordRegistry, ());
        let client = MedicalRecordRegistryClient::new(&env, &contract_id);
        client.initialize(&admin, &registry_id);

        let hc = Address::generate(&env);
        let patient = Address::generate(&env);
        let doc_hash = make_hash(&env, 99);

        let id = client.add_record(
            &hc, &patient, &doc_hash,
            &RecordType::Vaccination,
            &RecordSource::HealthCenter,
            &String::from_str(&env, "Vacuna COVID-19 dosis 1"),
        );

        let meta = client.get_record_metadata(&id);
        assert_eq!(meta.record_id, id);
        assert_eq!(meta.patient_wallet, patient);
        assert_eq!(meta.issuer_wallet, hc);
        assert_eq!(meta.document_hash, doc_hash);
        assert_eq!(meta.record_type, RecordType::Vaccination);
        assert_eq!(meta.source, RecordSource::HealthCenter);
    }

    #[test]
    fn test_record_not_found() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let registry_id = env.register(mock_identity_registry::MockIdentityRegistry, ());
        let contract_id = env.register(MedicalRecordRegistry, ());
        let client = MedicalRecordRegistryClient::new(&env, &contract_id);
        client.initialize(&admin, &registry_id);

        let result = client.try_get_record_metadata(&9999u64);
        assert_eq!(result, Err(Ok(Error::RecordNotFound)));
    }

    #[test]
    fn test_patient_self_reported() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let registry_id = env.register(mock_identity_registry::MockIdentityRegistry, ());
        let contract_id = env.register(MedicalRecordRegistry, ());
        let client = MedicalRecordRegistryClient::new(&env, &contract_id);
        client.initialize(&admin, &registry_id);

        let patient = Address::generate(&env);
        let id = client.add_record(
            &patient,
            &patient,
            &make_hash(&env, 5),
            &RecordType::SelfReported,
            &RecordSource::Patient,
            &String::from_str(&env, "Examen externo cargado manualmente"),
        );

        let meta = client.get_record_metadata(&id);
        assert_eq!(meta.source, RecordSource::Patient);
    }

    #[test]
    fn test_invalid_source_patient_reporting_for_other() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let registry_id = env.register(mock_identity_registry::MockIdentityRegistry, ());
        let contract_id = env.register(MedicalRecordRegistry, ());
        let client = MedicalRecordRegistryClient::new(&env, &contract_id);
        client.initialize(&admin, &registry_id);

        let attacker = Address::generate(&env);
        let victim = Address::generate(&env);

        let result = client.try_add_record(
            &attacker,
            &victim,
            &make_hash(&env, 7),
            &RecordType::SelfReported,
            &RecordSource::Patient,
            &String::from_str(&env, "Registro malicioso"),
        );
        assert_eq!(result, Err(Ok(Error::InvalidSource)));
    }
}
