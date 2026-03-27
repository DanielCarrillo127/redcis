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
import { HC_NAV_ITEMS } from '@/lib/constants/navigation';
import { Copy, CheckCircle2, Building2, Pencil, X, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { updateProfile } from '@/lib/api/identity';

type EditableField = 'name' | 'email';

export default function HealthCenterProfilePage() {
  const { currentUser, isInitializing, updateUser } = useAuth();
  const mounted = useMounted();
  useRouteGuard({ requiredRole: 'health_center' });

  const [copiedId, setCopiedId] = useState(false);
  const [copiedWallet, setCopiedWallet] = useState(false);
  const [copiedNit, setCopiedNit] = useState(false);
  const [editing, setEditing] = useState<EditableField | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    if (type === 'id') setCopiedId(true);
    else if (type === 'wallet') setCopiedWallet(true);
    else if (type === 'nit') setCopiedNit(true);
    toast.success('Copiado al portapapeles');
    setTimeout(() => { setCopiedId(false); setCopiedWallet(false); setCopiedNit(false); }, 1000);
  };

  const startEdit = (field: EditableField) => {
    setEditing(field);
    setEditValue(currentUser?.[field] || '');
  };

  const cancelEdit = () => {
    setEditing(null);
    setEditValue('');
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await updateProfile({ [editing]: editValue });
      updateUser({ [editing]: editValue });
      toast.success('Perfil actualizado');
      setEditing(null);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Error al actualizar el perfil';
      toast.error(msg);
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
    <DashboardLayout navItems={HC_NAV_ITEMS}>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Perfil del Centro de Salud</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Información de tu institución en la plataforma</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Información Institucional
            </CardTitle>
            <CardDescription>
              Haz clic en el ícono de lápiz para editar nombre o email
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Nombre */}
              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Nombre del Centro</label>
                {editing === 'name' ? (
                  <div className="flex items-center gap-1 mt-1">
                    <Input autoFocus value={editValue} onChange={(e) => setEditValue(e.target.value)} onKeyDown={handleKeyDown} className="h-8 text-sm" />
                    <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={saveEdit} disabled={saving}>
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 text-secondary" />}
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={cancelEdit} disabled={saving}>
                      <X className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-sm">{currentUser.name}</p>
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground" onClick={() => startEdit('name')}>
                      <Pencil className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Rol */}
              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Rol</label>
                <div className="mt-1">
                  <Badge variant="secondary">Centro de Salud</Badge>
                </div>
              </div>

              {/* NIT */}
              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">NIT</label>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-sm font-mono text-muted-foreground">
                    {currentUser.nit || 'No configurado'}
                  </p>
                  {currentUser.nit && (
                    <Button variant="ghost" size="sm" onClick={() => copyToClipboard(currentUser.nit!, 'nit')}>
                      {copiedNit ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  )}
                </div>
              </div>

              {/* País */}
              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">País</label>
                <p className="text-sm mt-1">
                  {currentUser.country === 'CO' ? 'Colombia' : currentUser.country || 'No configurado'}
                </p>
              </div>

              {/* Email */}
              <div className="md:col-span-2">
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Email de Contacto</label>
                {editing === 'email' ? (
                  <div className="flex items-center gap-1 mt-1">
                    <Input autoFocus type="email" value={editValue} onChange={(e) => setEditValue(e.target.value)} onKeyDown={handleKeyDown} className="h-8 text-sm" />
                    <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={saveEdit} disabled={saving}>
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 text-secondary" />}
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={cancelEdit} disabled={saving}>
                      <X className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-sm">
                      {currentUser.email || 'No configurado'}
                    </p>
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground" onClick={() => startEdit('email')}>
                      <Pencil className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>

            </div>
          </CardContent>
        </Card>

        {/* Blockchain */}
        <Card>
          <CardHeader>
            <CardTitle>Información de Blockchain</CardTitle>
            <CardDescription>Datos de tu wallet y conexión blockchain</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Center ID</label>
              <div className="flex items-center gap-2 mt-1">
                <code className="flex-1 px-3 py-2 rounded-lg bg-muted text-sm font-mono break-all">{currentUser.id}</code>
                <Button variant="ghost" size="sm" onClick={() => copyToClipboard(currentUser.id, 'id')}>
                  {copiedId ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Wallet ID (Stellar)</label>
              <div className="flex items-center gap-2 mt-1">
                <code className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-muted text-sm font-mono break-all">{currentUser.wallet}</code>
                <Button variant="ghost" size="sm" onClick={() => copyToClipboard(currentUser.wallet, 'wallet')}>
                  {copiedWallet ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Wallet address de Freighter registrada en el sistema
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Seguridad */}
        <Card>
          <CardHeader>
            <CardTitle>Seguridad y Permisos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              {[
                { title: 'Autenticación Web3', desc: 'Tu institución está autenticada mediante firma criptográfica de Freighter' },
                { title: 'Acceso Controlado', desc: 'Solo puedes acceder a registros de pacientes que te otorguen permisos explícitos' },
                { title: 'Trazabilidad Total', desc: 'Todos tus accesos y registros quedan auditados en blockchain' },
                { title: 'Registros Inmutables', desc: 'Los registros clínicos que crees tienen hash SHA-256 verificable' },
                { title: 'Pre-registro Admin', desc: 'Tu institución fue pre-registrada por un administrador del sistema' },
              ].map(({ title, desc }) => (
                <div key={title} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">{title}</p>
                    <p className="text-muted-foreground">{desc}</p>
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
