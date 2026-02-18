'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function StyleGuidePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="redcis"
              width={40}
              height={40}
              className="w-10 h-10"
            />
            <h1 className="text-xl font-bold">Redcis</h1>
          </Link>
          <Link href="/">
            <Button size="sm" variant="outline">
              Volver
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="mb-12">
          <h2 className="text-4xl font-bold mb-4">Guía de Estilos</h2>
          <p className="text-lg text-muted-foreground">Paleta de colores y componentes del MVP</p>
        </div>

        {/* Logo Section */}
        <section className="mb-16">
          <h3 className="text-2xl font-bold mb-8">Logo</h3>
          <Card className="p-12 flex flex-col items-center justify-center bg-card">
            <Image
              src="/logo.png"
              alt="redcis"
              width={256}
              height={256}
              className="w-64 h-64"
            />
            <p className="text-muted-foreground mt-8 text-center max-w-md">
              Escudo de dos mitades: azul para medicina, verde para blockchain descentralizado
            </p>
          </Card>
        </section>

        {/* Color Palette */}
        <section className="mb-16">
          <h3 className="text-2xl font-bold mb-8">Paleta de Colores</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Primary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Primary - Azul Médico</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="h-32 rounded-lg" style={{ backgroundColor: '#04579e' }}></div>
                <div className="space-y-2 text-sm">
                  <p><strong>HEX:</strong> #04579e</p>
                  <p><strong>RGB:</strong> rgb(4, 87, 158)</p>
                  <p className="text-muted-foreground">Confianza, profesionalismo, medicina</p>
                </div>
              </CardContent>
            </Card>

            {/* Secondary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Secondary - Verde Salud</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="h-32 rounded-lg" style={{ backgroundColor: '#5cb243' }}></div>
                <div className="space-y-2 text-sm">
                  <p><strong>HEX:</strong> #5cb243</p>
                  <p><strong>RGB:</strong> rgb(92, 178, 67)</p>
                  <p className="text-muted-foreground">Verificación, éxito, descentralización</p>
                </div>
              </CardContent>
            </Card>

            {/* Accent */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Accent - Azul Blockchain</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="h-32 rounded-lg" style={{ backgroundColor: '#0373b5' }}></div>
                <div className="space-y-2 text-sm">
                  <p><strong>HEX:</strong> #0373b5</p>
                  <p><strong>RGB:</strong> rgb(3, 115, 181)</p>
                  <p className="text-muted-foreground">Web3, futuro, tecnología</p>
                </div>
              </CardContent>
            </Card>

            {/* Destructive */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Destructive - Rojo Médico</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="h-32 rounded-lg" style={{ backgroundColor: '#d32f2f' }}></div>
                <div className="space-y-2 text-sm">
                  <p><strong>HEX:</strong> #d32f2f</p>
                  <p><strong>RGB:</strong> rgb(211, 47, 47)</p>
                  <p className="text-muted-foreground">Alerta, error, rechazo</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Components */}
        <section className="mb-16">
          <h3 className="text-2xl font-bold mb-8">Componentes</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Primary Button */}
            <Card className="p-6">
              <h4 className="font-semibold mb-4">Primary Button</h4>
              <Button className="w-full">
                Acción Principal
              </Button>
              <p className="text-xs text-muted-foreground mt-4">Usa color primary #04579e</p>
            </Card>

            {/* Secondary Button */}
            <Card className="p-6">
              <h4 className="font-semibold mb-4">Secondary Button</h4>
              <Button variant="outline" className="w-full border-secondary text-secondary hover:bg-secondary/10">
                Acción Secundaria
              </Button>
              <p className="text-xs text-muted-foreground mt-4">Usa color secondary #5cb243</p>
            </Card>

            {/* Accent Button */}
            <Card className="p-6">
              <h4 className="font-semibold mb-4">Accent Button</h4>
              <Button className="w-full" style={{ backgroundColor: '#0373b5' }}>
                Acción Acentuada
              </Button>
              <p className="text-xs text-muted-foreground mt-4">Usa color accent #0373b5</p>
            </Card>
          </div>
        </section>

        {/* Typography */}
        <section className="mb-16">
          <h3 className="text-2xl font-bold mb-8">Tipografía</h3>
          <Card className="p-6">
            <div className="space-y-6">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Heading 1</p>
                <h1 className="text-4xl font-bold">Título Principal</h1>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Heading 2</p>
                <h2 className="text-2xl font-bold">Subtítulo Principal</h2>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Body</p>
                <p className="text-base">Texto de cuerpo principal. Se utiliza Geist como fuente principal para toda la aplicación.</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Small</p>
                <p className="text-sm">Texto pequeño para descripciones secundarias.</p>
              </div>
            </div>
          </Card>
        </section>

        {/* Responsive Grid */}
        <section>
          <h3 className="text-2xl font-bold mb-8">Estructura Responsive</h3>
          <Card className="p-6">
            <p className="text-muted-foreground mb-6">El diseño utiliza Tailwind CSS con flex como método principal de layout</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="h-32 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center font-semibold">
                  Columna {item}
                </div>
              ))}
            </div>
          </Card>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center text-sm text-muted-foreground">
          <p>HistoriaClínica.Web3 - Guía de Estilos MVP</p>
        </div>
      </footer>
    </div>
  );
}
