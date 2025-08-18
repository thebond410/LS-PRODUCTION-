
"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Package, Truck, BarChart, Settings, Wifi, WifiOff, UploadCloud, DownloadCloud, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@supabase/supabase-js';
import { useAppContext } from '@/context/AppContext';
import { ProductionEntry, DeliveryEntry } from '@/types';
import { useToast } from '@/hooks/use-toast';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', color: 'text-sky-500' },
  { href: '/production', icon: Package, label: 'Production', color: 'text-orange-500' },
  { href: '/delivery', icon: Truck, label: 'Delivery', color: 'text-blue-500' },
  { href: '/report', icon: BarChart, label: 'Report', color: 'text-green-500' },
  { href: '/settings', icon: Settings, label: 'Settings', color: 'text-gray-500' },
];

export function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { state, dispatch } = useAppContext();
  const { settings, productionEntries, deliveryEntries } = state;
  const { toast } = useToast();
  
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const supabase = (settings.supabaseUrl && settings.supabaseKey) 
    ? createClient(settings.supabaseUrl, settings.supabaseKey)
    : null;

  useEffect(() => {
    const syncData = async () => {
      if (!supabase) {
        setIsOnline(false);
        return;
      }
      setIsSyncing(true);
      try {
        // Fetch production data
        const { data: prodData, error: prodError } = await supabase.from('production_entries').select('*');
        if (prodError) throw prodError;
        dispatch({ type: 'SET_PRODUCTION_ENTRIES', payload: prodData as ProductionEntry[] });

        // Fetch delivery data
        const { data: delData, error: delError } = await supabase.from('delivery_entries').select('*');
        if (delError) throw delError;
        dispatch({ type: 'SET_DELIVERY_ENTRIES', payload: delData as DeliveryEntry[] });

        setIsOnline(true);
        toast({ title: 'Sync Successful', description: 'Data loaded from Supabase.' });
      } catch (error) {
        setIsOnline(false);
        console.error('Supabase connection error:', error);
        toast({ variant: 'destructive', title: 'Sync Failed', description: 'Could not connect to Supabase.' });
      } finally {
        setIsSyncing(false);
      }
    };
    
    // Run sync on initial load
    syncData();

    // Set up interval to check connection status
    const interval = setInterval(async () => {
        if (!supabase) {
            setIsOnline(false);
            return;
        }
        const { error } = await supabase.from('production_entries').select('id', { count: 'exact', head: true });
        setIsOnline(!error);
    }, 30000);

    return () => clearInterval(interval);
  }, [settings.supabaseUrl, settings.supabaseKey]); // Re-run if credentials change

  const handleSync = async () => {
    if (!supabase || !isOnline) {
      toast({ variant: 'destructive', title: 'Cannot Sync', description: 'Not connected to Supabase.' });
      return;
    }
    setIsSyncing(true);
    try {
      // Upsert Production Entries
      const { error: prodError } = await supabase.from('production_entries').upsert(productionEntries, { onConflict: 'takaNumber' });
      if (prodError) throw prodError;

      // Upsert Delivery Entries
      const { error: delError } = await supabase.from('delivery_entries').upsert(deliveryEntries, { onConflict: 'id' });
      if (delError) throw delError;

      toast({ title: 'Sync Complete', description: 'All local data has been saved to Supabase.' });
    } catch (error) {
      console.error('Sync error:', error);
      toast({ variant: 'destructive', title: 'Sync Error', description: 'Failed to save data to Supabase.' });
    } finally {
      setIsSyncing(false);
    }
  };


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
                                <item.icon className={cn("w-5 h-5", item.color)} />
                                <span className={cn("text-xs font-medium", isActive ? `font-bold ${item.color}`: '')}>{item.label}</span>
                            </div>
                        </Link>
                    )
                })}
            </div>
            <div className='px-2 flex items-center gap-2'>
                {isSyncing ? (
                    <Loader2 className="h-5 w-5 animate-spin text-primary" title="Syncing..." />
                ) : (
                    <button onClick={handleSync} disabled={!isOnline || !supabase}>
                        {isOnline ? 
                            <UploadCloud className="h-5 w-5 text-green-500" title="Sync to Supabase" /> : 
                            <UploadCloud className="h-5 w-5 text-gray-400" title="Cannot Sync (Offline)" />
                        }
                    </button>
                )}
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
