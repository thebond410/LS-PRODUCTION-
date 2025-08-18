
"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Package, Truck, BarChart, Settings, Wifi, WifiOff, Loader2, UploadCloud } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient, SupabaseClient, PostgrestError, RealtimeChannel } from '@supabase/supabase-js';
import { useAppContext } from '@/context/AppContext';
import { ProductionEntry, DeliveryEntry, Settings as AppSettings } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

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
  const { settings, isInitialized, unsyncedChanges } = state;
  const { toast } = useToast();
  
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  
  const productionChannelRef = useRef<RealtimeChannel | null>(null);
  const deliveryChannelRef = useRef<RealtimeChannel | null>(null);
  const settingsChannelRef = useRef<RealtimeChannel | null>(null);

  // Initialize Supabase client
  useEffect(() => {
    if (settings.supabaseUrl && settings.supabaseKey) {
        const client = createClient(settings.supabaseUrl, settings.supabaseKey);
        setSupabase(client);
    } else {
        setSupabase(null);
    }
  }, [settings.supabaseUrl, settings.supabaseKey]);

  const handleSync = async () => {
    if (!supabase || !isOnline || isSyncing) {
        if (!isSyncing && !supabase) {
            toast({ variant: 'destructive', title: 'Cannot Sync', description: 'Supabase is not configured.' });
        }
        return;
    }

    setIsSyncing(true);
    try {
        const { production, delivery } = unsyncedChanges;

        if (production.add.length > 0) {
            const { error } = await supabase.from('production_entries').upsert(production.add.map(({id, ...rest}) => rest)); // Don't send local-only id
            if (error) throw new Error(`Production Add: ${error.message}`);
        }
        if (production.update.length > 0) {
            const { error } = await supabase.from('production_entries').upsert(production.update);
            if (error) throw new Error(`Production Update: ${error.message}`);
        }
        if (production.delete.length > 0) {
            const { error } = await supabase.from('production_entries').delete().in('takaNumber', production.delete);
            if (error) throw new Error(`Production Delete: ${error.message}`);
        }

        if (delivery.add.length > 0) {
            const { error } = await supabase.from('delivery_entries').upsert(delivery.add);
            if (error) throw new Error(`Delivery Add: ${error.message}`);
        }
        if (delivery.update.length > 0) {
            const { error } = await supabase.from('delivery_entries').upsert(delivery.update);
            if (error) throw new Error(`Delivery Update: ${error.message}`);
        }
        if (delivery.delete.length > 0) {
            const { error } = await supabase.from('delivery_entries').delete().in('id', delivery.delete);
            if (error) throw new Error(`Delivery Delete: ${error.message}`);
        }
        
        if (unsyncedChanges.settings) {
            const { supabaseUrl, supabaseKey, ...settingsToStore } = settings;
            const { error } = await supabase.from('app_settings').upsert({ id: 1, settings: settingsToStore }, { onConflict: 'id' });
            if (error) throw new Error(`Settings: ${error.message}`);
        }

        dispatch({ type: 'CLEAR_UNSYNCED_CHANGES' });
        toast({ title: 'Sync Complete', description: 'All local changes have been saved.' });

    } catch (error) {
        const errorMessage = (error as Error).message || 'An unknown error occurred';
        console.error('Sync error:', errorMessage);
        toast({ variant: 'destructive', title: 'Sync Error', description: `Failed to save data: ${errorMessage}` });
    } finally {
        setIsSyncing(false);
    }
  };


  // Effect for initial data load and setting up real-time subscriptions
  useEffect(() => {
    if (!isInitialized || !supabase) {
        if(isInitialized && (!settings.supabaseUrl || !settings.supabaseKey)) {
            setIsOnline(false);
        }
        return;
    }

    const syncData = async () => {
      setIsSyncing(true);
      try {
        const { data: settingsData, error: settingsError } = await supabase
          .from('app_settings')
          .select('settings')
          .eq('id', 1)
          .single();

        if (settingsError) {
          if (settingsError.code === '42P01') {
            toast({
              variant: 'destructive',
              title: 'Database Setup Required',
              description: "Tables not found. Please run the SQL script from the Settings page.",
            });
            setIsOnline(false);
            return;
          }
          if (settingsError.code !== 'PGRST116') throw settingsError;
        }
        if (settingsData?.settings) {
          dispatch({ type: 'UPDATE_SETTINGS_FROM_SERVER', payload: settingsData.settings as AppSettings });
        }

        const { data: prodData, error: prodError } = await supabase.from('production_entries').select('*');
        if (prodError) throw prodError;
        dispatch({ type: 'SET_PRODUCTION_ENTRIES', payload: prodData as ProductionEntry[] });

        const { data: delData, error: delError } = await supabase.from('delivery_entries').select('*');
        if (delError) throw delError;
        dispatch({ type: 'SET_DELIVERY_ENTRIES', payload: delData as DeliveryEntry[] });

        dispatch({ type: 'CLEAR_UNSYNCED_CHANGES' });
        setIsOnline(true);
        toast({ title: 'Sync Successful', description: 'Data loaded from Supabase.' });

      } catch (error) {
        setIsOnline(false);
        const postgrestError = error as PostgrestError;
        console.error('Supabase connection error:', postgrestError.message);
        if (postgrestError.code !== '42P01') { // Don't toast for missing tables, already handled
          toast({ variant: 'destructive', title: 'Sync Failed', description: `Could not connect to Supabase. ${postgrestError.message}` });
        }
      } finally {
        setIsSyncing(false);
      }
    };
    
    syncData();

    // --- REAL-TIME SUBSCRIPTIONS ---

    // Production Entries
    productionChannelRef.current = supabase.channel('production_entries')
      .on<ProductionEntry>('postgres_changes', { event: '*', schema: 'public', table: 'production_entries' }, (payload) => {
          if (payload.eventType === 'INSERT') {
             dispatch({ type: 'ADD_PRODUCTION_ENTRIES', payload: [payload.new as ProductionEntry] });
          } else if (payload.eventType === 'UPDATE') {
             dispatch({ type: 'UPDATE_PRODUCTION_ENTRY', payload: payload.new as ProductionEntry });
          } else if (payload.eventType === 'DELETE') {
             dispatch({ type: 'DELETE_PRODUCTION_ENTRY', payload: (payload.old as { takaNumber: string }).takaNumber });
          }
        }
      ).subscribe();

    // Delivery Entries
    deliveryChannelRef.current = supabase.channel('delivery_entries')
      .on<DeliveryEntry>('postgres_changes', { event: '*', schema: 'public', table: 'delivery_entries' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          dispatch({ type: 'ADD_DELIVERY_ENTRY', payload: payload.new as DeliveryEntry });
        } else if (payload.eventType === 'UPDATE') {
          dispatch({ type: 'UPDATE_DELIVERY_ENTRY', payload: payload.new as DeliveryEntry });
        } else if (payload.eventType === 'DELETE') {
          dispatch({ type: 'DELETE_DELIVERY_ENTRY', payload: (payload.old as { id: string }).id });
        }
      }).subscribe();
    
    // Settings
    settingsChannelRef.current = supabase.channel('app_settings')
        .on<any>('postgres_changes', {event: 'UPDATE', schema: 'public', table: 'app_settings', filter: 'id=eq.1'}, (payload) => {
            if (payload.new.settings) {
                dispatch({type: 'UPDATE_SETTINGS_FROM_SERVER', payload: payload.new.settings as AppSettings});
                toast({title: "Settings Updated", description: "Settings were updated from another device."});
            }
        }).subscribe();


    const connectionInterval = setInterval(async () => {
        try {
            const { error } = await supabase.from('production_entries').select('takaNumber', { count: 'exact', head: true });
            
            if (error) {
                 if (error.message.includes("Socket closed unexpectedly") || error.message.includes("fetch failed")) {
                    if (isOnline) setIsOnline(false);
                 } else if (error.code !== '42P01' && isOnline) { // Don't go offline for missing table
                    setIsOnline(false);
                 }
            } else {
                if (!isOnline) {
                    setIsOnline(true);
                    handleSync();
                }
            }
        } catch (e) {
            if (isOnline) setIsOnline(false);
        }
    }, 10000);

    return () => {
      clearInterval(connectionInterval);
      if (productionChannelRef.current) supabase.removeChannel(productionChannelRef.current);
      if (deliveryChannelRef.current) supabase.removeChannel(deliveryChannelRef.current);
      if (settingsChannelRef.current) supabase.removeChannel(settingsChannelRef.current);
    };
  }, [isInitialized, supabase]);

  const pendingCount = useMemo(() => {
    if(!unsyncedChanges) return 0;
    return (
        unsyncedChanges.production.add.length +
        unsyncedChanges.production.update.length +
        unsyncedChanges.production.delete.length +
        unsyncedChanges.delivery.add.length +
        unsyncedChanges.delivery.update.length +
        unsyncedChanges.delivery.delete.length +
        (unsyncedChanges.settings ? 1 : 0)
    );
  }, [unsyncedChanges]);

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
                {pendingCount > 0 && (
                   <Button variant="ghost" size="icon" className="h-8 w-8 relative" onClick={handleSync} disabled={isSyncing || !isOnline}>
                     {isSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-5 w-5 text-primary" />}
                     <Badge variant="destructive" className="absolute -top-1 -right-2 px-1.5 h-5">{pendingCount}</Badge>
                   </Button>
                )}
                {isSyncing ? (
                    <Loader2 className="h-5 w-5 animate-spin text-primary" title="Syncing..." />
                ) : (
                    isOnline ? 
                        <Wifi className="h-5 w-5 text-green-500" title="Supabase Online" /> : 
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

    