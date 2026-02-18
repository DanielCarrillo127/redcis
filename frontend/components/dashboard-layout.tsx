'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { LogOut, Menu } from 'lucide-react';
import { useState } from 'react';

interface DashboardLayoutProps {
  children: React.ReactNode;
  sidebar: React.ReactNode;
  title: string;
}

export function DashboardLayout({ children, sidebar, title }: DashboardLayoutProps) {
  const { logout, currentUser } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top Navigation */}
      <header className="border-b border-border bg-card sticky top-0 z-40">
        <div className="px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <Image
                src="/logo.png"
                alt="redcis"
                width={32}
                height={32}
                className="w-8 h-8"
              />
              <h1 className="font-bold">Redcis</h1>
            </Link>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium">{currentUser?.name}</p>
              <p className="text-xs text-muted-foreground capitalize">
                {currentUser?.role === 'patient' ? 'Paciente' : 'Centro de Salud'}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside
          className={`w-64 border-r border-border bg-card flex flex-col transition-all duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
            } fixed md:static h-full md:h-auto z-30`}
        >
          <div className="flex-1 overflow-y-auto">
            {sidebar}
          </div>
          <div className="p-4 border-border">

            <div className="w-full flex justify-start gap-4 cursor-pointer hover:text-primary" onClick={handleLogout} >
              <span>Salir</span>
              <LogOut className="w-4 h-4" />
            </div>

          </div>
        </aside>

        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 md:hidden z-20"
            onClick={() => setSidebarOpen(false)}
          ></div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto">
          <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

interface SidebarNavProps {
  items: Array<{
    href: string;
    label: string;
    icon: React.ReactNode;
    active?: boolean;
  }>;
}

export function SidebarNav({ items }: SidebarNavProps) {
  return (
    <nav className="p-4 space-y-2">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${item.active
            ? 'bg-primary text-primary-foreground'
            : 'text-foreground hover:bg-muted'
            }`}
        >
          {item.icon}
          <span className="font-medium">{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}
