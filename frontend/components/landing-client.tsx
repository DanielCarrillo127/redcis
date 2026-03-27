'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/lib/contexts/auth-context';
import { getDashboardPath } from '@/lib/constants/roles';
import { formatWallet } from '@/lib/utils/wallet';
import { useInView } from '@/lib/hooks/use-in-view';
import { HeroDashboardMockup } from '@/components/landing/hero-mockup';
import { Button } from '@/components/ui/button';
import {
  Shield, Lock, Zap, TrendingDown, CheckCircle2, Globe,
  ArrowRight, Wallet, Users, Database, Activity,
} from 'lucide-react';

// ── Fade-in wrapper ────────────────────────────────────────────────────────────
function FadeIn({
  children, className = '', delay = 0,
}: { children: React.ReactNode; className?: string; delay?: number }) {
  const { ref, inView } = useInView({ threshold: 0.1 });
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

// ── Static data ────────────────────────────────────────────────────────────────
const features = [
  {
    icon: Shield,
    title: 'Control Total',
    description: 'El paciente es dueño real de su información médica.',
    color: 'text-primary bg-primary/10 group-hover:bg-primary/20',
    audience: 'Pacientes',
  },
  {
    icon: Lock,
    title: 'Verificable',
    description: 'Información criptográficamente verificable e inalterable.',
    color: 'text-secondary bg-secondary/10 group-hover:bg-secondary/20',
    audience: 'Ambos',
  },
  {
    icon: Zap,
    title: 'Sin Fricción',
    description: 'Menos fricción entre instituciones de salud.',
    color: 'text-amber-500 bg-amber-500/10 group-hover:bg-amber-500/20',
    audience: 'Centros de salud',
  },
  {
    icon: TrendingDown,
    title: 'Costos Reducidos',
    description: 'Reducción de costos operativos para el sistema de salud.',
    color: 'text-secondary bg-secondary/10 group-hover:bg-secondary/20',
    audience: 'Centros de salud',
  },
  {
    icon: CheckCircle2,
    title: 'Normativa',
    description: 'Cumplimiento normativo y trazabilidad completa de accesos.',
    color: 'text-primary bg-primary/10 group-hover:bg-primary/20',
    audience: 'Ambos',
  },
  {
    icon: Globe,
    title: 'Escalable',
    description: 'Arquitectura lista para escalar a otros países y sistemas.',
    color: 'text-accent bg-accent/10 group-hover:bg-accent/20',
    audience: 'Ambos',
  },
];

const stats = [
  { icon: Users, value: '2,500+', label: 'Pacientes registrados' },
  { icon: Database, value: '120+', label: 'Centros activos' },
  { icon: CheckCircle2, value: '100%', label: 'Datos verificables' },
  { icon: Activity, value: 'Stellar', label: 'Blockchain subyacente' },
];

const steps = [
  { step: '01', title: 'Creación', description: 'La información clínica se registra de forma segura y estructurada.' },
  { step: '02', title: 'Propiedad', description: 'El paciente es el dueño y decide quién puede acceder.' },
  { step: '03', title: 'Verificación', description: 'Cada acceso o cambio es verificable y trazable en blockchain.' },
];

const problemBlocks = [
  {
    title: 'Fragmentación normalizada',
    description: 'Cada institución gestiona su propia versión de la historia clínica. La duplicación, la pérdida de contexto y la falta de continuidad se convierten en parte del flujo cotidiano.',
  },
  {
    title: 'Confianza implícita',
    description: 'El acceso a la información depende de sistemas cerrados, credenciales internas y procesos difíciles de auditar. La confianza se asume, pero rara vez se demuestra.',
  },
  {
    title: 'El paciente fuera del centro',
    description: 'Aunque la información describe al paciente, este no controla quién la usa, cuándo se consulta ni con qué propósito. La titularidad real del dato es difusa.',
  },
];

// ── Component ─────────────────────────────────────────────────────────────────
export function LandingClient() {
  const { isAuthenticated, currentUser } = useAuth();

  const dashboardPath = isAuthenticated && currentUser
    ? getDashboardPath(currentUser.role)
    : '/login';

  const scrollToFeatures = () => {
    document.getElementById('features-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Background blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-40 right-0 w-96 h-96 bg-primary opacity-8 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-secondary opacity-8 rounded-full blur-3xl" />
      </div>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="redcis" width={40} height={40} className="w-10 h-10" />
            <span className="text-xl font-bold">Redcis</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <button onClick={scrollToFeatures} className="hover:text-foreground transition-colors">Características</button>
          </nav>
          <div className="flex items-center gap-3">
            {isAuthenticated && currentUser && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg bg-muted border border-border text-xs font-mono text-muted-foreground">
                <Wallet className="w-3.5 h-3.5 text-primary" />
                {formatWallet(currentUser.wallet)}
              </div>
            )}
            <Link href={dashboardPath}>
              <Button size="sm">
                {isAuthenticated && currentUser ? (
                  <>Dashboard <ArrowRight className="w-4 h-4" /></>
                ) : (
                  <><Wallet className="w-4 h-4" /> Conectar Wallet</>
                )}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 sm:px-6 lg:px-8 pt-16 pb-20 sm:pt-20 sm:pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-xs font-medium text-primary">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              Desplegado en Stellar Testnet
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.05] tracking-tight">
              Historias clínicas{' '}
              <span className="text-transparent bg-clip-text bg-linear-to-r from-primary to-secondary">
                descentralizadas
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-muted-foreground max-w-lg leading-relaxed">
              Control total del paciente sobre su información médica. Verificable,
              inmutable y sin intermediarios — sobre la red Stellar.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link href={dashboardPath} className="w-full sm:w-auto">
                <Button size="lg" className="w-full gap-2">
                  {isAuthenticated && currentUser ? (
                    <>Ir a Dashboard <ArrowRight className="w-4 h-4" /></>
                  ) : (
                    <><Wallet className="w-4 h-4" /> Comenzar ahora</>
                  )}
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="w-full sm:w-auto" onClick={scrollToFeatures}>
                Ver características
              </Button>
            </div>

            <div className="flex items-center gap-8 pt-4 border-t border-border">
              {[
                { value: '100%', label: 'Propiedad del paciente' },
                { value: 'Ed25519', label: 'Firma criptográfica' },
                { value: 'SHA-256', label: 'Hash de documentos' },
              ].map(({ value, label }) => (
                <div key={label}>
                  <p className="text-xl font-bold">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Hero visual — dashboard mockup */}
          <div className="relative px-4 lg:px-0">
            <HeroDashboardMockup />
          </div>
        </div>
      </section>

      {/* ── Stats bar ─────────────────────────────────────────────────────── */}
      <section className="border-y border-border/40 bg-muted/20">
        <div className="max-w-7xl mx-auto px-6 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 divide-x-0 md:divide-x divide-border/40">
            {stats.map(({ icon: Icon, value, label }, i) => (
              <FadeIn key={label} delay={i * 60} className="flex items-center gap-3 justify-center md:justify-start">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-lg font-bold leading-none">{value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────────────────── */}
      <section id="features-section" className="max-w-7xl mx-auto px-6 sm:px-6 lg:px-8 py-24">
        <FadeIn className="text-center space-y-4 mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold">Pilares del sistema</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Características que hacen diferente a Redcis en el ecosistema de salud digital
          </p>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((feature, i) => (
            <FadeIn key={feature.title} delay={i * 80}>
              <div className="group relative p-7 rounded-xl border border-border/50 bg-card/50 hover:border-border hover:shadow-lg hover:bg-card transition-all duration-300 h-full">
                <div className="absolute inset-0 rounded-xl bg-linear-to-br from-primary/3 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className={`inline-flex items-center justify-center w-11 h-11 rounded-lg transition-colors ${feature.color}`}>
                      <feature.icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-medium text-muted-foreground/70 border border-border/50 px-2 py-0.5 rounded-full">
                      {feature.audience}
                    </span>
                  </div>
                  <h3 className="font-bold text-lg">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ── Trust Architecture ────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-t border-border/40 py-28">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-0 w-160 h-160 bg-primary/6 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-120 h-120 bg-secondary/6 rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-6 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
            <FadeIn className="lg:col-span-7 space-y-8">
              <h2 className="text-4xl sm:text-5xl font-bold leading-tight">
                Una nueva arquitectura de confianza para la salud digital
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                El sistema de salud actual fue diseñado para instituciones, no para personas.
                Los datos clínicos están fragmentados, duplicados y encerrados en silos que
                dificultan la atención, elevan costos y generan desconfianza.
              </p>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Redcis redefine este modelo desde la base: la información médica no pertenece
                a plataformas ni intermediarios. Pertenece al paciente, y la red solo actúa
                como garante de integridad, trazabilidad y disponibilidad.
              </p>
              <div className="border-l-2 border-primary pl-6 space-y-3">
                <p className="text-base font-medium">No se trata solo de almacenar datos.</p>
                <p className="text-base text-muted-foreground">
                  Se trata de crear un estándar de confianza verificable entre pacientes,
                  profesionales de la salud e instituciones, sin fricción y sin dependencia
                  de una única entidad central.
                </p>
              </div>
            </FadeIn>

            <FadeIn className="lg:col-span-5" delay={150}>
              <div className="rounded-2xl border border-primary/20 bg-background/60 backdrop-blur-sm overflow-hidden">
                {[
                  {
                    tag: 'Núcleo del sistema',
                    title: 'Paciente',
                    desc: 'Controla quién accede a su información, cuándo y con qué propósito. Cada consentimiento es explícito y auditable.',
                    accent: 'bg-primary/5 border-primary/10',
                  },
                  {
                    tag: 'Actores conectados',
                    title: 'Instituciones de salud',
                    desc: 'Acceden únicamente a la información autorizada, reduciendo duplicidad, errores administrativos y tiempos de atención.',
                    accent: 'bg-secondary/5 border-secondary/10',
                  },
                  {
                    tag: 'Capa de garantía',
                    title: 'Red descentralizada',
                    desc: 'Asegura integridad criptográfica, inmutabilidad y trazabilidad sin exponer información sensible.',
                    accent: 'bg-accent/5 border-accent/10',
                  },
                ].map(({ tag, title, desc, accent }, i) => (
                  <div key={title} className={`p-7 ${i < 2 ? 'border-b border-border/40' : ''}`}>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">{tag}</p>
                    <div className={`inline-block px-2 py-0.5 rounded-md border text-xs font-semibold mb-3 ${accent}`}>
                      {title}
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                  </div>
                ))}
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ── How It Works ──────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 sm:px-6 lg:px-8 py-20 border-t border-border/40">
        <FadeIn className="text-center space-y-4 mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold">¿Cómo funciona?</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Un flujo simple donde el paciente mantiene el control absoluto.
          </p>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
          {steps.map((item, i) => (
            <FadeIn key={item.step} delay={i * 100}>
              <div className={`relative p-8 h-full ${i < 2 ? 'md:border-r border-border/40' : ''}`}>
                {/* connector line */}
                {i < 2 && (
                  <div className="hidden md:block absolute top-10 right-0 w-6 h-px bg-border/60 translate-x-3" />
                )}
                <span className="text-5xl font-bold text-primary/15 select-none block mb-4">
                  {item.step}
                </span>
                <h3 className="font-bold text-xl mb-3">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ── Problem Section ───────────────────────────────────────────────── */}
      <section className="border-t border-border/40 bg-muted/10">
        <div className="max-w-5xl mx-auto px-6 py-24">
          <FadeIn className="space-y-4 mb-20">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Diagnóstico del sistema</p>
            <h2 className="text-4xl sm:text-5xl font-bold leading-tight">
              El problema no es la falta de datos.
              <br />
              Es la forma en que existen.
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl">
              Durante años, el sistema de salud ha acumulado información clínica en múltiples
              plataformas sin un modelo común de confianza, acceso y verificación.
            </p>
          </FadeIn>

          <div className="relative pl-8 border-l-2 border-primary/30 space-y-16">
            {problemBlocks.map((block, i) => (
              <FadeIn key={block.title} delay={i * 100} className="relative space-y-3">
                <span className="absolute -left-10 top-1 w-4 h-4 rounded-full bg-primary ring-4 ring-background" />
                <h3 className="text-2xl font-bold">{block.title}</h3>
                <p className="text-muted-foreground leading-relaxed max-w-2xl">{block.description}</p>
              </FadeIn>
            ))}
          </div>

          <FadeIn className="mt-24 pt-12 border-t border-border space-y-4">
            <p className="text-xl font-medium">Cambiar este modelo no es un ajuste técnico.</p>
            <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl">
              Requiere redefinir cómo se establece la confianza, cómo se autoriza el acceso y
              cómo se garantiza la integridad de la información en todo el ecosistema de salud.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <FadeIn>
          <div className="relative rounded-2xl overflow-hidden">
            <div className="absolute inset-0 bg-linear-to-r from-primary via-secondary/40 to-accent opacity-12 blur-2xl" />
            <div className="relative rounded-2xl border border-primary/15 bg-linear-to-br from-primary/6 to-secondary/6 backdrop-blur-sm p-12 sm:p-16">
              <div className="max-w-2xl mx-auto text-center space-y-6">
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight">
                  Listo para revolucionar
                  <br />
                  la salud digital
                </h2>
                <p className="text-lg text-muted-foreground">
                  Experimenta una plataforma donde tu información médica es realmente tuya.
                  Testnet de Stellar disponible ahora.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
                  <Link href={dashboardPath}>
                    <Button size="lg" className="gap-2 w-full sm:w-auto">
                      {isAuthenticated && currentUser ? (
                        <>Continuar <ArrowRight className="w-4 h-4" /></>
                      ) : (
                        <><Wallet className="w-4 h-4" /> Soy paciente</>
                      )}
                    </Button>
                  </Link>
                  <Link href={dashboardPath}>
                    <Button size="lg" variant="outline" className="gap-2 w-full sm:w-auto">
                      Soy centro de salud
                    </Button>
                  </Link>
                </div>
                <p className="text-xs text-muted-foreground pt-2">
                  Autenticación via wallet Freighter · Sin contraseñas · Sin datos centralizados
                </p>
              </div>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-border/40 bg-background/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <Image src="/logo.png" alt="redcis" width={28} height={28} className="w-7 h-7 opacity-70" />
              <div>
                <p className="text-sm font-semibold">Redcis</p>
                <p className="text-xs text-muted-foreground">Red De Historias Clínicas Descentralizadas</p>
              </div>
            </div>

            <div className="flex items-center gap-6 text-xs text-muted-foreground">
              <span>Stellar Testnet</span>
            </div>

            <p className="text-xs text-muted-foreground/50">
              COPYRIGHT © 2026 redcis.com® · Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
