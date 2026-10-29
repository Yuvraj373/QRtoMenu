import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api from './api';

const DEFAULT_SETTINGS = {
  restaurantName: 'PizzaSter',
  tagline: 'Pure Veg',
  themeColor: '#ef4444',
  address: '',
  phone: '',
  since: '',
};

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  const refresh = useCallback(() => {
    api.get('/settings').then((res) => setSettings({ ...DEFAULT_SETTINGS, ...res.data })).catch(() => {});
  }, []);

  useEffect(refresh, [refresh]);

  useEffect(() => {
    document.documentElement.style.setProperty('--brand', settings.themeColor);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', settings.themeColor);
    document.title = settings.restaurantName ? `${settings.restaurantName} · Menu` : 'Menu';
  }, [settings.themeColor, settings.restaurantName]);

  return <SettingsContext.Provider value={{ settings, setSettings, refresh }}>{children}</SettingsContext.Provider>;
}

// eslint-disable-next-line react/only-export-components
export const useSettings = () => useContext(SettingsContext);
