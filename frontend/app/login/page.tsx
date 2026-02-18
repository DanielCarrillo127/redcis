'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/lib/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Wallet, Hospital, Dot } from 'lucide-react';

export default function LoginPage() {
  const { loginAsPatient, loginAsHealthCenter, isAuthenticated } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  if (!mounted || isAuthenticated) {
    return null;
  }

  const handlePatientLogin = () => {
    loginAsPatient();
    router.push('/dashboard/patient');
  };

  const handleHealthCenterLogin = () => {
    loginAsHealthCenter();
    router.push('/dashboard/health-center');
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-background to-muted flex items-center justify-center p-4">
      {/* Animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-72 h-72 bg-primary opacity-10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-accent opacity-10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="w-full max-w-2xl relative z-10">
        <div className="mb-8 text-center">
          <Link href="/">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Image 
                src="/logo.png" 
                alt="redcis" 
                width={48} 
                height={48}
                className="w-12 h-12"
              />
              <h1 className="text-2xl font-bold">Redcis</h1>
            </div>
          </Link>
          <h2 className="text-3xl font-bold mb-2">Conectar Wallet</h2>
          <p className="text-muted-foreground">Elige tu rol para continuar</p>
        </div>

        <Tabs defaultValue="patient" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="patient" className="gap-2">
              <Wallet className="w-4 h-4" />
              Paciente
            </TabsTrigger>
            <TabsTrigger value="healthcenter" className="gap-2">
              <Hospital className="w-4 h-4" />
              Centro de Salud
            </TabsTrigger>
          </TabsList>

          <TabsContent value="patient" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Acceso como Paciente</CardTitle>
                <CardDescription>
                  Gestiona tu historia clínica de forma descentralizada
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-muted border border-border">
                    <h4 className="font-semibold mb-2">Demo Paciente</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Juan Pérez García
                    </p>
                    <p className="text-xs text-muted-foreground">
                      DNI: 12345678
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h5 className="font-semibold text-sm">Funcionalidades:</h5>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-start">
                        <span className="text-primary"><Dot /></span>
                        Ver tu historial clínico completo
                      </li>
                      <li className="flex items-start">
                        <span className="text-primary"><Dot /></span>
                        Agregar nuevos registros clínicos
                      </li>
                      <li className="flex items-start">
                        <span className="text-primary"><Dot /></span>
                        Otorgar/revocar acceso a centros de salud
                      </li>
                      <li className="flex items-start">
                        <span className="text-primary"><Dot /></span>
                        Ver quién accedió a tus datos
                      </li>
                      <li className="flex items-start">
                        <span className="text-primary"><Dot /></span>
                        Verificar integridad de registros (hash)
                      </li>
                    </ul>
                  </div>
                </div>

                <Button onClick={handlePatientLogin} size="lg" className="w-full">
                  Conectar Wallet como Paciente
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  Simulación: Los datos se almacenan localmente en el navegador
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="healthcenter" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Acceso como Centro de Salud</CardTitle>
                <CardDescription>
                  Accede a historiales de pacientes verificados
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-muted border border-border">
                    <h4 className="font-semibold mb-2">Demo Centro de Salud</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Hospital San Carlos
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Código: HSC-001
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h5 className="font-semibold text-sm">Funcionalidades:</h5>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-start">
                        <span className="text-accent"><Dot /></span>
                        Buscar pacientes por DNI
                      </li>
                      <li className="flex items-start">
                        <span className="text-accent"><Dot /></span>
                        Solicitar acceso a historial
                      </li>
                      <li className="flex items-start">
                        <span className="text-accent"><Dot /></span>
                        Registrar nuevos eventos (si autorizado)
                      </li>
                      <li className="flex items-start">
                        <span className="text-accent"><Dot /></span>
                        Acceso verificable e inmutable
                      </li>
                      <li className="flex items-start">
                        <span className="text-accent"><Dot /></span>
                        Ver auditoría completa de cambios
                      </li>
                    </ul>
                  </div>
                </div>

                <Button onClick={handleHealthCenterLogin} size="lg" className="w-full">
                  Conectar Wallet como Centro de Salud
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  Simulación: Los datos se almacenan localmente en el navegador
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* <div className="mt-8 p-6 rounded-lg border border-border bg-card">
          <h3 className="font-semibold mb-3">Estructura de Demostración</h3>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              Este MVP simula completamente una plataforma blockchain sin requiere infraestructura adicional.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-border">
              <div>
                <p className="font-semibold text-foreground mb-2">Blockchain Simulado:</p>
                <ul className="space-y-1 text-xs">
                  <li>• SHA-256 hashing en cliente</li>
                  <li>• Cadena de referencias inmutables</li>
                  <li>• Timestamps verificables</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold text-foreground mb-2">Persistencia:</p>
                <ul className="space-y-1 text-xs">
                  <li>• localStorage para datos</li>
                  <li>• Sesión simulada</li>
                  <li>• No requiere backend</li>
                </ul>
              </div>
            </div>
          </div>
        </div> */}

        <p className="mt-8 text-center text-sm text-muted-foreground">
          <Link href="/" className="text-primary hover:underline">
            Volver a inicio
          </Link>
        </p>
      </div>
    </div>
  );
}
