import type { CountryCode } from '@/types';

export interface CountryDef {
  code: CountryCode;
  nameAr: string;
  nameEn: string;
  /** default currency used when the inquiry belongs to this country */
  currency: string;
  /** statutory VAT at the time of writing — overridable per quotation */
  vatPct: number;
  flag: string;
  color: string;
}

/**
 * The company operates in Saudi Arabia and the UAE. Every inquiry carries its country so
 * the pricing team can filter its pipeline per market (different VAT, different rates).
 */
export const COUNTRIES: CountryDef[] = [
  { code: 'SA', nameAr: 'السعودية', nameEn: 'Saudi Arabia', currency: 'SAR', vatPct: 15, flag: '🇸🇦', color: '#166534' },
  { code: 'AE', nameAr: 'الإمارات', nameEn: 'United Arab Emirates', currency: 'AED', vatPct: 5, flag: '🇦🇪', color: '#B91C1C' }
];

export const COUNTRY_CODES: CountryCode[] = COUNTRIES.map(c => c.code);

export function countryDef(code?: string): CountryDef | undefined {
  return COUNTRIES.find(c => c.code === code);
}

export function countryName(code: string | undefined, lang: 'ar' | 'en'): string {
  const c = countryDef(code);
  return c ? (lang === 'ar' ? c.nameAr : c.nameEn) : '';
}

/** currency for a country, falling back to the system default */
export function currencyFor(code: string | undefined, fallback: string): string {
  return countryDef(code)?.currency || fallback;
}
