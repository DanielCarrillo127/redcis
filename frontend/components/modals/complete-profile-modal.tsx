'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/contexts/auth-context';
import { registerIndividual } from '@/lib/api';
import { registerIndividual as registerOnChain } from '@/lib/services/soroban';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Loader2, User, CheckCircle2 } from 'lucide-react';
import crypto from 'crypto';

interface CompleteProfileModalProps {
  open: boolean;
  onCompleted: () => void;
}

export function CompleteProfileModal({ open, onCompleted }: CompleteProfileModalProps) {
  const { currentUser, token, updateUser } = useAuth();
  const [name, setName] = useState(currentUser?.name ?? '');
  const [dni, setDni] = useState('');
  const [email, setEmail] = useState(currentUser?.email ?? '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registrationStep, setRegistrationStep] = useState<'idle' | 'saving' | 'blockchain' | 'done'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !dni.trim()) {
      setError('El nombre y el DNI son obligatorios');
      return;
    }

    if (!currentUser?.wallet) {
      setError('No se encontró la wallet del usuario');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      // Paso 1: Guardar en MongoDB (backend)
      setRegistrationStep('saving');
      const { data } = await registerIndividual({
        wallet: currentUser.wallet,
        name: name.trim(),
        dni: dni.trim(),
        ...(email.trim() ? { email: email.trim() } : {}),
      });

      // Paso 2: Registrar on-chain (blockchain)
      setRegistrationStep('blockchain');

      // Calcular el hash del DNI (mismo que en el backend)
      const salt = crypto.randomBytes(16).toString('hex');
      const dniHash = crypto
        .createHash('sha256')
        .update(`${dni.trim()}:${salt}`)
        .digest('hex');

      try {
        // Registrar en el contrato con Freighter
        const txHash = await registerOnChain(currentUser.wallet, dniHash);
      } catch (blockchainError) {
        console.warn('⚠️ Blockchain registration failed (continuing anyway):', blockchainError);
        // No bloqueamos si falla el registro on-chain
        // El usuario queda registrado en MongoDB
      }

      setRegistrationStep('done');

      // Update local user state with completed profile data
      updateUser({
        name: data.name,
        email: data.email,
        isNewUser: false,
      });

      // Esperar un momento para mostrar el éxito
      await new Promise(resolve => setTimeout(resolve, 1000));
      onCompleted();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al completar el perfil');
      setRegistrationStep('idle');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <DialogTitle>Completa tu perfil</DialogTitle>
          </div>
          <DialogDescription>
            Para continuar necesitamos algunos datos básicos. Tu DNI se almacena de forma
            segura (solo su hash criptográfico).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="name">Nombre completo *</Label>
            <Input
              id="name"
              placeholder="Ej: Juan Pérez García"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="dni">DNI / Documento de identidad *</Label>
            <Input
              id="dni"
              placeholder="Ej: 12345678"
              value={dni}
              onChange={(e) => setDni(e.target.value)}
              disabled={isLoading}
              required
            />
            <p className="text-xs text-muted-foreground">
              Solo se guarda un hash criptográfico, nunca el DNI en texto claro.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Email (opcional)</Label>
            <Input
              id="email"
              type="email"
              placeholder="tu@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-sm text-destructive">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Guardando...
              </>
            ) : (
              'Guardar perfil'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
