'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/lib/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Wallet, AlertCircle, Loader2, ExternalLink } from 'lucide-react';

export default function LoginPage() {
  const { loginWithFreighter, isAuthenticated, isLoading, currentUser, isInitializing } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Only redirect after initialization is complete
    if (!isInitializing && isAuthenticated && currentUser) {
      if (currentUser.role === 'health_center') {
        router.push('/dashboard/health-center');
      } else if (currentUser.role === 'admin') {
        router.push('/dashboard/admin');
      } else {
        router.push('/dashboard/patient');
      }
    }
  }, [isAuthenticated, currentUser, router, isInitializing]);

  if (!mounted || isInitializing) return null;

  const handleConnect = async () => {
    setError(null);
    try {
      await loginWithFreighter();
      // Redirect is handled by the useEffect above after state updates
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error desconocido al conectar';
      setError(message);
    }
  };

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
        {/* Logo */}
        <div className="mb-8 text-center">
          <Link href="/">
            <div className="flex items-center justify-center gap-3 mb-6">
              <Image src="/logo.png" alt="redcis" width={48} height={48} className="w-12 h-12" />
              <h1 className="text-2xl font-bold">Redcis</h1>
            </div>
          </Link>
          <h2 className="text-3xl font-bold mb-2">Conectar Wallet</h2>
          <p className="text-muted-foreground">
            Usa tu wallet Stellar para autenticarte de forma segura
          </p>
        </div>

        {/* Connect Card */}
        <div className="rounded-2xl border border-border bg-card p-8 space-y-6">
          {/* Freighter info */}
          <div className="flex items-start gap-4 p-4 rounded-xl bg-muted/50 border border-border/60">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
              <Wallet className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-sm">Freighter Wallet</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Extensión de navegador para Stellar Network
              </p>
              <a
                href="https://www.freighter.app"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
              >
                Instalar Freighter <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Steps */}
          <ol className="space-y-3 text-sm text-muted-foreground">
            {[
              'Se solicitará permiso a tu wallet Freighter',
              'Firmarás un mensaje de autenticación',
              'Recibirás acceso a la plataforma',
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="shrink-0 w-5 h-5 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-sm text-destructive">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Connect button */}
          <Button
            onClick={handleConnect}
            size="lg"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Conectando...
              </>
            ) : (
              <>
                <Wallet className="w-4 h-4" />
                Conectar con Freighter
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Al conectar aceptas que se registre tu wallet en Redcis
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
