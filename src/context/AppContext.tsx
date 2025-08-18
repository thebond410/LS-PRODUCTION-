
"use client";

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import type { Settings, ProductionEntry, DeliveryEntry } from '@/types';

interface UnsyncedChanges {
  production: {
    add: ProductionEntry[];
    update: ProductionEntry[];
    delete: string[]; // array of takaNumbers
  };
  delivery: {
    add: DeliveryEntry[];
    update: DeliveryEntry[];
    delete: string[]; // array of ids
  };
  settings: boolean;
}

interface AppState {
  settings: Settings;
  productionEntries: ProductionEntry[];
  deliveryEntries: DeliveryEntry[];
  isInitialized: boolean;
  unsyncedChanges: UnsyncedChanges;
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

const initialUnsyncedChanges: UnsyncedChanges = {
    production: { add: [], update: [], delete: [] },
    delivery: { add: [], update: [], delete: [] },
    settings: false,
};

const initialState: AppState = {
  settings: defaultSettings,
  productionEntries: [],
  deliveryEntries: [],
  isInitialized: false,
  unsyncedChanges: initialUnsyncedChanges,
};

type Action =
  | { type: 'INITIALIZE_STATE'; payload: Partial<AppState> }
  | { type: 'UPDATE_SETTINGS'; payload: Settings }
  | { type: 'UPDATE_SETTINGS_FROM_SERVER'; payload: Settings }
  | { type: 'ADD_PRODUCTION_ENTRIES'; payload: ProductionEntry[] }
  | { type: 'UPDATE_PRODUCTION_ENTRY'; payload: ProductionEntry }
  | { type: 'DELETE_PRODUCTION_ENTRY'; payload: string }
  | { type: 'ADD_DELIVERY_ENTRY'; payload: DeliveryEntry }
  | { type: 'ADD_DELIVERY_ENTRIES'; payload: DeliveryEntry[] }
  | { type: 'UPDATE_DELIVERY_ENTRY'; payload: DeliveryEntry }
  | { type: 'DELETE_DELIVERY_ENTRY'; payload: string }
  | { type: 'SET_PRODUCTION_ENTRIES'; payload: ProductionEntry[] }
  | { type: 'SET_DELIVERY_ENTRIES'; payload: DeliveryEntry[] }
  | { type: 'CLEAR_UNSYNCED_CHANGES' };
  
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
        newState = { ...state, settings: updatedSettings, unsyncedChanges: { ...state.unsyncedChanges, settings: true } };
        break;
     case 'UPDATE_SETTINGS_FROM_SERVER':
       const serverSettings = {
          ...action.payload,
          supabaseUrl: state.settings.supabaseUrl,
          supabaseKey: state.settings.supabaseKey,
        };
        newState = { ...state, settings: serverSettings };
        break;
    case 'ADD_PRODUCTION_ENTRIES':
      const newEntries = action.payload.filter(
        (newEntry) => !state.productionEntries.some((existing) => existing.takaNumber === newEntry.takaNumber)
      );
      if (newEntries.length > 0) {
        newState = { 
            ...state, 
            productionEntries: [...state.productionEntries, ...newEntries],
            unsyncedChanges: {
                ...state.unsyncedChanges,
                production: {
                    ...state.unsyncedChanges.production,
                    add: [...state.unsyncedChanges.production.add, ...newEntries]
                }
            }
        };
      }
      break;
    case 'UPDATE_PRODUCTION_ENTRY':
      newState = {
        ...state,
        productionEntries: state.productionEntries.map((entry) =>
          entry.takaNumber === action.payload.takaNumber ? action.payload : entry
        ),
        unsyncedChanges: {
            ...state.unsyncedChanges,
            production: {
                ...state.unsyncedChanges.production,
                update: [...state.unsyncedChanges.production.update.filter(u => u.takaNumber !== action.payload.takaNumber), action.payload]
            }
        }
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
        unsyncedChanges: {
            ...state.unsyncedChanges,
            production: {
                ...state.unsyncedChanges.production,
                add: state.unsyncedChanges.production.add.filter(p => p.takaNumber !== action.payload),
                update: state.unsyncedChanges.production.update.filter(p => p.takaNumber !== action.payload),
                delete: [...state.unsyncedChanges.production.delete, action.payload]
            },
            delivery: {
                ...state.unsyncedChanges.delivery,
                 delete: [...state.unsyncedChanges.delivery.delete, ...state.deliveryEntries.filter(d => d.takaNumber === action.payload).map(d => d.id)]
            }
        }
      };
      break;
    case 'ADD_DELIVERY_ENTRY':
      if (!state.deliveryEntries.some(e => e.id === action.payload.id)) {
        newState = { 
            ...state, 
            deliveryEntries: [...state.deliveryEntries, action.payload],
            unsyncedChanges: {
                ...state.unsyncedChanges,
                delivery: {
                    ...state.unsyncedChanges.delivery,
                    add: [...state.unsyncedChanges.delivery.add, action.payload]
                }
            }
        };
      }
      break;
    case 'ADD_DELIVERY_ENTRIES':
       const newDeliveryEntries = action.payload.filter(
        (newEntry) => !state.deliveryEntries.some((existing) => existing.id === newEntry.id)
      );
      if(newDeliveryEntries.length > 0) {
        newState = { 
            ...state,
            deliveryEntries: [...state.deliveryEntries, ...newDeliveryEntries],
            unsyncedChanges: {
                ...state.unsyncedChanges,
                delivery: {
                    ...state.unsyncedChanges.delivery,
                    add: [...state.unsyncedChanges.delivery.add, ...newDeliveryEntries]
                }
            }
        };
      }
      break;
    case 'UPDATE_DELIVERY_ENTRY':
        newState = {
          ...state,
          deliveryEntries: state.deliveryEntries.map((entry) =>
            entry.id === action.payload.id ? action.payload : entry
          ),
          unsyncedChanges: {
              ...state.unsyncedChanges,
              delivery: {
                  ...state.unsyncedChanges.delivery,
                  update: [...state.unsyncedChanges.delivery.update.filter(u => u.id !== action.payload.id), action.payload]
              }
          }
        };
        break;
    case 'DELETE_DELIVERY_ENTRY':
        newState = {
          ...state,
          deliveryEntries: state.deliveryEntries.filter(
            (entry) => entry.id !== action.payload
          ),
          unsyncedChanges: {
            ...state.unsyncedChanges,
            delivery: {
                ...state.unsyncedChanges.delivery,
                add: state.unsyncedChanges.delivery.add.filter(d => d.id !== action.payload),
                update: state.unsyncedChanges.delivery.update.filter(d => d.id !== action.payload),
                delete: [...state.unsyncedChanges.delivery.delete, action.payload]
            }
          }
        };
        break;
    case 'SET_PRODUCTION_ENTRIES':
        newState = { ...state, productionEntries: action.payload };
        break;
    case 'SET_DELIVERY_ENTRIES':
        newState = { ...state, deliveryEntries: action.payload };
        break;
    case 'CLEAR_UNSYNCED_CHANGES':
        newState = { ...state, unsyncedChanges: initialUnsyncedChanges };
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
          unsyncedChanges: newState.unsyncedChanges,
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
        const unsyncedChanges = parsedState.unsyncedChanges || initialUnsyncedChanges;
        dispatch({ type: 'INITIALIZE_STATE', payload: { ...initialState, ...parsedState, settings, unsyncedChanges } });
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
