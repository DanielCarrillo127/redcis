'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { StellarWalletsKit } from '@creit-tech/stellar-wallets-kit/sdk';
import { Networks } from '@creit-tech/stellar-wallets-kit/types';
import { defaultModules } from '@creit-tech/stellar-wallets-kit/modules/utils';
import { User, AuthSession } from '@/lib/types';
import { getNonce, verifySignature, getMe } from '@/lib/api';

const STORAGE_KEY = 'redcis_session';

interface AuthContextType {
  currentUser: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitializing: boolean;
  /** Web3 login flow — opens wallet selector modal (Freighter, xBull, Albedo, etc.) */
  loginWithWallet: () => Promise<{ isNewUser: boolean }>;
  logout: () => void;
  /** Update local user data after profile completion */
  updateUser: (user: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // Initialize SWK and restore session on mount
  useEffect(() => {
    StellarWalletsKit.init({
      modules: defaultModules(),
      network: Networks.TESTNET,
    });

    const validateSession = async () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const session: AuthSession = JSON.parse(raw);
          setToken(session.token);
          try {
            const user = await getMe();
            setCurrentUser(user);
          } catch (error) {
            console.error('Session validation failed:', error);
            localStorage.removeItem(STORAGE_KEY);
            setCurrentUser(null);
            setToken(null);
          }
        }
      } catch (error) {
        console.error('Error restoring session:', error);
        localStorage.removeItem(STORAGE_KEY);
      } finally {
        setIsInitializing(false);
      }
    };

    validateSession();
  }, []);

  const persistSession = (session: AuthSession) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    setCurrentUser(session.user);
    setToken(session.token);
  };

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setCurrentUser(null);
    setToken(null);
    StellarWalletsKit.disconnect();
  }, []);

  const updateUser = useCallback((updates: Partial<User>) => {
    setCurrentUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...updates };
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        try {
          const session: AuthSession = JSON.parse(raw);
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...session, user: updated }));
        } catch { /* ignore */ }
      }
      return updated;
    });
  }, []);

  const loginWithWallet = useCallback(async (): Promise<{ isNewUser: boolean }> => {
    setIsLoading(true);
    try {
      // 1. Open wallet selector modal — user picks their wallet (Freighter, xBull, Albedo…)
      const { address: wallet } = await StellarWalletsKit.authModal();
      if (!wallet) throw new Error('No se pudo obtener la dirección de la wallet');

      // 2. Get nonce and unsigned transaction from backend
      const { data: { transaction: txXdr } } = await getNonce(wallet);

      // 3. Sign transaction with the selected wallet
      const { signedTxXdr } = await StellarWalletsKit.signTransaction(txXdr, {
        networkPassphrase: Networks.TESTNET,
        address: wallet,
      });

      // 4. Verify signature and receive JWT
      const { data } = await verifySignature(wallet, signedTxXdr);
      const { token: newToken, user: backendUser, isNewUser } = data;

      // 5. Build local user object and persist session
      const user: User = {
        id: backendUser.userId,
        name: backendUser.name ?? '',
        role: backendUser.role as User['role'],
        wallet: backendUser.wallet,
        email: backendUser.email,
        isNewUser,
      };

      persistSession({ token: newToken, user });
      return { isNewUser };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const contextValue = useMemo(
    () => ({
      currentUser,
      token,
      isAuthenticated: !!currentUser && !!token,
      isLoading,
      isInitializing,
      loginWithWallet,
      logout,
      updateUser,
    }),
    [currentUser, token, isLoading, isInitializing, loginWithWallet, logout, updateUser],
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
