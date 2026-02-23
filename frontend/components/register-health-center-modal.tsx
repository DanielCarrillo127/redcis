'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/contexts/auth-context';
import { registerHealthCenter } from '@/lib/api';
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
import { AlertCircle, Building2, CheckCircle2, Loader2 } from 'lucide-react';

const COUNTRY_OPTIONS = [
  { code: 'CO', name: 'Colombia' },
];

interface RegisterHealthCenterModalProps {
  open: boolean;
  onClose: () => void;
  onRegistered: () => void;
}

export function RegisterHealthCenterModal({
  open,
  onClose,
  onRegistered,
}: RegisterHealthCenterModalProps) {
  const { token } = useAuth();
  const [wallet, setWallet] = useState('');
  const [name, setName] = useState('');
  const [nit, setNit] = useState('');
  const [country, setCountry] = useState('CO');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const resetForm = () => {
    setWallet('');
    setName('');
    setNit('');
    setCountry('CO');
    setEmail('');
    setError(null);
    setSuccess(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wallet.trim() || !name.trim() || !nit.trim() || !country) {
      setError('Wallet, nombre, NIT y país son obligatorios');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      await registerHealthCenter({
        wallet: wallet.trim(),
        name: name.trim(),
        nit: nit.trim(),
        country,
        ...(email.trim() ? { email: email.trim() } : {}),
      });

      setSuccess(true);
      setTimeout(() => {
        onRegistered();
      }, 1500);
    } catch (err: any) {
      // Map known backend errors to Spanish messages
      const msg: string = err?.response?.data?.error ?? err?.message ?? '';
      const status = err?.response?.status;

      if (msg.includes('wallet ya registrada') || status === 409 && msg.includes('wallet')) {
        setError('La wallet ya está registrada en el sistema');
      } else if (msg.includes('NIT ya registrado') || status === 409 && msg.includes('NIT')) {
        setError('El NIT ingresado ya está registrado');
      } else if (status === 403) {
        setError('No tienes permisos de administrador');
      } else {
        setError(msg || 'Error al registrar el centro de salud');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <DialogTitle>Registrar Centro de Salud</DialogTitle>
          </div>
          <DialogDescription>
            Pre-registra la wallet del centro de salud para que pueda autenticarse en el sistema.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7 text-green-600 dark:text-green-400" />
            </div>
            <p className="font-semibold">Centro de salud registrado</p>
            <p className="text-sm text-muted-foreground">
              La wallet ya puede autenticarse como centro de salud.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label htmlFor="hc-wallet">Wallet Stellar (G...) *</Label>
              <Input
                id="hc-wallet"
                placeholder="GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                value={wallet}
                onChange={(e) => setWallet(e.target.value)}
                disabled={isLoading}
                className="font-mono text-xs"
                required
              />
              <p className="text-xs text-muted-foreground">
                Public key Stellar del centro de salud (empieza en G)
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="hc-name">Nombre del centro *</Label>
              <Input
                id="hc-name"
                placeholder="Ej: Clínica Central"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="hc-nit">NIT *</Label>
                <Input
                  id="hc-nit"
                  placeholder="Ej: 900123456-1"
                  value={nit}
                  onChange={(e) => setNit(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="hc-country">País *</Label>
                <select
                  id="hc-country"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  disabled={isLoading}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  required
                >
                  {COUNTRY_OPTIONS.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="hc-email">Email de contacto (opcional)</Label>
              <Input
                id="hc-email"
                type="email"
                placeholder="contacto@clinica.com"
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

            <div className="flex gap-3 pt-1">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={handleClose}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button type="submit" className="flex-1" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Registrando...
                  </>
                ) : (
                  'Registrar centro'
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
