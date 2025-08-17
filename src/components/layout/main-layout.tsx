"use client";

import React from 'react';
import { LayoutDashboard, Package, Truck, BarChart, Settings } from 'lucide-react';
import NavLink from './nav-link';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/production', icon: Package, label: 'Production' },
  { href: '/delivery', icon: Truck, label: 'Delivery' },
  { href: '/report', icon: BarChart, label: 'Report' },
  { href: '/settings', icon: Settings, label: 'Settings' },
];

export function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-screen w-full bg-background max-w-md mx-auto">
      <main className="flex-1 overflow-y-auto pb-20">
        {children}
      </main>
      <footer className="fixed bottom-0 left-0 right-0 h-16 bg-card border-t border-border/60 max-w-md mx-auto">
        <nav className="flex items-center justify-around h-full">
          {navItems.map((item) => (
            <NavLink key={item.href} {...item} />
          ))}
        </nav>
      </footer>
    </div>
  );
}
