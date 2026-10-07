import type { Timestamp } from 'firebase/firestore';
import type { Lang } from '@/types';

const locale = (l: Lang) => (l === 'ar' ? 'ar-EG' : 'en-GB');

export const toDate = (v?: Timestamp | Date | null): Date | undefined => {
  if (!v) return undefined;
  return v instanceof Date ? v : (v as any).toDate?.();
};

export function fmtDate(v?: Timestamp | Date | null, lang: Lang = 'ar') {
  const d = toDate(v); if (!d) return '—';
  return new Intl.DateTimeFormat(locale(lang), { year: 'numeric', month: '2-digit', day: '2-digit', numberingSystem: 'latn' } as any).format(d);
}
export function fmtDateTime(v?: Timestamp | Date | null, lang: Lang = 'ar') {
  const d = toDate(v); if (!d) return '—';
  return new Intl.DateTimeFormat(locale(lang), { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', numberingSystem: 'latn' } as any).format(d);
}
export function fmtTime(v?: Timestamp | Date | null, lang: Lang = 'ar') {
  const d = toDate(v); if (!d) return '—';
  return new Intl.DateTimeFormat(locale(lang), { hour: '2-digit', minute: '2-digit', numberingSystem: 'latn' } as any).format(d);
}
export function fmtMoney(v?: number | null, lang: Lang = 'ar', currency = 'SAR') {
  if (v === undefined || v === null || isNaN(v)) return '—';
  return new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-US', { style: 'currency', currency, maximumFractionDigits: 2, numberingSystem: 'latn' } as any).format(v);
}
export function fmtNum(v?: number | null, digits = 0) {
  if (v === undefined || v === null || isNaN(v)) return '—';
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: digits }).format(v);
}
export function fmtPct(v?: number | null) { return v === undefined || v === null || isNaN(v) ? '—' : `${v.toFixed(1)}%`; }

export function fmtDuration(minutes: number, lang: Lang = 'ar') {
  if (!minutes || minutes < 1) return lang === 'ar' ? '0 د' : '0m';
  const d = Math.floor(minutes / 480), h = Math.floor((minutes % 480) / 60), m = Math.round(minutes % 60);
  const parts: string[] = [];
  if (d) parts.push(lang === 'ar' ? `${d} يوم عمل` : `${d}wd`);
  if (h) parts.push(lang === 'ar' ? `${h} س` : `${h}h`);
  if (m && !d) parts.push(lang === 'ar' ? `${m} د` : `${m}m`);
  return parts.join(' ');
}

export function toInputDate(v?: Timestamp | Date | null) {
  const d = toDate(v); if (!d) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function toInputDateTime(v?: Timestamp | Date | null) {
  const d = toDate(v); if (!d) return '';
  return `${toInputDate(d)}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
export const initials = (s?: string) => (s || '?').split(' ').slice(0, 2).map(x => x[0]).join('').toUpperCase();
