"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Package, Truck, BarChart, Settings, Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@supabase/supabase-js';
import { useAppContext } from '@/context/AppContext';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', color: 'text-sky-500' },
  { href: '/production', icon: Package, label: 'Production', color: 'text-orange-500' },
  { href: '/delivery', icon: Truck, label: 'Delivery', color: 'text-blue-500' },
  { href: '/report', icon: BarChart, label: 'Report', color: 'text-green-500' },
  { href: '/settings', icon: Settings, label: 'Settings', color: 'text-gray-500' },
];

export function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { state } = useAppContext();
  const { settings } = state;
  const [isOnline, setIsOnline] = useState(true); // Assume online initially

  useEffect(() => {
    const checkSupabaseConnection = async () => {
      if (settings.supabaseUrl && settings.supabaseKey) {
        try {
          const supabase = createClient(settings.supabaseUrl, settings.supabaseKey, {
            auth: {
              persistSession: false
            },
            realtime: {
                params: {
                    eventsPerSecond: 1
                }
            },
            db: {
                schema: 'public',
            },
          });
          // Perform a simple query to check the connection
          const { error } = await supabase.from('production_entries').select('id', { count: 'exact', head: true });
           
          // If there's an error, it might be a network issue or invalid credentials.
          // For this check, any error suggests an "offline" state from the app's perspective.
          // Note: RLS errors will also be caught here, but for a simple status check, this is acceptable.
          setIsOnline(!error);
        } catch (e) {
          setIsOnline(false);
        }
      } else {
        setIsOnline(false);
      }
    };
    
    // Check immediately and then every 30 seconds
    checkSupabaseConnection();
    const interval = setInterval(checkSupabaseConnection, 30000);

    return () => clearInterval(interval);
  }, [settings.supabaseUrl, settings.supabaseKey]);


  return (
    <div className="flex flex-col h-screen w-full bg-background md:max-w-none max-w-md mx-auto">
       <header className="sticky top-0 z-10 h-14 bg-card border-b border-border/60">
        <nav className="flex items-center justify-between h-full px-2">
            <div className="flex items-center justify-around h-full">
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
            </div>
            <div className='px-2'>
                {isOnline ? (
                    <Wifi className="h-5 w-5 text-green-500" title="Supabase Online" />
                ) : (
                    <WifiOff className="h-5 w-5 text-destructive" title="Supabase Offline" />
                )}
            </div>
        </nav>
      </header>
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
