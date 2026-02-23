/**
 * useFreighter — Hook para integración con Freighter Wallet
 *
 * Proporciona:
 * - Conexión con Freighter
 * - Firma de mensajes para autenticación
 * - Firma de transacciones Soroban
 * - Estado de conexión
 */

import { useState, useEffect, useCallback } from 'react';
import { isConnected, getAddress, signMessage, signTransaction } from '@stellar/freighter-api';

export interface FreighterState {
  isInstalled: boolean;
  isConnected: boolean;
  publicKey: string | null;
  isLoading: boolean;
  error: string | null;
}

export function useFreighter() {
  const [state, setState] = useState<FreighterState>({
    isInstalled: false,
    isConnected: false,
    publicKey: null,
    isLoading: true,
    error: null,
  });

  // Verificar si Freighter está instalado y conectado
  useEffect(() => {
    const checkFreighter = async () => {
      try {
        const connResult = await isConnected();

        if (connResult.isConnected) {
          const addrResult = await getAddress();
          setState({
            isInstalled: true,
            isConnected: true,
            publicKey: addrResult.address ?? null,
            isLoading: false,
            error: null,
          });
        } else {
          setState({
            isInstalled: true,
            isConnected: false,
            publicKey: null,
            isLoading: false,
            error: null,
          });
        }
      } catch (error) {
        setState({
          isInstalled: false,
          isConnected: false,
          publicKey: null,
          isLoading: false,
          error: 'Freighter wallet not installed',
        });
      }
    };

    checkFreighter();
  }, []);

  /**
   * Conectar con Freighter (solicita permiso al usuario)
   */
  const connect = useCallback(async (): Promise<string | null> => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      const connResult = await isConnected();
      if (!connResult.isConnected) {
        throw new Error('Please install Freighter wallet extension');
      }

      const addrResult = await getAddress();
      const pubKey = addrResult.address ?? null;

      setState({
        isInstalled: true,
        isConnected: true,
        publicKey: pubKey,
        isLoading: false,
        error: null,
      });

      return pubKey;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to connect to Freighter';
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      return null;
    }
  }, []);

  /**
   * Firmar un mensaje con Freighter (para autenticación)
   */
  const sign = useCallback(
    async (message: string): Promise<string | null> => {
      if (!state.publicKey) {
        throw new Error('Wallet not connected');
      }

      try {
        const result = await signMessage(message);
        const signedMsg = result.signedMessage;
        if (!signedMsg) return null;
        // signedMessage puede ser Buffer (v3) o string (v4)
        return typeof signedMsg === 'string' ? signedMsg : signedMsg.toString('base64');
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to sign message';
        setState((prev) => ({ ...prev, error: errorMessage }));
        return null;
      }
    },
    [state.publicKey]
  );

  /**
   * Firmar una transacción XDR con Freighter
   */
  const signTx = useCallback(
    async (
      xdr: string,
      options?: {
        networkPassphrase?: string;
        address?: string;
      }
    ): Promise<string | null> => {
      if (!state.publicKey) {
        throw new Error('Wallet not connected');
      }

      try {
        const result = await signTransaction(xdr, options);
        return result.signedTxXdr ?? null;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to sign transaction';
        setState((prev) => ({ ...prev, error: errorMessage }));
        return null;
      }
    },
    [state.publicKey]
  );

  /**
   * Desconectar (limpiar estado local)
   */
  const disconnect = useCallback(() => {
    setState({
      isInstalled: state.isInstalled,
      isConnected: false,
      publicKey: null,
      isLoading: false,
      error: null,
    });
  }, [state.isInstalled]);

  return {
    ...state,
    connect,
    sign,
    signTx,
    disconnect,
  };
}
