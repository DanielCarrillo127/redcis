'use client';

import { CheckCircle2, Clock, FlaskConical, Stethoscope, Eye, FileText, Shield } from 'lucide-react';

const mockRecords = [
  {
    type: 'Diagnóstico',
    icon: Stethoscope,
    date: '15 mar 2026',
    desc: 'Hipertensión arterial grado I. Manejo ambulatorio.',
    verified: true,
    hash: 'a3f8c2d1...',
  },
  {
    type: 'Resultado de Laboratorio',
    icon: FlaskConical,
    date: '10 mar 2026',
    desc: 'Hemograma completo. Valores dentro del rango normal.',
    verified: false,
    hash: 'b7e4a9f2...',
  },
  {
    type: 'Prescripción',
    icon: Shield,
    date: '8 mar 2026',
    desc: 'Losartán 50mg. 1 tableta diaria. Control en 30 días.',
    verified: true,
    hash: 'c1d5b3e8...',
  },
];

export function HeroDashboardMockup() {
  return (
    <div className="relative w-full select-none pointer-events-none">
      {/* Browser chrome */}
      <div className="rounded-2xl border border-border/60 bg-card shadow-2xl overflow-hidden">
        {/* Title bar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40 bg-muted/40">
          <div className="flex gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-400/70" />
            <span className="w-3 h-3 rounded-full bg-amber-400/70" />
            <span className="w-3 h-3 rounded-full bg-green-400/70" />
          </div>
          <div className="flex-1 mx-4">
            <div className="h-5 rounded-md bg-muted/80 text-[10px] text-muted-foreground/60 flex items-center px-3 font-mono">
              redcis.app/dashboard/patient
            </div>
          </div>
        </div>

        {/* App layout */}
        <div className="flex h-[360px]">
          {/* Sidebar */}
          <div className="w-44 border-r border-border/30 bg-background/60 p-3 flex flex-col gap-1 shrink-0">
            <div className="flex items-center gap-2 px-2 py-2 mb-3">
              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-primary text-[10px] font-bold">MG</div>
              <div>
                <p className="text-[10px] font-semibold leading-none">María García</p>
                <p className="text-[9px] text-muted-foreground mt-0.5">GARC...A8F2</p>
              </div>
            </div>
            {[
              { label: 'Mi Historial', active: true },
              { label: 'Agregar Registro', active: false },
              { label: 'Accesos', active: false },
              { label: 'Perfil', active: false },
            ].map(({ label, active }) => (
              <div
                key={label}
                className={`px-2.5 py-1.5 rounded-lg text-[10px] font-medium ${
                  active
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground'
                }`}
              >
                {label}
              </div>
            ))}
          </div>

          {/* Main content */}
          <div className="flex-1 p-4 overflow-hidden bg-muted/10">
            {/* Page header */}
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-bold">Mi Historial Clínico</p>
                <p className="text-[9px] text-muted-foreground">Todos tus registros verificables</p>
              </div>
              <div className="px-2 py-1 rounded-lg bg-primary text-primary-foreground text-[9px] font-medium">
                + Nuevo
              </div>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              {[
                { label: 'Accesos', value: '2', icon: Eye },
                { label: 'Registros', value: '5', icon: FileText },
                { label: 'On-chain', value: '3', icon: CheckCircle2, green: true },
              ].map(({ label, value, icon: Icon, green }) => (
                <div key={label} className="p-2 rounded-lg border border-border/50 bg-card">
                  <p className="text-[8px] text-muted-foreground uppercase tracking-wide">{label}</p>
                  <p className={`text-sm font-bold ${green ? 'text-secondary' : ''}`}>{value}</p>
                  <Icon className={`w-3 h-3 mt-0.5 ${green ? 'text-secondary/60' : 'text-muted-foreground/50'}`} />
                </div>
              ))}
            </div>

            {/* Records */}
            <div className="space-y-2">
              {mockRecords.map((rec) => (
                <div key={rec.hash} className="p-2.5 rounded-lg border border-border/50 bg-card">
                  <div className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                      <rec.icon className="w-3 h-3 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-[9px] font-semibold truncate">{rec.type}</p>
                        {rec.verified ? (
                          <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-secondary/10 text-secondary text-[8px] font-medium border border-secondary/20 shrink-0">
                            <CheckCircle2 className="w-2 h-2" /> On-chain
                          </span>
                        ) : (
                          <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground text-[8px] border border-border shrink-0">
                            <Clock className="w-2 h-2" /> Pendiente
                          </span>
                        )}
                      </div>
                      <p className="text-[8px] text-muted-foreground mt-0.5">{rec.date}</p>
                      <p className="text-[8px] text-muted-foreground/70 truncate mt-0.5">{rec.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Floating verified badge */}
      <div className="absolute -bottom-3 -right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground text-[10px] font-semibold shadow-lg border border-secondary/20">
        <CheckCircle2 className="w-3 h-3" />
        Verificado en Stellar
      </div>

      {/* Floating wallet badge */}
      <div className="absolute -top-3 -left-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-border text-[10px] font-mono text-muted-foreground shadow-lg">
        GARC...A8F2
      </div>
    </div>
  );
}
