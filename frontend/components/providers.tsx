'use client';

import { AuthProvider } from '@/lib/contexts/auth-context';
import { BlockchainProvider } from '@/lib/contexts/blockchain-context';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <BlockchainProvider>
        {children}
      </BlockchainProvider>
    </AuthProvider>
  );
}
