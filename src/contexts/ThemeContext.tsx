import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, doc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { SYSTEM_THEMES, applyTheme, DEFAULT_SETTINGS } from '@/constants/themes';
import type { ThemeDef, GeneralSettings } from '@/types';
import { useAuth } from './AuthContext';

interface ThemeCtx {
  themes: ThemeDef[];
  settings: GeneralSettings;
  activeTheme: ThemeDef;
  dark: boolean;
  mode: 'light' | 'dark' | 'system';
  setMode: (m: 'light' | 'dark' | 'system') => void;
  setThemeId: (id: string) => void;
  themeId: string;
}

const Ctx = createContext<ThemeCtx | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [custom, setCustom] = useState<ThemeDef[]>([]);
  const [settings, setSettings] = useState<GeneralSettings>(DEFAULT_SETTINGS);
  const [mode, setModeState] = useState<'light' | 'dark' | 'system'>(() => {
    try { return (localStorage.getItem('piqcs.mode') as any) || 'light'; } catch { return 'light'; }
  });
  const [localThemeId, setLocalThemeId] = useState<string>(() => {
    try { return localStorage.getItem('piqcs.theme') || ''; } catch { return ''; }
  });
  const [sysDark, setSysDark] = useState(() => typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches);

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq) return;
    const h = (e: MediaQueryListEvent) => setSysDark(e.matches);
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, []);

  useEffect(() => {
    if (!user) return;
    const off1 = onSnapshot(collection(db, 'themes'), s => setCustom(s.docs.map(d => ({ id: d.id, ...(d.data() as Omit<ThemeDef, 'id'>) }))), () => {});
    const off2 = onSnapshot(doc(db, 'settings', 'general'), s => { if (s.exists()) setSettings({ ...DEFAULT_SETTINGS, ...(s.data() as Partial<GeneralSettings>) }); }, () => {});
    return () => { off1(); off2(); };
  }, [user?.uid]);

  useEffect(() => { if (user?.darkMode) setModeState(user.darkMode); }, [user?.darkMode]);
  useEffect(() => { if (user?.themeId) setLocalThemeId(user.themeId); }, [user?.themeId]);

  const themes = useMemo(() => [...SYSTEM_THEMES, ...custom], [custom]);
  const themeId = (settings.allowUserTheme && localThemeId) ? localThemeId : settings.defaultThemeId;
  const activeTheme = themes.find(t => t.id === themeId) || themes.find(t => t.id === settings.defaultThemeId) || SYSTEM_THEMES[0];
  const dark = mode === 'dark' || (mode === 'system' && sysDark);

  useEffect(() => { applyTheme(activeTheme, dark); }, [activeTheme, dark]);

  const setMode = (m: 'light' | 'dark' | 'system') => { setModeState(m); try { localStorage.setItem('piqcs.mode', m); } catch { /* */ } };
  const setThemeId = (id: string) => { setLocalThemeId(id); try { localStorage.setItem('piqcs.theme', id); } catch { /* */ } };

  const value = useMemo(() => ({ themes, settings, activeTheme, dark, mode, setMode, setThemeId, themeId }), [themes, settings, activeTheme, dark, mode, themeId]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useTheme outside provider');
  return c;
}
