'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/lib/contexts/auth-context';
import { Button } from '@/components/ui/button';
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
      description: 'El paciente es dueño real de su información médica'
    },
    {
      icon: Lock,
      title: 'Verificable',
      description: 'Información criptográficamente verificable e inalterable'
    },
    {
      icon: Zap,
      title: 'Sin Fricción',
      description: 'Menos fricción entre instituciones de salud'
    },
    {
      icon: TrendingDown,
      title: 'Costos Reducidos',
      description: 'Reducción de costos para el sistema de salud'
    },
    {
      icon: CheckCircle2,
      title: 'Normativa',
      description: 'Cumplimiento normativo y trazabilidad completa'
    },
    {
      icon: Globe,
      title: 'Escalable',
      description: 'Escalable a otros países y sistemas de salud'
    }
  ];

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
            <a href="mailto:contacto@redcis.io">
              <Button size="sm" variant="outline" className="gap-2 hidden sm:inline-flex">
                <Mail className="w-4 h-4" />
                Contacto para empresas
              </Button>
              <Button size="sm" variant="outline" className="gap-2 sm:hidden">
                <Mail className="w-4 h-4" />
              </Button>
            </a>
            <Link href={isAuthenticated && currentUser ? (currentUser.role === 'patient' ? '/dashboard/patient' : '/dashboard/health-center') : '/login'}>
              <Button size="sm">
                {isAuthenticated && currentUser ? 'Dashboard' : 'Comenzar'} <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          <div className="space-y-2">

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight">
              Historias clínicas <span className="text-transparent bg-clip-text bg-linear-to-r from-primary to-secondary">descentralizadas</span>
            </h1>

            <p className="text-lg sm:text-xl text-muted-foreground max-w-lg leading-relaxed">
              Plataforma Web3 que revoluciona la gestión de datos médicos. Control total del paciente sobre su información, verificable y sin intermediarios.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <Link href={isAuthenticated && currentUser ? (currentUser.role === 'patient' ? '/dashboard/patient' : '/dashboard/health-center') : '/login'} className="w-full sm:w-auto">
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
              <div className="text-center space-y-6">
                <div className="w-32 h-32 mx-auto rounded-full bg-linear-to-br from-primary to-secondary p-1">
                  <div className="w-full h-full rounded-full bg-background flex items-center justify-center">
                    <Shield className="w-16 h-16 text-primary" />
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-primary">Datos Verificables</p>
                  <p className="text-xs text-muted-foreground">Con integridad criptográfica</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t border-border/40">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold">Propuesta de Valor</h2>
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

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="relative rounded-2xl overflow-hidden">
          <div className="absolute inset-0 bg-linear-to-r from-primary via-secondary/50 to-accent opacity-20 blur-2xl"></div>
          <div className="relative rounded-2xl bg-linear-to-br from-primary/10 to-secondary/10 border border-primary/20 backdrop-blur-sm p-12 sm:p-16 text-center">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">Listo para revolucionar la salud digital</h2>
            <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto">Valida el concepto. Experimenta una plataforma donde tu información médica es realmente tuya.</p>
            <Link href={isAuthenticated && currentUser ? (currentUser.role === 'patient' ? '/dashboard/patient' : '/dashboard/health-center') : '/login'}>
              <Button size="lg" className="gap-2">
                {isAuthenticated && currentUser ? 'Continuar' : 'Comenzar'} <ArrowRight className="w-4 h-4" />
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
