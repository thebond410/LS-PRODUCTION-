
"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Package, Truck, BarChart, Settings, Wifi, WifiOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PostgrestError, RealtimeChannel } from '@supabase/supabase-js';
import { useAppContext } from '@/context/AppContext';
import { ProductionEntry, DeliveryEntry, Settings as AppSettings } from '@/types';
import { useToast } from '@/hooks/use-toast';

const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, color: 'text-sky-500' },
    { href: '/production', label: 'Production', icon: Package, color: 'text-orange-500' },
    { href: '/delivery', label: 'Delivery', icon: Truck, color: 'text-green-500' },
    { href: '/report', label: 'Report', icon: BarChart, color: 'text-purple-500' },
    { href: '/settings', label: 'Settings', icon: Settings, color: 'text-gray-500' },
];

export function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { state, dispatch } = useAppContext();
  const { isInitialized, supabase, isOnline } = state;
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(true);
  
  const productionChannelRef = useRef<RealtimeChannel | null>(null);
  const deliveryChannelRef = useRef<RealtimeChannel | null>(null);
  const settingsChannelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!isInitialized || !supabase) {
        if(isInitialized && !supabase) {
           dispatch({ type: 'SET_ONLINE_STATUS', payload: false });
           setIsLoading(false);
        }
        return;
    }

    const syncData = async () => {
      setIsLoading(true);
      try {
        const { error: pingError } = await supabase
          .from('production_entries')
          .select('taka_number', { count: 'exact', head: true });

        if (pingError && pingError.code === '42P01') { 
            toast({
              variant: 'destructive',
              title: 'Database Setup Required',
              description: "Tables not found. Please run the SQL script from the Settings page.",
            });
            dispatch({ type: 'SET_ONLINE_STATUS', payload: false });
            return;
        } else if (pingError) {
            throw pingError; 
        }

        dispatch({ type: 'SET_ONLINE_STATUS', payload: true });

        const [
          { data: remoteSettings, error: remoteSettingsError },
          { data: prodData, error: prodError },
          { data: delData, error: delError }
        ] = await Promise.all([
          supabase.from('app_settings').select('settings').eq('id', 1).single(),
          supabase.from('production_entries').select('*'),
          supabase.from('delivery_entries').select('*')
        ]);
        
        if (remoteSettingsError && remoteSettingsError.code !== 'PGRST116') throw remoteSettingsError;
        if (prodError) throw prodError;
        if (delError) throw delError;

        if (remoteSettings?.settings) {
          const serverSettings = {
            ...remoteSettings.settings,
            supabaseUrl: state.settings.supabaseUrl,
            supabaseKey: state.settings.supabaseKey,
          };
          dispatch({ type: 'UPDATE_SETTINGS', payload: serverSettings as AppSettings });
        }
        dispatch({ type: 'SET_PRODUCTION_ENTRIES', payload: prodData as ProductionEntry[] });
        dispatch({ type: 'SET_DELIVERY_ENTRIES', payload: delData as DeliveryEntry[] });

        toast({ title: 'Sync Successful', description: 'Data loaded from Supabase.' });

      } catch (error) {
        dispatch({ type: 'SET_ONLINE_STATUS', payload: false });
        const errorMessage = (error as PostgrestError)?.message || (error as Error)?.message || 'An unknown error occurred during sync.';
        const errorCode = (error as PostgrestError)?.code;
        console.error('Supabase connection error:', errorMessage, error);

        if (errorCode !== '42P01') { 
          toast({ variant: 'destructive', title: 'Sync Failed', description: `Could not connect to Supabase. ${errorMessage}` });
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    syncData();

    if(productionChannelRef.current) supabase.removeChannel(productionChannelRef.current);
    if(deliveryChannelRef.current) supabase.removeChannel(deliveryChannelRef.current);
    if(settingsChannelRef.current) supabase.removeChannel(settingsChannelRef.current);


    productionChannelRef.current = supabase.channel('production_entries')
      .on<ProductionEntry>('postgres_changes', { event: '*', schema: 'public', table: 'production_entries' }, (payload) => {
          if (payload.eventType === 'INSERT') {
             dispatch({ type: 'ADD_PRODUCTION_ENTRY', payload: payload.new as ProductionEntry });
          } else if (payload.eventType === 'UPDATE') {
             dispatch({ type: 'UPDATE_PRODUCTION_ENTRY', payload: payload.new as ProductionEntry });
          } else if (payload.eventType === 'DELETE') {
             dispatch({ type: 'DELETE_PRODUCTION_ENTRY', payload: (payload.old as { taka_number: string }).taka_number });
          }
        }
      ).subscribe((status, err) => {
          if(status === 'SUBSCRIPTION_ERROR' || err) {
              console.error('Production subscription error', err);
              dispatch({ type: 'SET_ONLINE_STATUS', payload: false });
          } else if (status === 'SUBSCRIBED') {
              dispatch({ type: 'SET_ONLINE_STATUS', payload: true });
          }
      });

    deliveryChannelRef.current = supabase.channel('delivery_entries')
      .on<DeliveryEntry>('postgres_changes', { event: '*', schema: 'public', table: 'delivery_entries' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          dispatch({ type: 'ADD_DELIVERY_ENTRY', payload: payload.new as DeliveryEntry });
        } else if (payload.eventType === 'UPDATE') {
          dispatch({ type: 'UPDATE_DELIVERY_ENTRY', payload: payload.new as DeliveryEntry });
        } else if (payload.eventType === 'DELETE') {
          dispatch({ type: 'DELETE_DELIVERY_ENTRY', payload: (payload.old as { id: string }).id });
        }
      }).subscribe((status, err) => {
           if(status === 'SUBSCRIPTION_ERROR' || err) {
              console.error('Delivery subscription error', err);
              dispatch({ type: 'SET_ONLINE_STATUS', payload: false });
          }
      });
    
    settingsChannelRef.current = supabase.channel('app_settings')
        .on<any>('postgres_changes', {event: 'UPDATE', schema: 'public', table: 'app_settings', filter: 'id=eq.1'}, (payload) => {
            if (payload.new.settings) {
                const serverSettings = {
                    ...payload.new.settings,
                    supabaseUrl: state.settings.supabaseUrl,
                    supabaseKey: state.settings.supabaseKey,
                };
                dispatch({type: 'UPDATE_SETTINGS', payload: serverSettings as AppSettings});
                toast({title: "Settings Updated", description: "Settings were updated from another device."});
            }
        }).subscribe((status, err) => {
           if(status === 'SUBSCRIPTION_ERROR' || err) {
              console.error('Settings subscription error', err);
              dispatch({ type: 'SET_ONLINE_STATUS', payload: false });
          }
      });

    const handleOnline = () => {
      if(!state.isOnline) {
        syncData();
      }
    };
    const handleOffline = () => dispatch({ type: 'SET_ONLINE_STATUS', payload: false });

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (productionChannelRef.current) supabase.removeChannel(productionChannelRef.current);
      if (deliveryChannelRef.current) supabase.removeChannel(deliveryChannelRef.current);
      if (settingsChannelRef.current) supabase.removeChannel(settingsChannelRef.current);
    };
  }, [isInitialized, supabase]);


  return (
    <div className="flex flex-col h-screen w-full bg-secondary md:max-w-none max-w-md mx-auto">
       <header className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm">
        <nav className="flex items-center justify-between h-16 px-4 md:px-6">
            <div className="flex items-center justify-around h-full flex-1">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link href={item.href} key={item.href}>
                            <div
                                className={cn(
                                'flex flex-col items-center justify-center text-muted-foreground w-16 h-full transition-colors duration-200 relative',
                                isActive ? 'text-primary' : 'hover:text-primary/80'
                                )}
                            >
                                <item.icon className="w-6 h-6" />
                                <span className="text-xs font-medium">{item.label}</span>
                                {isActive && (
                                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary rounded-t-full" />
                                )}
                            </div>
                        </Link>
                    )
                })}
            </div>
            <div className='px-2 flex items-center gap-2'>
                {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-primary" title="Syncing..." />
                ) : (
                    isOnline ? 
                        <Wifi className="h-5 w-5 text-green-500" title="Supabase Online" /> : 
                        <WifiOff className="h-5 w-5 text-destructive" title="Supabase Offline" />
                )}
            </div>
        </nav>
      </header>
      <main className="flex-1 overflow-y-auto p-2 md:p-4">
        {children}
      </main>
    </div>
  );
}
