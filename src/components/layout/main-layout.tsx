"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Package, Truck, BarChart, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', color: 'text-sky-500' },
  { href: '/production', icon: Package, label: 'Production', color: 'text-orange-500' },
  { href: '/delivery', icon: Truck, label: 'Delivery', color: 'text-blue-500' },
  { href: '/report', icon: BarChart, label: 'Report', color: 'text-green-500' },
  { href: '/settings', icon: Settings, label: 'Settings', color: 'text-gray-500' },
];

export function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-screen w-full bg-background md:max-w-none max-w-md mx-auto">
       <header className="sticky top-0 z-10 h-14 bg-card border-b border-border/60">
        <nav className="flex items-center justify-around h-full px-2">
          {navItems.map((item) => {
             const isActive = pathname === item.href;
             return (
                <Link href={item.href} key={item.href}>
                    <div
                        className={cn(
                        'flex flex-col items-center justify-center text-muted-foreground w-16 h-full transition-colors duration-200',
                        isActive ? item.color : 'hover:text-primary/80'
                        )}
                    >
                        <item.icon className={cn("w-6 h-6", isActive ? item.color : '')} />
                        <span className="text-xs font-medium">{item.label}</span>
                    </div>
                </Link>
             )
          })}
        </nav>
      </header>
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}