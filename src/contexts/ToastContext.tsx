import React, { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

type Level = 'success' | 'error' | 'warning' | 'info';
interface Toast { id: number; level: Level; text: string }
interface ToastCtx { toast: (text: string, level?: Level) => void }

const Ctx = createContext<ToastCtx>({ toast: () => {} });

const icons = { success: CheckCircle2, error: XCircle, warning: AlertTriangle, info: Info };
const colors = { success: 'border-success text-success', error: 'border-danger text-danger', warning: 'border-warning text-warning', info: 'border-info text-info' };

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const toast = useCallback((text: string, level: Level = 'success') => {
    const id = Date.now() + Math.random();
    setItems(l => [...l, { id, level, text }]);
    setTimeout(() => setItems(l => l.filter(t => t.id !== id)), 4000);
  }, []);
  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 start-4 z-[100] flex flex-col gap-2 max-w-sm">
        {items.map(t => {
          const Icon = icons[t.level];
          return (
            <div key={t.id} className={`flex items-center gap-2 bg-surface border-s-4 shadow-lg rounded-md px-3 py-2 text-sm text-txt ${colors[t.level]}`}>
              <Icon size={18} /><span className="flex-1 text-txt">{t.text}</span>
              <button onClick={() => setItems(l => l.filter(x => x.id !== t.id))} className="text-muted"><X size={14} /></button>
            </div>
          );
        })}
      </div>
    </Ctx.Provider>
  );
}
export const useToast = () => useContext(Ctx);
