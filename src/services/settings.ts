import { doc, getDoc, setDoc, serverTimestamp, deleteDoc, runTransaction } from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { GeneralSettings, ThemeDef } from '@/types';
import { DEFAULT_SETTINGS } from '@/constants/themes';
import { logActivity } from './activityLog';

export async function getSettings(): Promise<GeneralSettings> {
  const s = await getDoc(doc(db, 'settings', 'general'));
  return s.exists() ? { ...DEFAULT_SETTINGS, ...(s.data() as Partial<GeneralSettings>) } : DEFAULT_SETTINGS;
}

export async function saveSettings(next: GeneralSettings, prev: GeneralSettings) {
  await setDoc(doc(db, 'settings', 'general'), { ...next, updatedAt: serverTimestamp() }, { merge: true });
  const changed = (Object.keys(next) as (keyof GeneralSettings)[]).filter(k => JSON.stringify(next[k]) !== JSON.stringify(prev[k]));
  for (const k of changed) {
    await logActivity({ action: 'UPDATE', module: 'settings', recordId: 'general', field: k, oldValue: prev[k], newValue: next[k], descriptionAr: `تعديل الإعداد ${k}`, descriptionEn: `Setting ${k} changed` });
  }
}

export async function saveTheme(theme: ThemeDef) {
  await setDoc(doc(db, 'themes', theme.id), { ...theme, isSystem: false, updatedAt: serverTimestamp() });
  await logActivity({ action: 'UPDATE', module: 'settings', recordId: theme.id, recordLabel: theme.nameEn, descriptionAr: `حفظ الثيم ${theme.nameAr}`, descriptionEn: `Saved theme ${theme.nameEn}` });
}

export async function deleteTheme(theme: ThemeDef) {
  await deleteDoc(doc(db, 'themes', theme.id));
  await logActivity({ action: 'DELETE', module: 'settings', recordId: theme.id, recordLabel: theme.nameEn, descriptionAr: `حذف الثيم ${theme.nameAr}`, descriptionEn: `Deleted theme ${theme.nameEn}` });
}

/** Atomic sequential number: INQ-2026-00042 */
export async function nextNumber(kind: 'inquiry' | 'quotation', prefix: string): Promise<string> {
  const year = new Date().getFullYear();
  const ref = doc(db, 'counters', `${kind}_${year}`);
  const n = await runTransaction(db, async (tx) => {
    const s = await tx.get(ref);
    const cur = s.exists() ? (s.data().value as number) : 0;
    tx.set(ref, { value: cur + 1, year, kind }, { merge: true });
    return cur + 1;
  });
  return `${prefix}-${year}-${String(n).padStart(5, '0')}`;
}
