
"use client";

import React, { createContext, useContext, useReducer, useEffect, ReactNode, useRef } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Settings, ProductionEntry, DeliveryEntry } from '@/types';

interface AppState {
  settings: Settings;
  productionEntries: ProductionEntry[];
  deliveryEntries: DeliveryEntry[];
  isInitialized: boolean;
}

const defaultSettings: Settings = {
  scanApiKey: '',
  supabaseUrl: 'https://uiawblehjeewwwocjvqu.supabase.co',
  supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpYXdibGVoamVld3d3b2NqdnF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0ODkyMTksImV4cCI6MjA3MTA2NTIxOX0.xBMe7PBh1RzLXQhraS_tv41VuDZJYzGodruNlh5gLvk',
  productionTables: 1,
  maxMachineNumber: 12, // Default max machine number
  listTakaRanges: {
    list1: { start: '', end: '' },
    list2: { start: '', end: '' },
    list3: { start: '', end: '' },
  },
};

const initialState: AppState = {
  settings: defaultSettings,
  productionEntries: [],
  deliveryEntries: [],
  isInitialized: false,
};

type Action =
  | { type: 'INITIALIZE_STATE'; payload: Partial<AppState> }
  | { type: 'UPDATE_SETTINGS'; payload: Settings }
  | { type: 'ADD_PRODUCTION_ENTRIES'; payload: ProductionEntry[] }
  | { type: 'UPDATE_PRODUCTION_ENTRY'; payload: ProductionEntry }
  | { type: 'DELETE_PRODUCTION_ENTRY'; payload: string }
  | { type: 'ADD_DELIVERY_ENTRY'; payload: DeliveryEntry }
  | { type: 'ADD_DELIVERY_ENTRIES'; payload: DeliveryEntry[] }
  | { type: 'UPDATE_DELIVERY_ENTRY'; payload: DeliveryEntry }
  | { type: 'DELETE_DELIVERY_ENTRY'; payload: string }
  | { type: 'SET_PRODUCTION_ENTRIES'; payload: ProductionEntry[] }
  | { type: 'SET_DELIVERY_ENTRIES'; payload: DeliveryEntry[] };
  
const appReducer = (state: AppState, action: Action): AppState => {
  let newState = state;
  switch (action.type) {
    case 'INITIALIZE_STATE':
        const initializedState = { ...state, ...action.payload };
        if (initializedState.settings) {
          initializedState.settings.supabaseUrl = defaultSettings.supabaseUrl;
          initializedState.settings.supabaseKey = defaultSettings.supabaseKey;
        } else {
          initializedState.settings = defaultSettings;
        }
        newState = { ...initializedState, isInitialized: true };
        break;
    case 'UPDATE_SETTINGS':
       const updatedSettings = {
          ...action.payload,
          supabaseUrl: state.settings.supabaseUrl,
          supabaseKey: state.settings.supabaseKey,
        };
        newState = { ...state, settings: updatedSettings };
        window.dispatchEvent(new Event('request-sync'));
        break;
    case 'ADD_PRODUCTION_ENTRIES':
      const newEntries = action.payload.filter(
        (newEntry) => !state.productionEntries.some((existing) => existing.takaNumber === newEntry.takaNumber)
      );
      if (newEntries.length > 0) {
        newState = { ...state, productionEntries: [...state.productionEntries, ...newEntries] };
        window.dispatchEvent(new Event('request-sync'));
      }
      break;
    case 'UPDATE_PRODUCTION_ENTRY':
      newState = {
        ...state,
        productionEntries: state.productionEntries.map((entry) =>
          entry.takaNumber === action.payload.takaNumber ? { ...action.payload, id: entry.id } : entry
        ),
      };
      window.dispatchEvent(new Event('request-sync'));
      break;
    case 'DELETE_PRODUCTION_ENTRY':
       const supabase = createClient(state.settings.supabaseUrl, state.settings.supabaseKey);
       supabase.from('production_entries').delete().eq('takaNumber', action.payload).then();
       supabase.from('delivery_entries').delete().eq('takaNumber', action.payload).then();
       newState = {
        ...state,
        productionEntries: state.productionEntries.filter(
          (entry) => entry.takaNumber !== action.payload
        ),
        deliveryEntries: state.deliveryEntries.filter(
            (entry) => entry.takaNumber !== action.payload
        ),
      };
      break;
    case 'ADD_DELIVERY_ENTRY':
      if (!state.deliveryEntries.some(e => e.id === action.payload.id)) {
        newState = { ...state, deliveryEntries: [...state.deliveryEntries, action.payload] };
        window.dispatchEvent(new Event('request-sync'));
      }
      break;
    case 'ADD_DELIVERY_ENTRIES':
       const newDeliveryEntries = action.payload.filter(
        (newEntry) => !state.deliveryEntries.some((existing) => existing.id === newEntry.id)
      );
      if(newDeliveryEntries.length > 0) {
        newState = { ...state, deliveryEntries: [...state.deliveryEntries, ...newDeliveryEntries] };
        window.dispatchEvent(new Event('request-sync'));
      }
      break;
    case 'UPDATE_DELIVERY_ENTRY':
        newState = {
          ...state,
          deliveryEntries: state.deliveryEntries.map((entry) =>
            entry.id === action.payload.id ? action.payload : entry
          ),
        };
        window.dispatchEvent(new Event('request-sync'));
        break;
    case 'DELETE_DELIVERY_ENTRY':
        const delSupabase = createClient(state.settings.supabaseUrl, state.settings.supabaseKey);
        delSupabase.from('delivery_entries').delete().eq('id', action.payload).then();
        newState = {
          ...state,
          deliveryEntries: state.deliveryEntries.filter(
            (entry) => entry.id !== action.payload
          ),
        };
        break;
    case 'SET_PRODUCTION_ENTRIES':
        newState = { ...state, productionEntries: action.payload };
        break;
    case 'SET_DELIVERY_ENTRIES':
        newState = { ...state, deliveryEntries: action.payload };
        break;
    default:
      return state;
  }
  
  if (newState.isInitialized) {
      try {
        const { supabaseUrl, supabaseKey, ...settingsToStore } = newState.settings;
        const stateToStore = { 
          settings: settingsToStore,
          productionEntries: newState.productionEntries,
          deliveryEntries: newState.deliveryEntries
        };
        localStorage.setItem('ls-prod-tracker-state', JSON.stringify(stateToStore));
      } catch (error) {
        console.error("Failed to save state to localStorage", error);
      }
  }
  return newState;
};

const AppContext = createContext<{ state: AppState; dispatch: React.Dispatch<Action> } | undefined>(undefined);


export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Load initial state from localStorage
  useEffect(() => {
    try {
      const storedState = localStorage.getItem('ls-prod-tracker-state');
      if (storedState) {
        let parsedState = JSON.parse(storedState);
        if(parsedState.deliveryEntries) {
            parsedState.deliveryEntries = parsedState.deliveryEntries.map((e: DeliveryEntry) => ({...e, tpNumber: e.tpNumber || undefined}))
        }
        const settings = { ...defaultSettings, ...parsedState.settings };
        dispatch({ type: 'INITIALIZE_STATE', payload: { ...initialState, ...parsedState, settings } });
      } else {
        dispatch({ type: 'INITIALIZE_STATE', payload: initialState });
      }
    } catch (error) {
      console.error("Failed to load state from localStorage", error);
      dispatch({ type: 'INITIALIZE_STATE', payload: initialState });
    }
  }, []);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {state.isInitialized ? children : (
        <div className="flex items-center justify-center h-screen w-full">
            <p>Loading...</p>
        </div>
      )}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

    