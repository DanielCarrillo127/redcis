'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/contexts/auth-context';
import { useMounted } from '@/lib/hooks/use-mounted';
import { useRouteGuard } from '@/lib/hooks/use-route-guard';
import { PATIENT_NAV_ITEMS } from '@/lib/constants/navigation';
import { updateProfile } from '@/lib/api/identity';
import {
  Copy,
  CheckCircle2,
  Pencil,
  X,
  Check,
  Loader2,
  SquareUserRound,
} from 'lucide-react';
import { toast } from 'sonner';

type EditableField = 'name' | 'email';

export default function ProfilePage() {
  const { currentUser, isInitializing, updateUser } = useAuth();
  const mounted = useMounted();
  useRouteGuard({ requiredRole: 'individual' });

  const [copiedId, setCopiedId] = useState(false);
  const [copiedWallet, setCopiedWallet] = useState(false);
  const [editing, setEditing] = useState<EditableField | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    if (type === 'id') setCopiedId(true);
    else setCopiedWallet(true);
    toast.success('Copiado al portapapeles');
    setTimeout(() => { setCopiedId(false); setCopiedWallet(false); }, 1000);
  };

  const startEdit = (field: EditableField) => {
    setEditing(field);
    setEditValue(currentUser?.[field] || '');
  };

  const cancelEdit = () => { setEditing(null); setEditValue(''); };

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await updateProfile({ [editing]: editValue });
      updateUser({ [editing]: editValue });
      toast.success('Perfil actualizado');
      setEditing(null);
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { error?: string } } };
      toast.error(axiosError.response?.data?.error || 'Error al actualizar el perfil');
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') saveEdit();
    if (e.key === 'Escape') cancelEdit();
  };

  if (!mounted || isInitializing || !currentUser) return null;

  return (
    <DashboardLayout navItems={PATIENT_NAV_ITEMS}>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mi Perfil</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Información de tu cuenta en la plataforma</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SquareUserRound className="w-5 h-5" />
              Información Personal
            </CardTitle>
            <CardDescription>Haz clic en el ícono para editar nombre o email</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Nombre */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nombre Completo</label>
                {editing === 'name' ? (
                  <div className="flex items-center gap-1 mt-1.5">
                    <Input autoFocus value={editValue} onChange={(e) => setEditValue(e.target.value)} onKeyDown={handleKeyDown} className="h-8 text-sm" />
                    <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={saveEdit} disabled={saving}>
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 text-secondary" />}
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={cancelEdit} disabled={saving}>
                      <X className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mt-1.5">
                    <p className="text-sm">{currentUser.name}</p>
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={() => startEdit('name')}>
                      <Pencil className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Wallet */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Wallet Stellar</label>
                <p className="text-xs font-mono mt-1.5 break-all text-muted-foreground">{currentUser.wallet}</p>
              </div>

              {/* Rol */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Rol</label>
                <div className="mt-1.5"><Badge variant="secondary">Paciente</Badge></div>
              </div>

              {/* Email */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Email</label>
                {editing === 'email' ? (
                  <div className="flex items-center gap-1 mt-1.5">
                    <Input autoFocus type="email" value={editValue} onChange={(e) => setEditValue(e.target.value)} onKeyDown={handleKeyDown} className="h-8 text-sm" />
                    <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={saveEdit} disabled={saving}>
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 text-secondary" />}
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={cancelEdit} disabled={saving}>
                      <X className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mt-1.5">
                    <p className="text-sm text-muted-foreground">{currentUser.email || 'No configurado'}</p>
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={() => startEdit('email')}>
                      <Pencil className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Información de Blockchain</CardTitle>
            <CardDescription>Datos de tu wallet y conexión blockchain</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">User ID</label>
              <div className="flex items-center gap-2 mt-1.5">
                <code className="flex-1 px-3 py-2 rounded-lg bg-muted text-xs font-mono break-all">{currentUser.id}</code>
                <Button variant="ghost" size="sm" className="shrink-0" onClick={() => copyToClipboard(currentUser.id, 'id')}>
                  {copiedId ? <CheckCircle2 className="w-4 h-4 text-secondary" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Wallet ID</label>
              <div className="flex items-center gap-2 mt-1.5">
                <code className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-muted text-xs font-mono break-all">{currentUser.wallet}</code>
                <Button variant="ghost" size="sm" className="shrink-0" onClick={() => copyToClipboard(currentUser.wallet, 'wallet')}>
                  {copiedWallet ? <CheckCircle2 className="w-4 h-4 text-secondary" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Tu dirección de wallet Freighter en Stellar</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/15 bg-primary/3">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Seguridad y Privacidad</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              {[
                { title: 'Datos Encriptados', desc: 'Tu información está protegida con criptografía de clave pública' },
                { title: 'Hash Verificable', desc: 'Cada registro tiene un hash SHA-256 único e inmodificable' },
                { title: 'Control Total', desc: 'Solo tú controlas quién accede a tu información' },
                { title: 'Auditoría Completa', desc: 'Todos los accesos quedan registrados en blockchain' },
              ].map(({ title, desc }) => (
                <div key={title} className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">{title}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
