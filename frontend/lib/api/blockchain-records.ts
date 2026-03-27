/**
 * blockchain-records.ts
 *
 * Flujo fee-bump para anclar un registro clínico en el contrato Soroban:
 *
 *  1. POST /api/records/:id/prepare-on-chain
 *     → backend construye la inner tx con el USUARIO como source account
 *     → devuelve innerTxXdr (sin firmar)
 *
 *  2. StellarWalletsKit.signTransaction (wallet seleccionada por el usuario)
 *     → el usuario firma la tx completa (es el source → require_auth() satisfecho implícitamente)
 *
 *  3. POST /api/records/:id/submit-on-chain
 *     → backend envuelve la inner tx firmada en una fee-bump tx (admin paga fees)
 *     → admin firma y envía a Stellar, espera confirmación, actualiza MongoDB
 *     → devuelve el registro actualizado con stellarTxHash e isOnChain=true
 */

import { StellarWalletsKit } from '@creit-tech/stellar-wallets-kit/sdk';
import { Networks } from '@creit-tech/stellar-wallets-kit/types';
import apiClient from './axios-client';
import { RecordResponse } from './records';

export class BlockchainRecordError extends Error {
  constructor(
    message: string,
    public readonly code: 'WALLET_NOT_AVAILABLE' | 'USER_REJECTED' | 'NETWORK_ERROR' | 'CONTRACT_ERROR',
  ) {
    super(message);
    this.name = 'BlockchainRecordError';
  }
}

/**
 * Ancla un registro clínico existente en el contrato Soroban.
 *
 * El usuario firma la inner tx completa con su wallet activa (sin signAuthEntry).
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

  // 2. Usuario firma la tx completa con su wallet activa
  let signedInnerTxXdr: string;
  try {
    const result = await StellarWalletsKit.signTransaction(innerTxXdr, {
      networkPassphrase: Networks.TESTNET,
      address: userWallet,
    });

    signedInnerTxXdr = result.signedTxXdr;
  } catch (err) {
    if (err instanceof BlockchainRecordError) throw err;

    const msg = err instanceof Error ? err.message : String(err);
    if (msg.toLowerCase().includes('user declined') || msg.toLowerCase().includes('rejected')) {
      throw new BlockchainRecordError('Firma cancelada por el usuario.', 'USER_REJECTED');
    }
    throw new BlockchainRecordError(
      'No se pudo firmar la transacción. Asegúrate de tener tu wallet conectada.',
      'WALLET_NOT_AVAILABLE',
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
