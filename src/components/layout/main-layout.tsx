
"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Package, Truck, BarChart, Settings, Wifi, WifiOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient, SupabaseClient, PostgrestError, RealtimeChannel } from '@supabase/supabase-js';
import { useAppContext } from '@/context/AppContext';
import { ProductionEntry, DeliveryEntry, Settings as AppSettings } from '@/types';
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
  const { settings, isInitialized, productionEntries, deliveryEntries } = state;
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
    }
  }, [settings.supabaseUrl, settings.supabaseKey]);
  
  // New Effect for manual sync trigger
  useEffect(() => {
    const handleSyncRequest = async () => {
        if (!supabase || !isOnline) {
          toast({ variant: 'destructive', title: 'Cannot Sync', description: 'Not connected to Supabase.' });
          return;
        }

        setIsSyncing(true);
        try {
            const { data: remoteProdTakas, error: remoteProdError } = await supabase.from('production_entries').select('takaNumber');
            if (remoteProdError) throw remoteProdError;
            const remoteTakaNumbers = new Set(remoteProdTakas.map(p => p.takaNumber));
            const newProductionEntries = productionEntries.filter(p => !remoteTakaNumbers.has(p.takaNumber));
            
            if(newProductionEntries.length > 0) {
              const { error: prodError } = await supabase.from('production_entries').upsert(newProductionEntries, { onConflict: 'takaNumber' });
              if (prodError) throw prodError;
            }

            // Sync for delivery entries
            const { data: remoteDeliveryIds, error: remoteDeliveryError } = await supabase.from('delivery_entries').select('id');
            if(remoteDeliveryError) throw remoteDeliveryError;
            const remoteDelivIds = new Set(remoteDeliveryIds.map(d => d.id));
            const newDeliveryEntries = deliveryEntries.filter(d => !remoteDelivIds.has(d.id));

            if(newDeliveryEntries.length > 0) {
                 const { error: delivError } = await supabase.from('delivery_entries').upsert(newDeliveryEntries, { onConflict: 'id' });
                 if (delivError) throw delivError;
            }


            // Settings
            const { supabaseUrl, supabaseKey, ...settingsToStore } = settings;
            const { error: settingsError } = await supabase.from('app_settings').upsert({ id: 1, settings: settingsToStore }, { onConflict: 'id' });
            if (settingsError) throw settingsError;

            toast({ title: 'Sync Complete', description: 'All local data has been saved to Supabase.' });
        } catch (error) {
            console.error('Sync error:', error);
            toast({ variant: 'destructive', title: 'Sync Error', description: 'Failed to save data to Supabase.' });
        } finally {
            setIsSyncing(false);
        }
    };
    
    // @ts-ignore
    window.addEventListener('request-sync', handleSyncRequest);
    // @ts-ignore
    return () => window.removeEventListener('request-sync', handleSyncRequest);
  }, [supabase, isOnline, toast, productionEntries, deliveryEntries, settings]);


  // Effect for initial data load and setting up real-time subscriptions
  useEffect(() => {
    if (!isInitialized || !supabase) return;

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
            setIsOnline(false); // Can't connect if tables don't exist
            return;
          }
          if (settingsError.code !== 'PGRST116') throw settingsError;
        }
        if (settingsData?.settings) {
          dispatch({ type: 'UPDATE_SETTINGS', payload: settingsData.settings as AppSettings });
        }

        const { data: prodData, error: prodError } = await supabase.from('production_entries').select('*');
        if (prodError) throw prodError;
        dispatch({ type: 'SET_PRODUCTION_ENTRIES', payload: prodData as ProductionEntry[] });

        const { data: delData, error: delError } = await supabase.from('delivery_entries').select('*');
        if (delError) throw delError;
        dispatch({ type: 'SET_DELIVERY_ENTRIES', payload: delData as DeliveryEntry[] });

        setIsOnline(true);
        toast({ title: 'Sync Successful', description: 'Data loaded from Supabase.' });

      } catch (error) {
        setIsOnline(false);
        const postgrestError = error as PostgrestError;
        console.error('Supabase connection error:', postgrestError.message);
        toast({ variant: 'destructive', title: 'Sync Failed', description: `Could not connect to Supabase. ${postgrestError.message}` });
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
             dispatch({ type: 'DELETE_PRODUCTION_ENTRY', payload: (payload.old as ProductionEntry).takaNumber });
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
          dispatch({ type: 'DELETE_DELIVERY_ENTRY', payload: (payload.old as DeliveryEntry).id });
        }
      }).subscribe();
    
    // Settings
    settingsChannelRef.current = supabase.channel('app_settings')
        .on<any>('postgres_changes', {event: 'UPDATE', schema: 'public', table: 'app_settings', filter: 'id=eq.1'}, (payload) => {
            if (payload.new.settings) {
                dispatch({type: 'UPDATE_SETTINGS', payload: payload.new.settings as AppSettings});
                toast({title: "Settings Updated", description: "Settings were updated from another device."});
            }
        }).subscribe();


    const connectionInterval = setInterval(async () => {
        try {
            const { error } = await supabase.from('production_entries').select('id', { count: 'exact', head: true });
            if (error && error.code === '42P01') {
                 setIsOnline(false);
            } else if (error) {
                // Other transient network error, might be offline
                setIsOnline(false);
            }
            else {
                setIsOnline(true);
            }
        } catch (e) {
            setIsOnline(false);
        }
    }, 30000);

    return () => {
      clearInterval(connectionInterval);
      if (productionChannelRef.current) supabase.removeChannel(productionChannelRef.current);
      if (deliveryChannelRef.current) supabase.removeChannel(deliveryChannelRef.current);
      if (settingsChannelRef.current) supabase.removeChannel(settingsChannelRef.current);
    };
  }, [isInitialized, supabase, dispatch, toast]);


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

    