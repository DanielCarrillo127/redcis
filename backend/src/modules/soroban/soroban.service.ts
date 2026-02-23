/**
 * SorobanService — Cliente para interactuar con los contratos Soroban
 *
 * Responsabilidades:
 * - Registrar Health Centers en el contrato identity-registry
 * - Sincronizar registros de individuos con el contrato
 * - Gestionar permisos de acceso en access-control
 * - Verificar estados on-chain
 */

import {
  Contract,
  rpc as SorobanRpc,
  TransactionBuilder,
  Transaction,
  Networks,
  Keypair,
  nativeToScVal,
  xdr,
  scValToNative,
} from '@stellar/stellar-sdk';
import { env } from '../../config/env';

const server = new SorobanRpc.Server(env.stellar.rpcUrl);

const identityRegistryContract = new Contract(
  env.stellar.identityRegistryContractId
);

const accessControlContract = new Contract(
  env.stellar.accessControlContractId
);

const medicalRecordRegistryContract = new Contract(
  env.stellar.medicalRecordRegistryContractId
);

// Mapeo de tipos de registro backend → variante del enum Soroban
const RECORD_TYPE_MAP: Record<string, string> = {
  lab_result: 'LabResult',
  diagnosis: 'Diagnosis',
  prescription: 'Prescription',
  procedure: 'Procedure',
  imaging_report: 'ImagingReport',
  vaccination: 'Vaccination',
  progress_note: 'ProgressNote',
  self_reported: 'SelfReported',
  other: 'Other',
};

export interface AddMedicalRecordParams {
  patientWallet: string;
  documentHash: string; // hex SHA-256, 64 chars = 32 bytes
  recordType: string;
  description: string;
}

export interface AddMedicalRecordResult {
  onChainRecordId: number;
  txHash: string;
}

export interface BuildAddRecordTxParams {
  issuerWallet: string;   // wallet del usuario que firmará (HC o paciente)
  patientWallet: string;
  documentHash: string;   // hex SHA-256
  recordType: string;
  source: 'health_center' | 'patient';
  description: string;
}

export interface BuildAddRecordTxResult {
  innerTxXdr: string;  // inner tx sin firmar — el usuario la firma como source con signTransaction
}

export interface RegisterHealthCenterParams {
  wallet: string;
  name: string;
  nit: string;
  country: string;
}

export interface RegisterIndividualParams {
  wallet: string;
  dniHash: string;
}

export interface GrantAccessParams {
  patientWallet: string;
  centerWallet: string;
  durationSecs: number;
}

export class SorobanService {
  private adminKeypair: InstanceType<typeof Keypair>;

  constructor() {
    // El admin keypair se usa para firmar transacciones privilegiadas
    // En producción, esto debería venir de un vault seguro
    this.adminKeypair = Keypair.fromSecret(env.stellar.signingSecret);
  }

