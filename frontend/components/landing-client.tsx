'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/lib/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { formatWallet } from '@/lib/types';
import { Shield, Lock, Zap, TrendingDown, CheckCircle2, Globe, ArrowRight, Mail, Wallet } from 'lucide-react';

export function LandingClient() {
  const { isAuthenticated, currentUser } = useAuth();

  const scrollToFeatures = () => {
    const element = document.getElementById('features-section');
    element?.scrollIntoView({ behavior: 'smooth' });
  };

  const features = [
    {
      icon: Shield,
      title: 'Control Total',
      description: 'El paciente es dueño real de su información médica.'
    },
    {
      icon: Lock,
      title: 'Verificable',
      description: 'Información criptográficamente verificable e inalterable.'
    },
    {
      icon: Zap,
      title: 'Sin Fricción',
      description: 'Menos fricción entre instituciones de salud.'
    },
    {
      icon: TrendingDown,
      title: 'Costos Reducidos',
      description: 'Reducción de costos para el sistema de salud.'
    },
    {
      icon: CheckCircle2,
      title: 'Normativa',
      description: 'Cumplimiento normativo y trazabilidad completa.'
    },
    {
      icon: Globe,
      title: 'Escalable',
      description: 'Escalable a otros países y sistemas de salud.'
    }
  ];

  const steps = [
    {
      step: '01',
      title: 'Creación',
      description: 'La información clínica se registra de forma segura y estructurada.'
    },
    {
      step: '02',
      title: 'Propiedad',
      description: 'El paciente es el dueño y decide quién puede acceder.'
    },
    {
      step: '03',
      title: 'Verificación',
      description: 'Cada acceso o cambio es verificable y trazable.'
    }
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-40 right-0 w-96 h-96 bg-primary opacity-10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-secondary opacity-10 rounded-full blur-3xl"></div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="redcis"
              width={40}
              height={40}
              className="w-10 h-10"
            />
            <h1 className="text-xl font-bold">Redcis</h1>
          </div>
          <div className="flex items-center gap-3">
            {isAuthenticated && currentUser && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg bg-muted border border-border text-xs font-mono text-muted-foreground">
                <Wallet className="w-3.5 h-3.5 text-primary" />
                {formatWallet(currentUser.wallet)}
              </div>
            )}
            <Link href={isAuthenticated && currentUser ? (currentUser.role === 'health_center' ? '/dashboard/health-center' : currentUser.role === 'admin' ? '/dashboard/admin' : '/dashboard/patient') : '/login'}>
              <Button size="sm">
                {isAuthenticated && currentUser ? <> {'Dashboard'} <ArrowRight className="w-4 h-4" /></> : <> <Wallet className="w-4 h-4" /> {'Conectar Wallet'}</>}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 sm:px-6 lg:px-8 py-20 sm:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          <div className="space-y-2">

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight">
              Historias clínicas <span className="text-transparent bg-clip-text bg-linear-to-r from-primary to-secondary">descentralizadas</span>
            </h1>

            <p className="text-lg sm:text-xl text-muted-foreground max-w-lg leading-relaxed">
              La plataforma que revoluciona la gestión de datos médicos. Control total del paciente sobre su información, verificable y sin intermediarios.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <Link href={isAuthenticated && currentUser ? (currentUser.role === 'health_center' ? '/dashboard/health-center' : currentUser.role === 'admin' ? '/dashboard/admin' : '/dashboard/patient') : '/login'} className="w-full sm:w-auto">
                <Button size="lg" className="w-full">
                  {isAuthenticated && currentUser ? <> {'Ir a Dashboard'} <ArrowRight className="w-4 h-4" /></> : <> <Wallet className="w-4 h-4" /> {'Conectar Wallet'}</>}
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="w-full sm:w-auto" onClick={scrollToFeatures}>
                Explorar
              </Button>
            </div>

            <div className="flex items-center gap-8 mt-8 pt-8 border-t border-border">
              <div>
                <p className="text-2xl font-bold">100%</p>
                <p className="text-xs text-muted-foreground">Control del paciente</p>
              </div>
              <div>
                <p className="text-2xl font-bold">Claro</p>
                <p className="text-xs text-muted-foreground">Verificable y seguro</p>
              </div>
              <div>
                <p className="text-2xl font-bold">Sin</p>
                <p className="text-xs text-muted-foreground">Intermediarios</p>
              </div>
            </div>
          </div>

          {/* Hero Visual */}
          <div className="relative h-96 sm:h-96 lg:h-full ">
            <div className="absolute inset-0 rounded-2xl bg-linear-to-br from-primary/20 via-secondary/10 to-transparent border border-primary/30 overflow-hidden flex items-center justify-center">
              {/* <Image
                src="/hero.jpg"
                alt="hero image"
                width={640}
                height={630}
                className="w-full h-full object-cover"
              /> */}
              <Image
                src="/logo.png"
                alt="redcis"
                width={350}
                height={350}
                className="w-2/4 h-2/4"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features-section" className="max-w-7xl mx-auto px-6 sm:px-6 lg:px-8 py-20 border-t border-border/40">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold">Pilares del sistema</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">Características que hacen diferente a Redcis en el ecosistema de salud digital</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div key={index} className="group relative p-8 rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/50 hover:shadow-lg hover:bg-card transition-all duration-300">
              <div className="absolute inset-0 rounded-xl bg-linear-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative space-y-4">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/20 group-hover:bg-primary/30 transition-colors">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-bold text-lg">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Trust Architecture Section */}
      <section className="relative overflow-hidden border-t border-border/40 px-6">
        {/* Background layers */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-0 w-160 h-160 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-120 h-120 bg-secondary/10 rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-28">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">

            {/* Narrative column */}
            <div className="lg:col-span-7 space-y-8">
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

              <div className="border-l-2 border-primary pl-6 space-y-4">
                <p className="text-base text-foreground font-medium">
                  No se trata solo de almacenar datos.
                </p>
                <p className="text-base text-muted-foreground">
                  Se trata de crear un estándar de confianza verificable entre pacientes,
                  profesionales de la salud e instituciones, sin fricción y sin dependencia
                  de una única entidad central.
                </p>
              </div>
            </div>

            {/* Visual / structure column */}
            <div className="lg:col-span-5 relative">
              <div className="relative rounded-2xl border border-primary/30 bg-background/60 backdrop-blur-sm p-10 space-y-10">

                {/* Patient */}
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Núcleo del sistema
                  </p>
                  <p className="text-2xl font-bold">Paciente</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Controla quién accede a su información, cuándo y con qué propósito.
                    Cada consentimiento es explícito y auditable.
                  </p>
                </div>

                <div className="h-px bg-primary/30" />

                {/* Institutions */}
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Actores conectados
                  </p>
                  <p className="text-2xl font-bold">Instituciones de salud</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Acceden únicamente a la información autorizada, reduciendo duplicidad,
                    errores administrativos y tiempos de atención.
                  </p>
                </div>

                <div className="h-px bg-primary/30" />

                {/* Network */}
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Capa de garantía
                  </p>
                  <p className="text-2xl font-bold">Red descentralizada</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Asegura integridad criptográfica, inmutabilidad y trazabilidad sin exponer
                    información sensible ni depender de un punto único de falla.
                  </p>
                </div>

              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="max-w-7xl mx-auto px-6 sm:px-6 lg:px-8 py-20 border-t border-border/40">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold">¿Cómo funciona Redcis?</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Un flujo simple donde el paciente mantiene el control absoluto.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((item, i) => (
            <div key={i} className="relative p-8 rounded-xl border border-border/50 bg-card/50">
              <span className="absolute top-4 right-4 text-4xl font-bold text-primary/20">
                {item.step}
              </span>
              <h3 className="font-bold text-xl mb-2">{item.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Vertical Narrative Section */}
      <section className="relative border-t border-border/40 bg-background">
        <div className="max-w-5xl mx-auto px-6 sm:px-6 py-24">

          {/* Intro */}
          <div className="space-y-2 mb-20">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Diagnóstico del sistema
            </p>
            <h2 className="text-4xl sm:text-5xl font-bold leading-tight">
              El problema no es la falta de datos.
              <br />
              Es la forma en que existen.
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl">
              Durante años, el sistema de salud ha acumulado información clínica en múltiples
              plataformas sin un modelo común de confianza, acceso y verificación.
            </p>
          </div>

          {/* Timeline */}
          <div className="relative pl-8 border-l border-border space-y-16">

            {/* Block 1 */}
            <div className="relative space-y-4">
              <span className="absolute -left-10.25 top-1 w-4 h-4 rounded-full bg-primary" />
              <h3 className="text-2xl font-bold">
                Fragmentación normalizada
              </h3>
              <p className="text-muted-foreground leading-relaxed max-w-2xl">
                Cada institución gestiona su propia versión de la historia clínica.
                La duplicación, la pérdida de contexto y la falta de continuidad se
                convierten en parte del flujo cotidiano.
              </p>
            </div>

            {/* Block 2 */}
            <div className="relative space-y-4">
              <span className="absolute -left-10.25 top-1 w-4 h-4 rounded-full bg-primary" />
              <h3 className="text-2xl font-bold">
                Confianza implícita
              </h3>
              <p className="text-muted-foreground leading-relaxed max-w-2xl">
                El acceso a la información depende de sistemas cerrados, credenciales
                internas y procesos difíciles de auditar. La confianza se asume,
                pero rara vez se demuestra.
              </p>
            </div>

            {/* Block 3 */}
            <div className="relative space-y-4">
              <span className="absolute -left-10.25 top-1 w-4 h-4 rounded-full bg-primary" />
              <h3 className="text-2xl font-bold">
                El paciente fuera del centro
              </h3>
              <p className="text-muted-foreground leading-relaxed max-w-2xl">
                Aunque la información describe al paciente, este no controla quién
                la usa, cuándo se consulta ni con qué propósito. La titularidad
                real del dato es difusa.
              </p>
            </div>

          </div>

          {/* Closing statement */}
          <div className="mt-24 pt-12 border-t border-border space-y-6">
            <p className="text-xl font-medium">
              Cambiar este modelo no es un ajuste técnico.
            </p>
            <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl">
              Requiere redefinir cómo se establece la confianza, cómo se autoriza
              el acceso y cómo se garantiza la integridad de la información en todo
              el ecosistema de salud.
            </p>
          </div>

        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="relative rounded-2xl overflow-hidden">
          <div className="absolute inset-0 bg-linear-to-r from-primary via-secondary/50 to-accent opacity-20 blur-2xl"></div>
          <div className="relative rounded-2xl bg-linear-to-br from-primary/10 to-secondary/10 border border-primary/20 backdrop-blur-sm p-12 sm:p-16 text-center">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">Listo para revolucionar la salud digital</h2>
            <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto">Valida el concepto. Experimenta una plataforma donde tu información médica es realmente tuya.</p>
            <Link href={isAuthenticated && currentUser ? (currentUser.role === 'health_center' ? '/dashboard/health-center' : currentUser.role === 'admin' ? '/dashboard/admin' : '/dashboard/patient') : '/login'}>
              <Button size="lg" className="gap-2">
                {isAuthenticated && currentUser ? 'Continuar' : 'Comenzar ya'} <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 bg-background/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
          <p className="text-sm text-muted-foreground">Redcis - Red De Historias Clínicas Descentralizadas</p>
          <p className="text-xs text-muted-foreground/60 mt-2">COPYRIGHT © 2026 redcis.com®  ·  Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
