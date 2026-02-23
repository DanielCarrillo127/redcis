'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getAddress, signTransaction, isConnected, setAllowed } from '@stellar/freighter-api';
import { User, AuthSession } from '@/lib/types';
import { getNonce, verifySignature, getMe } from '@/lib/api';

const STORAGE_KEY = 'redcis_session';

interface AuthContextType {
  currentUser: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitializing: boolean;
  /** Full Freighter Web3 login flow */
  loginWithFreighter: () => Promise<{ isNewUser: boolean }>;
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

  // Restore session from localStorage on mount and validate with backend
  useEffect(() => {
    const validateSession = async () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const session: AuthSession = JSON.parse(raw);
          setToken(session.token);

          // Validate session with backend using /me endpoint
          try {
            const user = await getMe();
            setCurrentUser(user);
          } catch (error) {
            // If validation fails, clear session
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
        // Session validation complete
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
  }, []);

  const updateUser = useCallback((updates: Partial<User>) => {
    setCurrentUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...updates };
      // Persist updated session
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

  const loginWithFreighter = useCallback(async (): Promise<{ isNewUser: boolean }> => {
    setIsLoading(true);
    try {
      // 1. Verify Freighter is installed
      const { isConnected: hasWallet } = await isConnected();
      if (!hasWallet) {
        throw new Error('Instala la extensión Freighter para continuar');
      }

      // 2. Request permission (first time)
      await setAllowed();

      // 3. Get wallet address
      const { address: wallet } = await getAddress();
      if (!wallet) {
        throw new Error('No se pudo obtener la dirección de la wallet');
      }

      // 4. Get nonce and transaction from backend
      const { data: { transaction: txXdr } } = await getNonce(wallet);

      // 5. Sign transaction with Freighter
      const { signedTxXdr } = await signTransaction(txXdr, {
        networkPassphrase: 'Test SDF Network ; September 2015',
        address: wallet
      });

      // 6. Verify signature and get JWT
      const { data } = await verifySignature(wallet, signedTxXdr);
      const { token: newToken, user: backendUser, isNewUser } = data;

      // 7. Build local user object and persist session
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

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        token,
        isAuthenticated: !!currentUser && !!token,
        isLoading,
        isInitializing,
        loginWithFreighter,
        logout,
        updateUser,
      }}
    >
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
