/**
 * blockchain-records.ts
 *
 * Flujo fee-bump para anclar un registro clínico en el contrato Soroban:
 *
 *  1. POST /api/records/:id/prepare-on-chain
 *     → backend construye la inner tx con el USUARIO como source account
 *     → devuelve innerTxXdr (sin firmar)
 *
 *  2. signTransaction (Freighter)
 *     → el usuario firma la tx completa (es el source → require_auth() satisfecho implícitamente)
 *
 *  3. POST /api/records/:id/submit-on-chain
 *     → backend envuelve la inner tx firmada en una fee-bump tx (admin paga fees)
 *     → admin firma y envía a Stellar, espera confirmación, actualiza MongoDB
 *     → devuelve el registro actualizado con stellarTxHash e isOnChain=true
 */

import { signTransaction } from '@stellar/freighter-api';
import apiClient from './axios-client';
import { RecordResponse } from './records';

const TESTNET_PASSPHRASE = 'Test SDF Network ; September 2015';

export class BlockchainRecordError extends Error {
  constructor(
    message: string,
    public readonly code: 'FREIGHTER_NOT_AVAILABLE' | 'USER_REJECTED' | 'NETWORK_ERROR' | 'CONTRACT_ERROR',
  ) {
    super(message);
    this.name = 'BlockchainRecordError';
  }
}

/**
 * Ancla un registro clínico existente en el contrato Soroban.
 *
 * El usuario firma la inner tx completa con Freighter (sin signAuthEntry).
 * El admin la envuelve en una fee-bump tx para pagar los fees.
 *
 * @param recordId    MongoDB _id del registro a anclar
 * @param userWallet  Wallet del usuario autenticado (issuer y source de la inner tx)
 */
export async function anchorRecordOnChain(
  recordId: string,
  userWallet: string,
): Promise<RecordResponse> {
  // 1. Obtener la inner tx preparada del backend
  const prepareRes = await apiClient.post<{
    success: boolean;
    data: { innerTxXdr: string };
  }>(`/api/records/${recordId}/prepare-on-chain`);

  const { innerTxXdr } = prepareRes.data.data;

  // 2. Usuario firma la tx completa con Freighter (signTransaction, ampliamente soportado)
  let signedInnerTxXdr: string;
  try {
    const result = await signTransaction(innerTxXdr, {
      networkPassphrase: TESTNET_PASSPHRASE,
      address: userWallet,
    });

    if (result.error) {
      const errMsg = result.error.message ?? String(result.error);
      if (errMsg.toLowerCase().includes('user declined') ||
          errMsg.toLowerCase().includes('rejected')) {
        throw new BlockchainRecordError(
          'Firma cancelada por el usuario.',
          'USER_REJECTED',
        );
      }
      throw new BlockchainRecordError(errMsg, 'FREIGHTER_NOT_AVAILABLE');
    }

    signedInnerTxXdr = result.signedTxXdr;
  } catch (err) {
    if (err instanceof BlockchainRecordError) throw err;
    throw new BlockchainRecordError(
      'No se pudo firmar con Freighter. Asegúrate de tener la extensión instalada y actualizada.',
      'FREIGHTER_NOT_AVAILABLE',
    );
  }

  // 3. Enviar la tx firmada al backend — admin envuelve en fee-bump y envía
  const submitRes = await apiClient.post<{
    success: boolean;
    data: RecordResponse;
  }>(`/api/records/${recordId}/submit-on-chain`, {
    signedInnerTxXdr,
  });

  return submitRes.data.data;
}
