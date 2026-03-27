'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/lib/contexts/auth-context';
import { useMounted } from '@/lib/hooks/use-mounted';
import { getDashboardPath } from '@/lib/constants/roles';
import { Button } from '@/components/ui/button';
import { Wallet, AlertCircle, Loader2, ShieldCheck, Link2, KeyRound } from 'lucide-react';

export default function LoginPage() {
  const { loginWithWallet, isAuthenticated, isLoading, currentUser, isInitializing } = useAuth();
  const router = useRouter();
  const mounted = useMounted();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isInitializing && isAuthenticated && currentUser) {
      router.push(getDashboardPath(currentUser.role));
    }
  }, [isAuthenticated, currentUser, router, isInitializing]);

  const handleConnect = async () => {
    setError(null);
    try {
      await loginWithWallet();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : (err as { message?: string })?.message;
      // Ignore "user closed the modal" — not an error
      if (msg && msg.toLowerCase().includes('closed')) return;
      setError(msg ?? 'Error desconocido al conectar');
    }
  };

  if (!mounted || isInitializing) return null;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-72 h-72 bg-primary opacity-10 rounded-full blur-3xl animate-pulse" />
        <div
          className="absolute bottom-0 left-0 w-72 h-72 bg-secondary opacity-10 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: '1s' }}
        />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="mb-8 text-center">
          <Link href="/">
            <div className="flex items-center justify-center gap-3 mb-6">
              <Image src="/logo.png" alt="redcis" width={48} height={48} className="w-12 h-12" />
              <h1 className="text-2xl font-bold">Redcis</h1>
            </div>
          </Link>
          <h2 className="text-3xl font-bold mb-2">Conectar Wallet</h2>
          <p className="text-muted-foreground">
            Usa tu wallet Stellar para autenticarte de forma segura y sin contraseña
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-8 space-y-6">
          {/* Wallets compatibles */}
          <div className="flex items-start gap-4 p-4 rounded-xl bg-muted/50 border border-border/60">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
              <Wallet className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-sm">Wallets compatibles</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Freighter · xBull · Albedo · Rabet · Lobstr · WalletConnect · y más
              </p>
            </div>
          </div>

          {/* Pasos */}
          <ol className="space-y-3 text-sm text-muted-foreground">
            {[
              { icon: Wallet,       text: 'Selecciona tu wallet Stellar en el modal' },
              { icon: KeyRound,     text: 'Firma un mensaje de autenticación' },
              { icon: ShieldCheck,  text: 'Accede a la plataforma de forma segura' },
            ].map(({ icon: Icon, text }, i) => (
              <li key={i} className="flex items-center gap-3">
                <span className="shrink-0 w-5 h-5 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <Icon className="w-3.5 h-3.5 shrink-0 text-muted-foreground/70" />
                {text}
              </li>
            ))}
          </ol>

          {error && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-sm text-destructive">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <Button onClick={handleConnect} size="lg" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Conectando...
              </>
            ) : (
              <>
                <Link2 className="w-4 h-4" />
                Conectar Wallet
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Al conectar aceptas que se registre tu wallet en Redcis. Sin contraseñas, sin custodios.
          </p>
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link href="/" className="text-primary hover:underline">
            Volver al inicio
          </Link>
        </p>
      </div>
    </div>
  );
}
