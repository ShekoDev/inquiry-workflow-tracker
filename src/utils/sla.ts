import type { GeneralSettings, Inquiry, Priority } from '@/types';
import { STATUSES } from '@/constants/workflow';

const toMin = (hhmm: string) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + (m || 0); };
const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function isWorkDay(d: Date, s: GeneralSettings) {
  return s.workingHours.workDays.includes(d.getDay()) && !s.holidays.includes(dayKey(d));
}

/** working minutes between two instants, honouring working hours, work days and holidays */
export function workingMinutesBetween(a: Date, b: Date, s: GeneralSettings): number {
  if (b <= a) return 0;
  const start = toMin(s.workingHours.start), end = toMin(s.workingHours.end);
  let total = 0;
  const cur = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  while (cur <= b) {
    if (isWorkDay(cur, s)) {
      const dayStart = new Date(cur); dayStart.setMinutes(start, 0, 0);
      const dayEnd = new Date(cur); dayEnd.setMinutes(end, 0, 0);
      const from = a > dayStart ? a : dayStart;
      const to = b < dayEnd ? b : dayEnd;
      if (to > from) total += (to.getTime() - from.getTime()) / 60000;
    }
    cur.setDate(cur.getDate() + 1);
  }
  return Math.round(total);
}

/** add N working hours to an instant → deadline */
export function addWorkingHours(from: Date, hours: number, s: GeneralSettings): Date {
  const start = toMin(s.workingHours.start), end = toMin(s.workingHours.end);
  let remaining = hours * 60;
  const cur = new Date(from);
  for (let guard = 0; guard < 400 && remaining > 0; guard++) {
    if (!isWorkDay(cur, s)) { cur.setDate(cur.getDate() + 1); cur.setMinutes(start, 0, 0); continue; }
    const dayEnd = new Date(cur); dayEnd.setMinutes(end, 0, 0);
    const dayStart = new Date(cur); dayStart.setMinutes(start, 0, 0);
    if (cur < dayStart) cur.setTime(dayStart.getTime());
    if (cur >= dayEnd) { cur.setDate(cur.getDate() + 1); cur.setMinutes(start, 0, 0); continue; }
    const avail = (dayEnd.getTime() - cur.getTime()) / 60000;
    if (avail >= remaining) { cur.setTime(cur.getTime() + remaining * 60000); remaining = 0; }
    else { remaining -= avail; cur.setDate(cur.getDate() + 1); cur.setMinutes(start, 0, 0); }
  }
  return cur;
}

export function slaHoursFor(priority: Priority | undefined, s: GeneralSettings) {
  return s.slaHours[priority || 'MEDIUM'] ?? 24;
}

export interface Times {
  totalElapsedMin: number;
  netWorkingMin: number;
  pausedMin: number;
  isOverdue: boolean;
  delayMin: number;
  /** working minutes between receipt and the engineer acknowledging it (0 until acknowledged) */
  responseMin: number;
  /** working minutes since the work clock started — still ticking while the inquiry is open */
  workingMin: number;
  /** true once someone confirmed receipt, i.e. the work clock is running */
  started: boolean;
  /** the instant the work clock started, if it has */
  startedAt?: Date;
  /** remaining working minutes before the deadline (negative once overdue) */
  remainingMin: number;
  /** 0..100 — how much of the SLA window has been consumed */
  slaUsedPct: number;
}

/**
 * The work clock starts at the earliest of: the engineer's acknowledgement, or the move to PROCESSING.
 * Everything before that is queue time, which is what `responseMin` measures.
 */
export function workClockStart(inq: Inquiry): Date | undefined {
  const ack = inq.acknowledgedAt?.toDate?.();
  const proc = inq.processingStartedAt?.toDate?.();
  if (ack && proc) return ack < proc ? ack : proc;
  return ack || proc;
}

export function computeTimes(inq: Inquiry, s: GeneralSettings, now = new Date()): Times {
  const received = inq.receivedAt?.toDate?.() || now;
  const endRef = inq.closedAt?.toDate?.() || inq.processingCompletedAt?.toDate?.() || now;
  const totalElapsedMin = Math.max(0, Math.round((endRef.getTime() - received.getTime()) / 60000));
  let pausedMin = inq.pausedMinutes || 0;
  if (inq.pausedAt && STATUSES[inq.status]?.pausesClock) pausedMin += workingMinutesBetween(inq.pausedAt.toDate(), now, s);

  const startedAt = workClockStart(inq);
  const started = !!startedAt;
  const startRef = startedAt || received;
  const netWorkingMin = Math.max(0, workingMinutesBetween(startRef, endRef, s) - pausedMin);
  const workingMin = netWorkingMin;
  const responseMin = inq.firstResponseMin ?? (startedAt ? workingMinutesBetween(received, startedAt, s) : workingMinutesBetween(received, now, s));

  const deadline = inq.deadlineAt?.toDate?.();
  const isFinal = !!STATUSES[inq.status]?.isFinal;
  const isOverdue = !!deadline && !isFinal && !['SENT_TO_CLIENT', 'FOLLOW_UP'].includes(inq.status) && now > deadline;
  const delayMin = deadline && now > deadline ? workingMinutesBetween(deadline, now, s) : 0;
  const remainingMin = deadline ? (now < deadline ? workingMinutesBetween(now, deadline, s) : -delayMin) : 0;

  let slaUsedPct = 0;
  if (deadline) {
    const total = workingMinutesBetween(startRef, deadline, s) || 1;
    slaUsedPct = Math.min(100, Math.max(0, Math.round((netWorkingMin / total) * 100)));
    if (isOverdue) slaUsedPct = 100;
  }
  return { totalElapsedMin, netWorkingMin, pausedMin, isOverdue, delayMin, responseMin, workingMin, started, startedAt, remainingMin, slaUsedPct };
}

/** Auto priority from required date + client tier + estimated value */
export function autoPriority(requiredDate: Date | undefined, tier: 'A' | 'B' | 'C' | undefined, estimatedValue: number | undefined, now = new Date()): Priority {
  let score = 0;
  if (requiredDate) {
    const days = (requiredDate.getTime() - now.getTime()) / 86400000;
    score += days <= 1 ? 40 : days <= 3 ? 30 : days <= 7 ? 15 : 5;
  } else score += 10;
  score += tier === 'A' ? 25 : tier === 'B' ? 15 : 5;
  const v = estimatedValue || 0;
  score += v >= 500000 ? 25 : v >= 100000 ? 15 : v >= 20000 ? 8 : 3;
  return score >= 75 ? 'CRITICAL' : score >= 55 ? 'HIGH' : score >= 35 ? 'MEDIUM' : 'LOW';
}
