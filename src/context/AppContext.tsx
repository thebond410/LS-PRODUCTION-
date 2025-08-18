
"use client";

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import type { Settings, ProductionEntry, DeliveryEntry } from '@/types';

interface AppState {
  settings: Settings;
  productionEntries: ProductionEntry[];
  deliveryEntries: DeliveryEntry[];
  isInitialized: boolean;
}

const defaultSettings: Settings = {
  scanApiKey: '',
  supabaseUrl: '',
  supabaseKey: '',
  productionTables: 1,
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
  | { type: 'INITIALIZE_STATE'; payload: AppState }
  | { type: 'UPDATE_SETTINGS'; payload: Settings }
  | { type: 'ADD_PRODUCTION_ENTRIES'; payload: ProductionEntry[] }
  | { type: 'UPDATE_PRODUCTION_ENTRY'; payload: ProductionEntry }
  | { type: 'DELETE_PRODUCTION_ENTRY'; payload: string }
  | { type: 'ADD_DELIVERY_ENTRY'; payload: DeliveryEntry }
  | { type: 'UPDATE_DELIVERY_ENTRY'; payload: DeliveryEntry }
  | { type: 'DELETE_DELIVERY_ENTRY'; payload: string }
  | { type: 'SET_PRODUCTION_ENTRIES'; payload: ProductionEntry[] }
  | { type: 'SET_DELIVERY_ENTRIES'; payload: DeliveryEntry[] };

const appReducer = (state: AppState, action: Action): AppState => {
  switch (action.type) {
    case 'INITIALIZE_STATE':
      return { ...action.payload, isInitialized: true };
    case 'UPDATE_SETTINGS':
      return { ...state, settings: action.payload };
    case 'ADD_PRODUCTION_ENTRIES':
      // Avoid duplicates based on takaNumber
      const newEntries = action.payload.filter(
        (newEntry) => !state.productionEntries.some((existing) => existing.takaNumber === newEntry.takaNumber)
      );
      return { ...state, productionEntries: [...state.productionEntries, ...newEntries] };
    case 'UPDATE_PRODUCTION_ENTRY':
      return {
        ...state,
        productionEntries: state.productionEntries.map((entry) =>
          entry.takaNumber === action.payload.takaNumber ? action.payload : entry
        ),
      };
    case 'DELETE_PRODUCTION_ENTRY':
      return {
        ...state,
        productionEntries: state.productionEntries.filter(
          (entry) => entry.takaNumber !== action.payload
        ),
      };
    case 'ADD_DELIVERY_ENTRY':
      return { ...state, deliveryEntries: [...state.deliveryEntries, action.payload] };
    case 'UPDATE_DELIVERY_ENTRY':
        return {
          ...state,
          deliveryEntries: state.deliveryEntries.map((entry) =>
            entry.id === action.payload.id ? action.payload : entry
          ),
        };
    case 'DELETE_DELIVERY_ENTRY':
        return {
          ...state,
          deliveryEntries: state.deliveryEntries.filter(
            (entry) => entry.id !== action.payload
          ),
        };
    case 'SET_PRODUCTION_ENTRIES':
        return { ...state, productionEntries: action.payload };
    case 'SET_DELIVERY_ENTRIES':
        return { ...state, deliveryEntries: action.payload };
    default:
      return state;
  }
};

const AppContext = createContext<{ state: AppState; dispatch: React.Dispatch<Action> } | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  useEffect(() => {
    try {
      const storedState = localStorage.getItem('ls-prod-tracker-state');
      if (storedState) {
        const parsedState = JSON.parse(storedState);
        // Ensure tpNumber is not undefined if it exists
        if(parsedState.deliveryEntries) {
            parsedState.deliveryEntries = parsedState.deliveryEntries.map((e: DeliveryEntry) => ({...e, tpNumber: e.tpNumber || undefined}))
        }
        dispatch({ type: 'INITIALIZE_STATE', payload: { ...initialState, ...parsedState } });
      } else {
        dispatch({ type: 'INITIALIZE_STATE', payload: initialState });
      }
    } catch (error) {
      console.error("Failed to load state from localStorage", error);
      dispatch({ type: 'INITIALIZE_STATE', payload: initialState });
    }
  }, []);

  useEffect(() => {
    if (state.isInitialized) {
      try {
        const stateToStore = { 
          settings: state.settings,
          productionEntries: state.productionEntries,
          deliveryEntries: state.deliveryEntries
        };
        localStorage.setItem('ls-prod-tracker-state', JSON.stringify(stateToStore));
      } catch (error) {
        console.error("Failed to save state to localStorage", error);
      }
    }
  }, [state]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {state.isInitialized ? children : (
        <div className="flex items-center justify-center h-screen w-full">
            {/* You can replace this with a proper loading spinner component */}
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
