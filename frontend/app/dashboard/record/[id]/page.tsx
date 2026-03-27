'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard-layout';
import { SkeletonPage } from '@/components/dashboard/skeleton-list';
import { getRecordById, getRecordDocumentBlobUrl, type RecordResponse } from '@/lib/api/records';
import { anchorRecordOnChain, BlockchainRecordError } from '@/lib/api/blockchain-records';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/lib/contexts/auth-context';
import { useMounted } from '@/lib/hooks/use-mounted';
import { PATIENT_NAV_ITEMS, HC_NAV_ITEMS } from '@/lib/constants/navigation';
import { EVENT_TYPE_LABELS } from '@/lib/constants/event-types';
import { toast } from 'sonner';
import {
  ArrowLeft, FileText, CheckCircle2, Clock, Hash,
  User, Building2, Calendar, Download, Loader2,
  AlertCircle, FileImage, FileScan, Link2,
} from 'lucide-react';

// ── document preview ──────────────────────────────────────────────────────────

interface DocumentPreviewProps {
  blobUrl: string | null;
  mimeType: string;
  fileName: string;
  loading: boolean;
}

function DocumentPreview({ blobUrl, mimeType, fileName, loading }: DocumentPreviewProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 border rounded-lg bg-muted/30">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Cargando documento...</span>
      </div>
    );
  }

  if (!blobUrl) return null;

  if (mimeType === 'application/pdf') {
    return (
      <div className="rounded-lg overflow-hidden border">
        <iframe src={blobUrl} title={fileName} className="w-full h-160" />
      </div>
    );
  }

  if (['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) {
    return (
      <div className="rounded-lg overflow-hidden border bg-muted/20 flex items-center justify-center p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={blobUrl} alt={fileName} className="max-w-full max-h-160 rounded object-contain" />
      </div>
    );
  }

  if (mimeType === 'image/dicom') {
    return (
      <div className="flex flex-col items-center justify-center h-48 border rounded-lg bg-muted/30 gap-3 p-6">
        <FileScan className="w-10 h-10 text-muted-foreground opacity-60" />
        <p className="text-sm text-muted-foreground text-center">
          Las imágenes DICOM requieren un visor especializado.
          <br />
          Descarga el archivo para verlo en tu software médico.
        </p>
        <a href={blobUrl} download={fileName}>
          <Button size="sm" variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Descargar DICOM
          </Button>
        </a>
      </div>
    );
  }

  return null;
}

// ── main page ─────────────────────────────────────────────────────────────────

