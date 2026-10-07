import type { ThemeDef, GeneralSettings } from '@/types';

export const COPYRIGHT_AR = 'جميع حقوق الملكية محفوظة لمحمود شهاب';
export const COPYRIGHT_EN = 'All rights reserved to Mahmoud Shehab';
export const APP_NAME = 'PIQCS';
export const APP_NAME_AR = 'نظام إدارة ومتابعة الاستفسارات وعروض الأسعار';
export const APP_NAME_EN = 'Inquiry & Quotation Control System';

const base = (id: string, nameAr: string, nameEn: string, primary: string, secondary: string, accent: string): ThemeDef => ({
  id, nameAr, nameEn, isSystem: true,
  colors: {
    primary, secondary, accent,
    bg: '#F5F7FA', surface: '#FFFFFF', border: '#E2E8F0', text: '#0F172A', muted: '#64748B',
    success: '#16A34A', warning: '#D97706', danger: '#DC2626', info: '#2563EB'
  },
  dark: { bg: '#0B1220', surface: '#111C2E', border: '#1F2B40', text: '#E6EDF7', muted: '#94A3B8' }
});

export const SYSTEM_THEMES: ThemeDef[] = [
  base('corporate_navy',   'الكحلي المؤسسي',   'Corporate Navy',   '#1F3864', '#2E5C8A', '#C00000'),
  base('emerald',      'زمردي',         'Emerald',      '#047857', '#0F766E', '#F59E0B'),
  base('royal_purple', 'بنفسجي ملكي',   'Royal Purple', '#5B21B6', '#7C3AED', '#F97316'),
  base('sand_gold',    'رملي ذهبي',     'Sand Gold',    '#92400E', '#B45309', '#0369A1'),
  base('ocean',        'محيطي',         'Ocean',        '#0C4A6E', '#0369A1', '#DB2777'),
  base('graphite',     'جرافيت',        'Graphite',     '#1F2937', '#374151', '#2563EB')
];

export const DEFAULT_SETTINGS: GeneralSettings = {
  companyNameAr: 'شركة تجريبية للمقاولات',
  companyNameEn: 'Demo Contracting Co.',
  defaultLanguage: 'ar',
  defaultThemeId: 'corporate_navy',
  allowUserTheme: true,
  currency: 'SAR',
  slaHours: { CRITICAL: 8, HIGH: 16, MEDIUM: 24, LOW: 40 },
  workingHours: { start: '08:00', end: '17:00', workDays: [0, 1, 2, 3, 4] }, // Sun..Thu
  holidays: [],
  priorityAutoConfirmHours: 4,
  logRetentionMonths: 12,
  quotationValidityDays: 30,
  inquiryPrefix: 'INQ',
  quotationPrefix: 'QTN',
  inquiryNumbering: 'manual',
  quotationNumbering: 'auto',
  defaultCountry: 'SA'
};

function hexToRgb(hex: string): string {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}

export function applyTheme(theme: ThemeDef, dark: boolean) {
  const root = document.documentElement;
  const c = theme.colors;
  const d = theme.dark;
  const map: Record<string, string> = {
    primary: c.primary, secondary: c.secondary, accent: c.accent,
    success: c.success, warning: c.warning, danger: c.danger, info: c.info,
    bg: dark ? d.bg : c.bg, surface: dark ? d.surface : c.surface, border: dark ? d.border : c.border,
    text: dark ? d.text : c.text, muted: dark ? d.muted : c.muted
  };
  Object.entries(map).forEach(([k, v]) => root.style.setProperty(`--c-${k}`, hexToRgb(v)));
  root.classList.toggle('dark', dark);
}
