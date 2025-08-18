
"use client";

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import type { Settings, ProductionEntry, DeliveryEntry } from '@/types';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

interface AppState {
  settings: Settings;
  productionEntries: ProductionEntry[];
  deliveryEntries: DeliveryEntry[];
  isInitialized: boolean;
  supabase: SupabaseClient | null;
  isOnline: boolean;
}

const defaultSettings: Settings = {
  scanApiKey: '',
  supabaseUrl: 'https://uiawblehjeewwwocjvqu.supabase.co',
  supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpYXdibGVoamVld3d3b2NqdnF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0ODkyMTksImV4cCI6MjA3MTA2NTIxOX0.xBMe7PBh1RzLXQhraS_tv41VuDZJYzGodruNlh5gLvk',
  productionTables: 1,
  maxMachineNumber: 12,
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
  supabase: null,
  isOnline: false,
};

const toCamelCase = (obj: any) => {
    if (typeof obj !== 'object' || obj === null) return obj;
    const newObj: any = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
            newObj[camelKey] = obj[key];
        }
    }
    return newObj;
};

type Action =
  | { type: 'INITIALIZE_STATE'; payload: Partial<AppState> }
  | { type: 'SET_SUPABASE'; payload: SupabaseClient | null }
  | { type: 'SET_ONLINE_STATUS'; payload: boolean }
  | { type: 'UPDATE_SETTINGS'; payload: Settings }
  | { type: 'ADD_PRODUCTION_ENTRY'; payload: ProductionEntry }
  | { type: 'ADD_PRODUCTION_ENTRIES'; payload: ProductionEntry[] }
  | { type: 'UPDATE_PRODUCTION_ENTRY'; payload: ProductionEntry }
  | { type: 'DELETE_PRODUCTION_ENTRY'; payload: string }
  | { type: 'ADD_DELIVERY_ENTRY'; payload: DeliveryEntry }
  | { type: 'ADD_DELIVERY_ENTRIES'; payload: DeliveryEntry[] }
  | { type: 'UPDATE_DELIVERY_ENTRY'; payload: DeliveryEntry }
  | { type: 'DELETE_DELIVERY_ENTRY'; payload: string }
  | { type: 'SET_PRODUCTION_ENTRIES'; payload: any[] }
  | { type: 'SET_DELIVERY_ENTRIES'; payload: any[] };

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
    case 'SET_SUPABASE':
        newState = { ...state, supabase: action.payload };
        break;
    case 'SET_ONLINE_STATUS':
        newState = { ...state, isOnline: action.payload };
        break;
    case 'UPDATE_SETTINGS':
        const updatedSettings = {
          ...action.payload,
          supabaseUrl: state.settings.supabaseUrl,
          supabaseKey: state.settings.supabaseKey,
        };
        newState = { ...state, settings: updatedSettings };
        break;
    case 'ADD_PRODUCTION_ENTRY':
       if (!state.productionEntries.some((existing) => existing.takaNumber === action.payload.takaNumber)) {
          newState = { ...state, productionEntries: [...state.productionEntries, action.payload] };
       }
       break;
    case 'ADD_PRODUCTION_ENTRIES':
      const newEntries = action.payload.map(toCamelCase).filter(
        (newEntry) => !state.productionEntries.some((existing) => existing.takaNumber === newEntry.takaNumber)
      );
      if (newEntries.length > 0) {
        newState = { ...state, productionEntries: [...state.productionEntries, ...newEntries] };
      }
      break;
    case 'UPDATE_PRODUCTION_ENTRY':
      newState = {
        ...state,
        productionEntries: state.productionEntries.map((entry) =>
          entry.takaNumber === action.payload.takaNumber ? toCamelCase(action.payload) : entry
        ),
      };
      break;
    case 'DELETE_PRODUCTION_ENTRY':
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
      const newDeliveryEntry = toCamelCase(action.payload);
      if (!state.deliveryEntries.some(e => e.id === newDeliveryEntry.id)) {
        newState = { ...state, deliveryEntries: [...state.deliveryEntries, newDeliveryEntry] };
      }
      break;
    case 'ADD_DELIVERY_ENTRIES':
       const newDeliveryEntries = action.payload.map(toCamelCase).filter(
        (newEntry) => !state.deliveryEntries.some((existing) => existing.id === newEntry.id)
      );
      if(newDeliveryEntries.length > 0) {
        newState = { ...state, deliveryEntries: [...state.deliveryEntries, ...newDeliveryEntries] };
      }
      break;
    case 'UPDATE_DELIVERY_ENTRY':
        const updatedDeliveryEntry = toCamelCase(action.payload);
        newState = {
          ...state,
          deliveryEntries: state.deliveryEntries.map((entry) =>
            entry.id === updatedDeliveryEntry.id ? updatedDeliveryEntry : entry
          ),
        };
        break;
    case 'DELETE_DELIVERY_ENTRY':
        newState = {
          ...state,
          deliveryEntries: state.deliveryEntries.filter(
            (entry) => entry.id !== action.payload
          ),
        };
        break;
    case 'SET_PRODUCTION_ENTRIES':
        newState = { ...state, productionEntries: action.payload.map(toCamelCase) };
        break;
    case 'SET_DELIVERY_ENTRIES':
        newState = { ...state, deliveryEntries: action.payload.map(toCamelCase) };
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
          deliveryEntries: newState.deliveryEntries,
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
        const parsedState = JSON.parse(storedState);
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

  // Initialize Supabase client
  useEffect(() => {
    if (state.settings.supabaseUrl && state.settings.supabaseKey) {
        try {
            const client = createClient(state.settings.supabaseUrl, state.settings.supabaseKey);
            dispatch({ type: 'SET_SUPABASE', payload: client });
        } catch (e) {
            console.error("Failed to create Supabase client", e);
            dispatch({ type: 'SET_SUPABASE', payload: null });
        }
    } else {
        dispatch({ type: 'SET_SUPABASE', payload: null });
    }
  }, [state.settings.supabaseUrl, state.settings.supabaseKey]);

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

export const toSnakeCase = (obj: any) => {
    if (typeof obj !== 'object' || obj === null) {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(toSnakeCase);
    }

    const newObj: any = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
            const value = obj[key];
            newObj[snakeKey] = value === undefined ? null : value;
        }
    }
    return newObj;
};