  /**
   * Registra un Health Center en el contrato identity-registry
   * Solo puede ser llamado por el admin del contrato
   */
  async registerHealthCenter(
    params: RegisterHealthCenterParams
  ): Promise<string> {
    try {
      // Verificar primero si la wallet ya está registrada
      const alreadyRegistered = await this.isRegistered(params.wallet);
      if (alreadyRegistered) {
        throw new Error(`Wallet ${params.wallet} is already registered in the contract`);
      }

      const account = await server.getAccount(this.adminKeypair.publicKey());

      const tx = new TransactionBuilder(account, {
        fee: '100000',
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(
          identityRegistryContract.call(
            'register_health_center',
            ...[
              nativeToScVal(this.adminKeypair.publicKey(), { type: 'address' }),
              nativeToScVal(params.wallet, { type: 'address' }),
              nativeToScVal(params.name, { type: 'string' }),
              nativeToScVal(params.nit, { type: 'string' }),
              nativeToScVal(params.country, { type: 'string' }),
            ]
          )
        )
        .setTimeout(30)
        .build();

      const prepared = await server.prepareTransaction(tx);
      prepared.sign(this.adminKeypair);

      const result = await server.sendTransaction(prepared);

      if (result.status === 'PENDING') {
        // Esperar confirmación con timeout
        let attempts = 0;
        const maxAttempts = 30;
        let getResponse = await server.getTransaction(result.hash);

        while (getResponse.status === 'NOT_FOUND' && attempts < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          getResponse = await server.getTransaction(result.hash);
          attempts++;
        }

        if (getResponse.status === 'SUCCESS') {
          return result.hash;
        } else if (getResponse.status === 'FAILED') {
          // Intentar extraer el error del contrato
          const resultXdr = getResponse as any;
          console.error('Transaction failed. Full response:', JSON.stringify(resultXdr, null, 2));
          throw new Error(`Transaction failed on-chain. Check if the wallet is already registered or if the admin credentials are correct.`);
        } else {
          throw new Error(`Transaction status: ${getResponse.status}`);
        }
      } else if (result.status === 'ERROR') {
        throw new Error(`Transaction submission error: ${JSON.stringify(result)}`);
      }

      return result.hash;
    } catch (error) {
      console.error('Error registering health center on-chain:', error);

      // Mejorar mensajes de error
      if (error instanceof Error) {
        if (error.message.includes('already registered')) {
          throw error;
        }
        throw new Error(`Failed to register health center on-chain: ${error.message}`);
      }

      throw new Error(`Failed to register health center on-chain: ${error}`);
    }
  }

  /**
   * Verifica si una wallet está registrada en el contrato
   */
  async isRegistered(wallet: string): Promise<boolean> {
    try {
      const account = await server.getAccount(this.adminKeypair.publicKey());

      const tx = new TransactionBuilder(account, {
        fee: '100',
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(
          identityRegistryContract.call(
            'is_registered',
            nativeToScVal(wallet, { type: 'address' })
          )
        )
        .setTimeout(30)
        .build();

      const simulated = await server.simulateTransaction(tx);

      if (
        'result' in simulated &&
        simulated.result &&
        simulated.result.retval
      ) {
        return simulated.result.retval.value() === true;
      }

      return false;
    } catch (error) {
      console.error('Error checking registration:', error);
      return false;
    }
  }

  /**
   * Verifica si una wallet es un Health Center
   */
  async isHealthCenter(wallet: string): Promise<boolean> {
    try {
      const account = await server.getAccount(this.adminKeypair.publicKey());

      const tx = new TransactionBuilder(account, {
        fee: '100',
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(
          identityRegistryContract.call(
            'is_health_center',
            nativeToScVal(wallet, { type: 'address' })
          )
        )
        .setTimeout(30)
        .build();

      const simulated = await server.simulateTransaction(tx);

      if (
        'result' in simulated &&
        simulated.result &&
        simulated.result.retval
      ) {
        return simulated.result.retval.value() === true;
      }

      return false;
    } catch (error) {
      console.error('Error checking health center status:', error);
      return false;
    }
  }

  /**
   * Verifica si un centro tiene acceso al historial de un paciente
   */
  async hasAccess(
    patientWallet: string,
    centerWallet: string
  ): Promise<boolean> {
    try {
      const account = await server.getAccount(this.adminKeypair.publicKey());

      const tx = new TransactionBuilder(account, {
        fee: '100',
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(
          accessControlContract.call(
            'has_access',
            ...[
              nativeToScVal(patientWallet, { type: 'address' }),
              nativeToScVal(centerWallet, { type: 'address' }),
            ]
          )
        )
        .setTimeout(30)
        .build();

      const simulated = await server.simulateTransaction(tx);

      if (
        'result' in simulated &&
        simulated.result &&
        simulated.result.retval
      ) {
        return simulated.result.retval.value() === true;
      }

      return false;
    } catch (error) {
      console.error('Error checking access:', error);
      return false;
    }
  }

  /**
   * Registra un evento clínico en el contrato medical-record-registry.
   *
   * El admin firma como emisor (HealthCenter) en representación de la plataforma.
   * El admin debe estar previamente registrado como HealthCenter en el identity-registry
   * mediante setupAdminAsHealthCenter().
   *
   * Devuelve el ID on-chain asignado por el contrato y el hash de la transacción.
   */
  async addMedicalRecord(params: AddMedicalRecordParams): Promise<AddMedicalRecordResult> {
    const account = await server.getAccount(this.adminKeypair.publicKey());

    // BytesN<32>: hex → Buffer de 32 bytes
    const hashBuffer = Buffer.from(params.documentHash, 'hex');
    const documentHashVal = xdr.ScVal.scvBytes(hashBuffer);

    // RecordType enum: ScVec([ScSymbol("VariantName")])
    const variant = RECORD_TYPE_MAP[params.recordType] ?? 'Other';
    const recordTypeVal = xdr.ScVal.scvVec([xdr.ScVal.scvSymbol(variant)]);

    // RecordSource::HealthCenter (el admin firma como plataforma)
    const sourceVal = xdr.ScVal.scvVec([xdr.ScVal.scvSymbol('HealthCenter')]);

    // Descripción truncada a 64 chars (recomendación del contrato)
    const description = params.description.slice(0, 64);

    const tx = new TransactionBuilder(account, {
      fee: '1000000',
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(
        medicalRecordRegistryContract.call(
          'add_record',
          nativeToScVal(this.adminKeypair.publicKey(), { type: 'address' }),
          nativeToScVal(params.patientWallet, { type: 'address' }),
          documentHashVal,
          recordTypeVal,
          sourceVal,
          nativeToScVal(description, { type: 'string' }),
        )
      )
      .setTimeout(30)
      .build();

    const prepared = await server.prepareTransaction(tx);
    prepared.sign(this.adminKeypair);

    const result = await server.sendTransaction(prepared);

    if (result.status !== 'PENDING') {
      throw new Error(`Submission failed: ${JSON.stringify(result)}`);
    }

    // Esperar confirmación
    let attempts = 0;
    const maxAttempts = 30;
    let getResponse = await server.getTransaction(result.hash);

    while (getResponse.status === 'NOT_FOUND' && attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      getResponse = await server.getTransaction(result.hash);
      attempts++;
    }

    if (getResponse.status !== 'SUCCESS') {
      throw new Error(`Transaction failed: ${getResponse.status}`);
    }

    // Extraer el ID on-chain del valor de retorno (u64)
    let onChainRecordId = 0;
    try {
      const returnVal = (getResponse as any).returnValue as xdr.ScVal | undefined;
      if (returnVal) {
        const native = scValToNative(returnVal);
        onChainRecordId = Number(native);
      }
    } catch (e) {
      console.error('Could not parse on-chain record ID from return value:', e);
    }

    return { onChainRecordId, txHash: result.hash };
  }

  /**
   * Construye y simula la transacción add_record sin firmarla.
   *
   * Flujo fee-bump:
   *  - La inner tx usa el ISSUER (usuario) como source account.
   *  - `issuer.require_auth()` en el contrato queda satisfecho implícitamente
   *    porque el source account == issuer (SOROBAN_CREDENTIALS_SOURCE_ACCOUNT).
   *  - El usuario firma la inner tx completa con signTransaction en Freighter.
   *  - El admin la envuelve en una fee-bump tx (paga los fees) y la envía.
   *
   * Prerequisito: el issuerWallet debe tener una cuenta Stellar activa en testnet.
   */
  async buildAddRecordTx(params: BuildAddRecordTxParams): Promise<BuildAddRecordTxResult> {
    // Source = usuario (satisface require_auth implícitamente)
    const account = await server.getAccount(params.issuerWallet);

    const hashBuffer = Buffer.from(params.documentHash, 'hex');
    const documentHashVal = xdr.ScVal.scvBytes(hashBuffer);

    const variant = RECORD_TYPE_MAP[params.recordType] ?? 'Other';
    const recordTypeVal = xdr.ScVal.scvVec([xdr.ScVal.scvSymbol(variant)]);

    const sourceVariant = params.source === 'health_center' ? 'HealthCenter' : 'Patient';
    const sourceVal = xdr.ScVal.scvVec([xdr.ScVal.scvSymbol(sourceVariant)]);

    const description = params.description.slice(0, 64);

    const tx = new TransactionBuilder(account, {
      fee: '1000000',
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(
        medicalRecordRegistryContract.call(
          'add_record',
          nativeToScVal(params.issuerWallet, { type: 'address' }),
          nativeToScVal(params.patientWallet, { type: 'address' }),
          documentHashVal,
          recordTypeVal,
          sourceVal,
          nativeToScVal(description, { type: 'string' }),
        )
      )
      .setTimeout(30)
      .build();

    const prepared = await server.prepareTransaction(tx);

    return {
      innerTxXdr: prepared.toEnvelope().toXDR('base64'),
    };
  }

  /**
   * Recibe la inner tx FIRMADA por el usuario (source = issuer), la envuelve
   * en una fee-bump transaction firmada por el admin (paga los fees) y la envía.
   */
  async submitOnChainRecord(
    signedInnerTxXdr: string,
  ): Promise<AddMedicalRecordResult> {
    // 1. Parsear la inner tx firmada por el usuario
    const innerTx = TransactionBuilder.fromXDR(
      signedInnerTxXdr,
      Networks.TESTNET,
    ) as Transaction;

    // 2. Envolver en fee-bump: admin como fee-source, paga todos los fees
    const feeBumpTx = TransactionBuilder.buildFeeBumpTransaction(
      this.adminKeypair,
      '1000000',
      innerTx,
      Networks.TESTNET,
    );
    feeBumpTx.sign(this.adminKeypair);

    // 3. Enviar
    const result = await server.sendTransaction(feeBumpTx as any);

    if (result.status !== 'PENDING') {
      throw new Error(`Submission failed: ${JSON.stringify(result)}`);
    }

    // 5. Esperar confirmación
    let attempts = 0;
    const maxAttempts = 30;
    let getResponse = await server.getTransaction(result.hash);

    while (getResponse.status === 'NOT_FOUND' && attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      getResponse = await server.getTransaction(result.hash);
      attempts++;
    }

    if (getResponse.status !== 'SUCCESS') {
      throw new Error(`Transaction failed: ${getResponse.status}`);
    }

    // 6. Extraer el on-chain record ID del valor de retorno (u64)
    let onChainRecordId = 0;
    try {
      const returnVal = (getResponse as any).returnValue as xdr.ScVal | undefined;
      if (returnVal) {
        onChainRecordId = Number(scValToNative(returnVal));
      }
    } catch (e) {
      console.error('[Soroban] Could not parse on-chain record ID:', e);
    }

    return { onChainRecordId, txHash: result.hash };
  }

  /**
   * Registra el admin wallet como HealthCenter en el identity-registry.
   * Debe ejecutarse una sola vez antes de poder registrar documentos on-chain.
   * El estado se verifica primero para evitar la transacción si ya está registrado.
   */
  async setupAdminAsHealthCenter(): Promise<void> {
    const adminWallet = this.adminKeypair.publicKey();

    const alreadyHC = await this.isHealthCenter(adminWallet);
    if (alreadyHC) {
      console.log('[Soroban] Admin already registered as HealthCenter — skipping setup');
      return;
    }

    console.log('[Soroban] Registering admin as HealthCenter...');
    await this.registerHealthCenter({
      wallet: adminWallet,
      name: 'redcis-platform',
      nit: 'PLATFORM-001',
      country: 'CO',
    });
    console.log('[Soroban] Admin registered as HealthCenter');
  }

  /**
   * Obtiene el rol de un usuario desde el contrato
   */
  async getUserRole(wallet: string): Promise<'Individual' | 'HealthCenter' | null> {
    try {
      const account = await server.getAccount(this.adminKeypair.publicKey());

      const tx = new TransactionBuilder(account, {
        fee: '100',
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(
          identityRegistryContract.call(
            'get_user_role',
            nativeToScVal(wallet, { type: 'address' })
          )
        )
        .setTimeout(30)
        .build();

      const simulated = await server.simulateTransaction(tx);

      if (
        'result' in simulated &&
        simulated.result &&
        simulated.result.retval
      ) {
        const roleScVal = simulated.result.retval;
        // El enum UserRole en Soroban se serializa como symbol
        const roleName = roleScVal.sym()?.toString();

        if (roleName === 'Individual') return 'Individual';
        if (roleName === 'HealthCenter') return 'HealthCenter';
      }

      return null;
    } catch (error) {
      console.error('Error getting user role:', error);
      return null;
    }
  }
}

export const sorobanService = new SorobanService();