export default function RecordDetailPage() {
  const { currentUser, isAuthenticated, isInitializing } = useAuth();
  const router = useRouter();
  const mounted = useMounted();
  const params = useParams();
  const recordId = params.id as string;

  const [record, setRecord] = useState<RecordResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [docLoading, setDocLoading] = useState(false);
  const [anchoring, setAnchoring] = useState(false);

  useEffect(() => {
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [blobUrl]);

  const loadRecord = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getRecordById(recordId);
      setRecord(data);

      if (data.documentUrl) {
        setDocLoading(true);
        try {
          const url = await getRecordDocumentBlobUrl(recordId);
          setBlobUrl(url);
        } catch {
          // document fetch failed silently — show metadata anyway
        } finally {
          setDocLoading(false);
        }
      }
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 403) setError('No tienes permiso para ver este registro.');
      else if (status === 404) setError('Registro no encontrado.');
      else setError('Error al cargar el registro.');
    } finally {
      setLoading(false);
    }
  }, [recordId]);

  const handleAnchorOnChain = useCallback(async () => {
    if (!currentUser?.wallet) return;
    setAnchoring(true);
    const toastId = toast.loading('Preparando transacción...');
    try {
      const updated = await anchorRecordOnChain(recordId, currentUser.wallet);
      setRecord(updated);
      toast.success('¡Anclado correctamente en Stellar!', { id: toastId });
    } catch (err) {
      if (err instanceof BlockchainRecordError && err.code === 'USER_REJECTED') {
        toast.warning('Firma cancelada. El registro sigue guardado sin anclar.', { id: toastId });
      } else {
        toast.error(
          err instanceof BlockchainRecordError ? err.message : 'Error al anclar el registro.',
          { id: toastId },
        );
      }
    } finally {
      setAnchoring(false);
    }
  }, [recordId, currentUser?.wallet]);

  useEffect(() => {
    if (isInitializing) return;
    if (!isAuthenticated) { router.push('/login'); return; }
    loadRecord();
  }, [recordId, isAuthenticated, isInitializing, loadRecord, router]);

  const navItems = currentUser?.role === 'health_center' ? HC_NAV_ITEMS : PATIENT_NAV_ITEMS;

  if (!mounted || isInitializing || !isAuthenticated || !currentUser) return null;

  if (loading) {
    return (
      <DashboardLayout navItems={navItems}>
        <SkeletonPage />
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout navItems={navItems}>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <AlertCircle className="w-12 h-12 text-destructive opacity-70" />
          <p className="text-muted-foreground">{error}</p>
          <Button variant="outline" onClick={() => router.back()} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Volver
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  if (!record) return null;

  const typeLabel = EVENT_TYPE_LABELS[record.recordType] ?? record.recordType;
  const [year, month, day] = record.eventDate.split('T')[0].split('-').map(Number);
  const formattedDate = new Date(year, month - 1, day).toLocaleDateString('es-ES', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <DashboardLayout navItems={navItems}>
      <div className="max-w-3xl mx-auto space-y-6">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="gap-2 -ml-2">
          <ArrowLeft className="w-4 h-4" />
          Volver
        </Button>

        {/* Header card */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl">{typeLabel}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    {formattedDate}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                {record.isOnChain && record.stellarTxHash ? (
                  <button
                    type="button"
                    className="inline-flex items-center"
                    onClick={() =>
                      window.open(
                        `https://stellar.expert/explorer/testnet/tx/${record.stellarTxHash}`,
                        '_blank', 'noopener,noreferrer',
                      )
                    }
                  >
                    <Badge className="bg-secondary/10 text-secondary border border-secondary/30 hover:bg-secondary/20 cursor-pointer">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Verificado on-chain
                    </Badge>
                  </button>
                ) : (
                  <>
                    <Badge variant="outline" className="bg-muted/40 text-muted-foreground">
                      <Clock className="w-3 h-3 mr-1" />
                      Pendiente on-chain
                    </Badge>
                    {currentUser?.wallet === record.issuerWallet && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 h-7 text-xs border-primary/40 text-primary hover:bg-primary/5"
                        onClick={handleAnchorOnChain}
                        disabled={anchoring}
                      >
                        {anchoring ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Link2 className="w-3 h-3" />
                        )}
                        {anchoring ? 'Firmando...' : 'Firmar en blockchain'}
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-5">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                Descripción
              </p>
              <p className="text-sm leading-relaxed">{record.description}</p>
            </div>

            {record.details && Object.keys(record.details).length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Detalles Adicionales
                </p>
                <div className="rounded-lg bg-muted/40 p-3 space-y-1">
                  {Object.entries(record.details).map(([key, value]) => (
                    <div key={key} className="flex gap-2 text-sm">
                      <span className="font-medium capitalize text-muted-foreground min-w-20">{key}:</span>
                      <span>{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Metadatos
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-start gap-2 text-sm">
                  <User className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Paciente</p>
                    {record.patientName && <p className="font-medium">{record.patientName}</p>}
                    {record.patientEmail && <p className="text-xs text-muted-foreground">{record.patientEmail}</p>}
                  </div>
                </div>

                {record.source === 'health_center' ? (
                  <div className="flex items-start gap-2 text-sm">
                    <Building2 className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Centro de Salud</p>
                      <p className="font-medium">{record.issuerName ?? record.healthCenterName ?? '—'}</p>
                      {record.issuerEmail && <p className="text-xs text-muted-foreground">{record.issuerEmail}</p>}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2 text-sm">
                    <User className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Origen</p>
                      <p className="font-medium text-primary">Auto-reportado</p>
                      <p className="text-xs text-muted-foreground">El paciente registró este evento directamente</p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-2 text-sm sm:col-span-2">
                  <Hash className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Hash del documento (SHA-256)</p>
                    <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded break-all">
                      {record.documentHash}
                    </code>
                  </div>
                </div>

                {record.isOnChain && (
                  <>
                    {record.onChainRecordId !== undefined && (
                      <div className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-secondary mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs text-muted-foreground">ID on-chain</p>
                          <p className="font-mono text-xs">#{record.onChainRecordId}</p>
                        </div>
                      </div>
                    )}
                    {record.stellarTxHash && (
                      <div className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-secondary mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs text-muted-foreground">Stellar TX</p>
                          <a
                            href={`https://stellar.expert/explorer/testnet/tx/${record.stellarTxHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-xs text-primary hover:underline break-all"
                          >
                            {record.stellarTxHash.slice(0, 20)}...
                          </a>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Document section */}
        {record.documentUrl && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileImage className="w-4 h-4" />
                  Documento Adjunto
                  {record.documentName && (
                    <span className="text-sm font-normal text-muted-foreground">
                      — {record.documentName}
                    </span>
                  )}
                </CardTitle>
                {blobUrl && (
                  <a href={blobUrl} download={record.documentName ?? 'documento'}>
                    <Button size="sm" variant="outline" className="gap-2">
                      <Download className="w-4 h-4" />
                      Descargar
                    </Button>
                  </a>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <DocumentPreview
                blobUrl={blobUrl}
                mimeType={record.documentMimeType ?? 'application/octet-stream'}
                fileName={record.documentName ?? 'documento'}
                loading={docLoading}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
