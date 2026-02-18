'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, DEMO_PATIENT, DEMO_HEALTH_CENTER } from '@/lib/types';

interface AuthContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  login: (user: User) => void;
  logout: () => void;
  loginAsPatient: () => void;
  loginAsHealthCenter: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Load user from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('healthcare_user');
    if (storedUser) {
      try {
        setCurrentUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('healthcare_user');
      }
    }
  }, []);

  const login = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('healthcare_user', JSON.stringify(user));
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('healthcare_user');
  };

  const loginAsPatient = () => {
    login(DEMO_PATIENT);
  };

  const loginAsHealthCenter = () => {
    login(DEMO_HEALTH_CENTER);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated: !!currentUser,
        login,
        logout,
        loginAsPatient,
        loginAsHealthCenter,
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
