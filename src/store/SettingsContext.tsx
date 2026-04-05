import React, { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react';
import type { AppSettings } from '../types';
import { DEFAULT_SETTINGS } from '../types';
import { loadSettings, saveSettings } from '../services/storage';

interface SettingsState extends AppSettings {
  loaded: boolean;
}

type SettingsAction =
  | { type: 'SET_SETTINGS'; payload: AppSettings }
  | { type: 'UPDATE_SETTING'; payload: Partial<AppSettings> };

const initialState: SettingsState = {
  ...DEFAULT_SETTINGS,
  loaded: false,
};

function settingsReducer(state: SettingsState, action: SettingsAction): SettingsState {
  switch (action.type) {
    case 'SET_SETTINGS':
      return { ...action.payload, loaded: true };
    case 'UPDATE_SETTING':
      return { ...state, ...action.payload };
    default:
      return state;
  }
}

interface SettingsContextValue {
  settings: SettingsState;
  updateSettings: (updates: Partial<AppSettings>) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(settingsReducer, initialState);

  useEffect(() => {
    loadSettings().then((s) => dispatch({ type: 'SET_SETTINGS', payload: s }));
  }, []);

  const updateSettings = async (updates: Partial<AppSettings>) => {
    const newSettings = { ...state, ...updates };
    dispatch({ type: 'UPDATE_SETTING', payload: updates });
    await saveSettings(newSettings as AppSettings);
  };

  return (
    <SettingsContext.Provider value={{ settings: state, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettingsContext() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettingsContext must be used within SettingsProvider');
  return ctx;
}
