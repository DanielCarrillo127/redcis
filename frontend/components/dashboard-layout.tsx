'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/auth-context';
import { ROLE_LABELS } from '@/lib/constants/roles';
import type { NavItem } from '@/lib/constants/navigation';
import { LogOut, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// ── DashboardLayout ──────────────────────────────────────────────────────────

interface DashboardLayoutProps {
  children: React.ReactNode;
  navItems: NavItem[];
}

export function DashboardLayout({ children, navItems }: DashboardLayoutProps) {
  const { logout, currentUser } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const roleLabel = currentUser?.role ? ROLE_LABELS[currentUser.role] : '';
  const initials = currentUser?.name
    ? currentUser.name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()
    : '??';

  return (
    <div className="h-screen flex flex-col bg-background">

      {/* ── Top Navigation Bar ─────────────────────────────────── */}
      <header className="border-b border-border bg-card sticky top-0 z-40 shrink-0">
        <div className="px-4 sm:px-6 h-14 flex items-center justify-between gap-4">

          {/* Left: hamburger + logo */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-1.5 hover:bg-muted rounded-md transition-colors"
              aria-label="Abrir menú"
            >
              <Menu className="w-5 h-5" />
            </button>
            <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
              <Image src="/logo.png" alt="Redcis" width={28} height={28} className="w-7 h-7" />
              <span className="font-semibold text-sm tracking-tight">Redcis</span>
            </Link>
          </div>

          {/* Right: name + role (always visible on desktop) */}
          <div className="hidden md:flex items-center gap-2.5">
            <div className="leading-none">
              <p className="text-sm font-semibold leading-tight">{currentUser?.name}</p>
              <span className="inline-flex items-center mt-0.5 px-1.5 py-px rounded text-xs font-medium bg-primary/8 text-primary border border-primary/15 float-end">
                {roleLabel}
              </span>
            </div>
            <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-primary">{initials}</span>
            </div>
          </div>
        </div>
      </header>

      {/* ── Body: Sidebar + Main ───────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── Sidebar ──────────────────────────────────────────── */}
        <aside
          className={cn(
            'w-60 border-r border-border bg-card flex flex-col shrink-0',
            'fixed md:static inset-y-0 left-0 z-50 md:z-auto',
            'transition-transform duration-200 ease-in-out',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
          )}
        >
          {/* User info block — visible only on mobile (header handles desktop) */}
          <div className="md:hidden p-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-primary">{initials}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate leading-tight">
                  {currentUser?.name || 'Usuario'}
                </p>
                <span className="inline-flex items-center mt-0.5 px-1.5 py-px rounded text-xs font-medium bg-primary/8 text-primary border border-primary/15">
                  {roleLabel}
                </span>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="md:hidden p-1 hover:bg-muted rounded-md transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex-1 overflow-y-auto py-3">
            <SidebarNav items={navItems} onNavigate={() => setSidebarOpen(false)} />
          </div>

          {/* Logout */}
          <div className="p-3 border-t border-border">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-all duration-150"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span>Cerrar sesión</span>
            </button>
          </div>
        </aside>

        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/40 md:hidden z-40 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* ── Main Content ─────────────────────────────────────── */}
        <main className="flex-1 overflow-auto bg-muted/20">
          <div className="p-5 sm:p-7 lg:p-8 max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

// ── SidebarNav ───────────────────────────────────────────────────────────────

interface SidebarNavProps {
  items: NavItem[];
  onNavigate?: () => void;
}

export function SidebarNav({ items, onNavigate }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav className="px-3 space-y-0.5">
      {items.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
              isActive
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted',
            )}
          >
            <item.icon className="w-4 h-4 shrink-0" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
