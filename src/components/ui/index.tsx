import React, { useEffect, useState } from 'react';
import { X, Loader2, Inbox } from 'lucide-react';
import clsx from 'clsx';
import { useI18n } from '@/i18n/I18nProvider';
import { STATUSES, PRIORITIES } from '@/constants/workflow';
import { COUNTRIES, countryDef } from '@/constants/countries';
import type { CountryCode, InquiryStatus, Priority, QuotationStatus } from '@/types';

// ---------- Basic inputs ----------
export const Field = ({ label, children, required, hint, className }: { label: string; children: React.ReactNode; required?: boolean; hint?: string; className?: string }) => (
  <div className={className}>
    <label className="label">{label}{required && <span className="text-danger ms-1">*</span>}</label>
    {children}
    {hint && <p className="text-xs text-muted mt-1">{hint}</p>}
  </div>
);

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>((props, ref) => (
  <input ref={ref} {...props} className={clsx('input', props.className)} />
));
Input.displayName = 'Input';

export const Textarea = (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...props} className={clsx('input min-h-[80px]', props.className)} />;

export const Select = ({ options, placeholder, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { options: { value: string; label: string }[]; placeholder?: string }) => {
  const { t } = useI18n();
  return (
    <select {...props} className={clsx('input', props.className)}>
      <option value="">{placeholder ?? t('common.select')}</option>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
};

export const Checkbox = ({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label?: string }) => (
  <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
    <input type="checkbox" {...props} className="h-4 w-4 rounded border-border accent-[rgb(var(--c-primary))]" />
    {label && <span>{label}</span>}
  </label>
);

// ---------- Layout bits ----------
export const Card = ({ title, actions, children, className, bodyClass }: { title?: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode; className?: string; bodyClass?: string }) => (
  <div className={clsx('card', className)}>
    {(title || actions) && (
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 px-3 sm:px-4 py-2 sm:py-3 border-b border-border">
        <div className="font-semibold text-sm">{title}</div>
        <div className="flex items-center gap-2">{actions}</div>
      </div>
    )}
    <div className={clsx('card-body', bodyClass)}>{children}</div>
  </div>
);

export const PageHeader = ({ title, subtitle, actions }: { title: React.ReactNode; subtitle?: React.ReactNode; actions?: React.ReactNode }) => (
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
    <div className="min-w-0">
      <h1 className="text-lg sm:text-xl font-bold">{title}</h1>
      {subtitle && <p className="text-xs sm:text-sm text-muted">{subtitle}</p>}
    </div>
    <div className="flex items-center gap-2 flex-wrap">{actions}</div>
  </div>
);

export const Spinner = ({ className }: { className?: string }) => <Loader2 className={clsx('animate-spin text-primary', className)} size={22} />;

export const Loading = () => (
  <div className="flex items-center justify-center py-16"><Spinner /></div>
);

export const Empty = ({ text }: { text?: string }) => {
  const { t } = useI18n();
  return (
    <div className="flex flex-col items-center justify-center py-12 text-muted gap-2">
      <Inbox size={36} /><span className="text-sm">{text || t('common.noData')}</span>
    </div>
  );
};

// ---------- Modal ----------
export const Modal = ({ open, onClose, title, children, footer, size = 'md' }: { open: boolean; onClose: () => void; title?: React.ReactNode; children: React.ReactNode; footer?: React.ReactNode; size?: 'sm' | 'md' | 'lg' | 'xl' }) => {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);
  if (!open) return null;
  const w = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl' }[size];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/50" onMouseDown={onClose}>
      <div className={clsx('card w-full max-h-[95vh] sm:max-h-[92vh] flex flex-col', w)} onMouseDown={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3 border-b border-border">
          <div className="font-semibold text-sm sm:text-base">{title}</div>
          <button onClick={onClose} className="text-muted hover:text-txt"><X size={18} /></button>
        </div>
        <div className="p-3 sm:p-4 overflow-y-auto flex-1">{children}</div>
        {footer && <div className="flex items-center justify-end gap-2 px-3 sm:px-4 py-2 sm:py-3 border-t border-border flex-wrap">{footer}</div>}
      </div>
    </div>
  );
};

export const Confirm = ({ open, onClose, onConfirm, title, text, danger, busy }: { open: boolean; onClose: () => void; onConfirm: () => void; title?: string; text?: string; danger?: boolean; busy?: boolean }) => {
  const { t } = useI18n();
  return (
    <Modal open={open} onClose={onClose} title={title || t('common.confirm')} size="sm"
      footer={<><button className="btn-secondary" onClick={onClose}>{t('common.cancel')}</button><button className={danger ? 'btn-danger' : 'btn-primary'} onClick={onConfirm} disabled={busy}>{busy ? <Spinner className="text-white" /> : t('common.confirm')}</button></>}>
      <p className="text-sm">{text || t('common.confirmDelete')}</p>
    </Modal>
  );
};

// ---------- Badges ----------
export const StatusBadge = ({ status }: { status: InquiryStatus }) => {
  const { t } = useI18n();
  const def = STATUSES[status];
  return <span className="badge text-white" style={{ background: def?.color || '#6B7280' }}>{t(`status.${status}`)}</span>;
};

export const PriorityBadge = ({ priority }: { priority?: Priority }) => {
  const { t } = useI18n();
  if (!priority) return <span className="badge bg-bg text-muted">—</span>;
  const def = PRIORITIES.find(p => p.key === priority);
  return <span className="badge text-white" style={{ background: def?.color }}>{t(`priority.${priority}`)}</span>;
};

const qColors: Record<QuotationStatus, string> = { DRAFT: '#6B7280', UNDER_REVIEW: '#8B5CF6', REVISION_REQUIRED: '#F87171', APPROVED: '#16A34A', REJECTED: '#B91C1C', SENT_TO_SALES: '#22C55E', SENT_TO_CLIENT: '#15803D', SUPERSEDED: '#9CA3AF' };
export const QStatusBadge = ({ status }: { status: QuotationStatus }) => {
  const { t } = useI18n();
  return <span className="badge text-white" style={{ background: qColors[status] }}>{t(`qstatus.${status}`)}</span>;
};

export const CountryBadge = ({ country, compact }: { country?: CountryCode | string; compact?: boolean }) => {
  const { lang } = useI18n();
  const def = countryDef(country);
  if (!def) return <span className="badge bg-bg text-muted">—</span>;
  return (
    <span className="badge gap-1" style={{ background: `${def.color}1A`, color: def.color }}>
      <span aria-hidden>{def.flag}</span>{!compact && (lang === 'ar' ? def.nameAr : def.nameEn)}
    </span>
  );
};

/** Segmented "All / 🇸🇦 / 🇦🇪" switch used on every list and on the dashboard. */
export const CountryFilter = ({ value, onChange, allLabel }: { value: string; onChange: (v: string) => void; allLabel: string }) => {
  const { lang } = useI18n();
  const opts = [{ code: '', label: allLabel, flag: '', color: '' }, ...COUNTRIES.map(c => ({ code: c.code as string, label: lang === 'ar' ? c.nameAr : c.nameEn, flag: c.flag, color: c.color }))];
  return (
    <div className="inline-flex flex-wrap rounded-lg border border-border bg-surface p-0.5 gap-0.5">
      {opts.map(o => (
        <button key={o.code || 'all'} type="button" onClick={() => onChange(o.code)}
          className={clsx('px-2 sm:px-2.5 py-1 rounded-md text-xs whitespace-nowrap transition', value === o.code ? 'bg-primary text-white font-semibold' : 'text-muted hover:text-txt')}>
          {o.flag && <span className="me-1" aria-hidden>{o.flag}</span>}<span className="hidden sm:inline">{o.label}</span><span className="sm:hidden">{o.flag || o.label.substring(0, 1)}</span>
        </button>
      ))}
    </div>
  );
};

// ---------- Live timer ----------
/** Re-renders once a minute so an open inquiry shows its clock actually running. */
export function useTicker(everyMs = 60000) {
  const [, setN] = useState(0);
  useEffect(() => { const h = setInterval(() => setN(n => n + 1), everyMs); return () => clearInterval(h); }, [everyMs]);
}

/** A small SLA bar: green → amber → red as the working time eats into the deadline. */
export const SlaBar = ({ pct, overdue }: { pct: number; overdue?: boolean }) => {
  const color = overdue || pct >= 100 ? '#DC2626' : pct >= 75 ? '#F59E0B' : '#16A34A';
  return (
    <div className="h-1.5 w-full rounded-full bg-bg overflow-hidden" title={`${pct}%`}>
      <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(3, Math.min(100, pct))}%`, background: color }} />
    </div>
  );
};

// ---------- Tabs ----------
export const Tabs = ({ tabs, active, onChange }: { tabs: { key: string; label: string; count?: number }[]; active: string; onChange: (k: string) => void }) => (
  <div className="flex gap-1 border-b border-border overflow-x-auto">
    {tabs.map(tb => (
      <button key={tb.key} onClick={() => onChange(tb.key)}
        className={clsx('px-3 py-2 text-sm whitespace-nowrap border-b-2 -mb-px transition', active === tb.key ? 'border-primary text-primary font-semibold' : 'border-transparent text-muted hover:text-txt')}>
        {tb.label}{tb.count !== undefined && <span className="ms-1 text-xs bg-bg rounded-full px-1.5">{tb.count}</span>}
      </button>
    ))}
  </div>
);

// ---------- Data table ----------
export interface Column<T> { key: string; header: React.ReactNode; render?: (row: T) => React.ReactNode; className?: string }
export function DataTable<T extends { id: string }>({ columns, rows, onRowClick, empty, loading }: { columns: Column<T>[]; rows: T[]; onRowClick?: (r: T) => void; empty?: string; loading?: boolean }) {
  if (loading) return <Loading />;
  if (!rows.length) return <Empty text={empty} />;
  return (
    <>
      {/* Desktop table view (lg and up) */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="table">
          <thead><tr>{columns.map(c => <th key={c.key} className={c.className}>{c.header}</th>)}</tr></thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} onClick={() => onRowClick?.(r)} className={onRowClick ? 'cursor-pointer' : ''}>
                {columns.map(c => <td key={c.key} className={c.className}>{c.render ? c.render(r) : String((r as any)[c.key] ?? '')}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile card view (below lg) */}
      <div className="lg:hidden space-y-3">
        {rows.map(r => (
          <div
            key={r.id}
            onClick={() => onRowClick?.(r)}
            className={clsx('card card-body', onRowClick && 'cursor-pointer hover:shadow-md')}
          >
            <div className="space-y-2">
              {columns.map(c => (
                <div key={c.key} className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1">
                  <span className="text-xs font-semibold text-muted uppercase tracking-wide">{c.header}</span>
                  <span className="text-sm">{c.render ? c.render(r) : String((r as any)[c.key] ?? '')}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export const Kpi = ({ label, value, color, onClick }: { label: string; value: React.ReactNode; color?: string; onClick?: () => void }) => (
  <div className={clsx('kpi', onClick && 'cursor-pointer hover:shadow')} onClick={onClick} style={color ? { borderInlineStartWidth: 4, borderInlineStartColor: color } : undefined}>
    <div className="kpi-value" style={color ? { color } : undefined}>{value}</div>
    <div className="kpi-label">{label}</div>
  </div>
);
