/**
 * Soroban Service — Cliente para interactuar con los contratos desde el frontend
 *
 * Este servicio construye transacciones que el usuario firma con su wallet Stellar activa.
 * Las transacciones se envían directamente desde el navegador a Stellar.
 */

import {
  Contract,
  rpc,
  TransactionBuilder,
  Networks,
  nativeToScVal,
  Account,
} from '@stellar/stellar-sdk';
import { StellarWalletsKit } from '@creit-tech/stellar-wallets-kit/sdk';

const RPC_URL =
  process.env.NEXT_PUBLIC_SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org';
const NETWORK = process.env.NEXT_PUBLIC_STELLAR_NETWORK || 'testnet';

const server = new rpc.Server(RPC_URL);

const identityRegistryContract = new Contract(
  process.env.NEXT_PUBLIC_IDENTITY_REGISTRY_CONTRACT_ID!
);

const accessControlContract = new Contract(
  process.env.NEXT_PUBLIC_ACCESS_CONTROL_CONTRACT_ID!
);

const networkPassphrase =
  NETWORK === 'testnet' ? Networks.TESTNET : Networks.PUBLIC;

/**
 * Registra un individuo en el contrato identity-registry
 * El usuario firma la transacción con Freighter
 */
export async function registerIndividual(
  userPublicKey: string,
  dniHash: string
): Promise<string> {
  try {
    const account = await server.getAccount(userPublicKey);

    const tx = new TransactionBuilder(account, {
      fee: '100000',
      networkPassphrase,
    })
      .addOperation(
        identityRegistryContract.call(
          'register_individual',
          ...[
            nativeToScVal(userPublicKey, { type: 'address' }),
            nativeToScVal(Buffer.from(dniHash, 'hex'), { type: 'bytes' }),
          ]
        )
      )
      .setTimeout(30)
      .build();

    // Preparar transacción con el servidor RPC
    const prepared = await server.prepareTransaction(tx);

    // Firmar con la wallet activa (StellarWalletsKit)
    const signedResponse = await StellarWalletsKit.signTransaction(prepared.toXDR(), {
      networkPassphrase,
      address: userPublicKey,
    });

    // Enviar transacción firmada
    const txFromXdr = TransactionBuilder.fromXDR(signedResponse.signedTxXdr, networkPassphrase);
    const result = await server.sendTransaction(txFromXdr as any);

    if (result.status === 'PENDING') {
      // Esperar confirmación
      let getResponse = await server.getTransaction(result.hash);
      let attempts = 0;

      while (getResponse.status === 'NOT_FOUND' && attempts < 10) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        getResponse = await server.getTransaction(result.hash);
        attempts++;
      }

      if (getResponse.status === 'SUCCESS') {
        return result.hash;
      } else {
        throw new Error(`Transaction failed: ${getResponse.status}`);
      }
    }

    return result.hash;
  } catch (error) {
    console.error('Error registering individual:', error);
    throw error;
  }
}

/**
 * Otorga acceso de un paciente a un centro de salud
 */
export async function grantAccess(
  patientPublicKey: string,
  centerWallet: string,
  durationSecs: number = 0
): Promise<string> {
  try {
    const account = await server.getAccount(patientPublicKey);

    const tx = new TransactionBuilder(account, {
      fee: '100000',
      networkPassphrase,
    })
      .addOperation(
        accessControlContract.call(
          'grant_access',
          ...[
            nativeToScVal(patientPublicKey, { type: 'address' }),
            nativeToScVal(centerWallet, { type: 'address' }),
            nativeToScVal(durationSecs, { type: 'u64' }),
          ]
        )
      )
      .setTimeout(30)
      .build();

    const prepared = await server.prepareTransaction(tx);

    const signedResponse = await StellarWalletsKit.signTransaction(prepared.toXDR(), {
      networkPassphrase,
      address: patientPublicKey,
    });

    const txFromXdr = TransactionBuilder.fromXDR(signedResponse.signedTxXdr, networkPassphrase);
    const result = await server.sendTransaction(txFromXdr as any);

    if (result.status === 'PENDING') {
      let getResponse = await server.getTransaction(result.hash);
      let attempts = 0;

      while (getResponse.status === 'NOT_FOUND' && attempts < 10) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        getResponse = await server.getTransaction(result.hash);
        attempts++;
      }

      if (getResponse.status === 'SUCCESS') {
        return result.hash;
      } else {
        throw new Error(`Transaction failed: ${getResponse.status}`);
      }
    }

    return result.hash;
  } catch (error) {
    console.error('Error granting access:', error);
    throw error;
  }
}

/**
 * Revoca el acceso de un centro de salud
 */
export async function revokeAccess(
  patientPublicKey: string,
  centerWallet: string
): Promise<string> {
  try {
    const account = await server.getAccount(patientPublicKey);

    const tx = new TransactionBuilder(account, {
      fee: '100000',
      networkPassphrase,
    })
      .addOperation(
        accessControlContract.call(
          'revoke_access',
          ...[
            nativeToScVal(patientPublicKey, { type: 'address' }),
            nativeToScVal(centerWallet, { type: 'address' }),
          ]
        )
      )
      .setTimeout(30)
      .build();

    const prepared = await server.prepareTransaction(tx);

    const signedResponse = await StellarWalletsKit.signTransaction(prepared.toXDR(), {
      networkPassphrase,
      address: patientPublicKey,
    });

    const txFromXdr = TransactionBuilder.fromXDR(signedResponse.signedTxXdr, networkPassphrase);
    const result = await server.sendTransaction(txFromXdr as any);

    if (result.status === 'PENDING') {
      let getResponse = await server.getTransaction(result.hash);
      let attempts = 0;

      while (getResponse.status === 'NOT_FOUND' && attempts < 10) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        getResponse = await server.getTransaction(result.hash);
        attempts++;
      }

      if (getResponse.status === 'SUCCESS') {
        return result.hash;
      } else {
        throw new Error(`Transaction failed: ${getResponse.status}`);
      }
    }

    return result.hash;
  } catch (error) {
    console.error('Error revoking access:', error);
    throw error;
  }
}

/**
 * Verifica si un centro tiene acceso al historial de un paciente
 */
export async function hasAccess(
  patientWallet: string,
  centerWallet: string
): Promise<boolean> {
  try {
    // Para read-only queries, podemos usar cualquier account
    // Solo estamos simulando, no enviando transacción
    const tx = new TransactionBuilder(
      new Account(
        'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
        '0'
      ),
      {
        fee: '100',
        networkPassphrase,
      }
    )
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

    if ('result' in simulated && simulated.result && simulated.result.retval) {
      return simulated.result.retval.value() === true;
    }

    return false;
  } catch (error) {
    console.error('Error checking access:', error);
    return false;
  }
}

