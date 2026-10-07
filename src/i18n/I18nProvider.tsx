import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import ar from './ar';
import en from './en';
import type { Lang } from '@/types';

const dicts = { ar, en } as const;

interface I18nCtx {
  lang: Lang;
  dir: 'rtl' | 'ltr';
  setLang: (l: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  /** pick the localized value from a pair */
  pick: (arVal?: string, enVal?: string) => string;
}

const Ctx = createContext<I18nCtx | null>(null);

function get(obj: any, path: string): string | undefined {
  return path.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), obj);
}

export function I18nProvider({ children, initial }: { children: React.ReactNode; initial?: Lang }) {
  const [lang, setLangState] = useState<Lang>(() => {
    try { return (localStorage.getItem('piqcs.lang') as Lang) || initial || 'ar'; } catch { return initial || 'ar'; }
  });

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try { localStorage.setItem('piqcs.lang', l); } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);

  const t = useCallback((key: string, vars?: Record<string, string | number>) => {
    let s = get(dicts[lang], key) ?? get(dicts.en, key) ?? key;
    if (vars) Object.entries(vars).forEach(([k, v]) => { s = s.replace(`{${k}}`, String(v)); });
    return s;
  }, [lang]);

  const pick = useCallback((arVal?: string, enVal?: string) => {
    return (lang === 'ar' ? (arVal || enVal) : (enVal || arVal)) || '';
  }, [lang]);

  const value = useMemo(() => ({ lang, dir: lang === 'ar' ? 'rtl' as const : 'ltr' as const, setLang, t, pick }), [lang, setLang, t, pick]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useI18n outside provider');
  return c;
}
