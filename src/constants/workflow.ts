import type { InquiryStatus, Priority } from '@/types';

export interface StatusDef {
  key: InquiryStatus;
  color: string;      // tailwind-ish hex
  isFinal?: boolean;
  pausesClock?: boolean;
  step: number;       // position in the stepper (0 = not on main path)
  /** which permission may move an inquiry INTO this status */
  permission: string;
  /** a note is mandatory when entering this status */
  requiresNote?: boolean;
}

export const STATUSES: Record<InquiryStatus, StatusDef> = {
  NEW:                 { key: 'NEW',                 color: '#6B7280', step: 1,  permission: 'inquiries.create' },
  FILE_REVIEW:         { key: 'FILE_REVIEW',         color: '#60A5FA', step: 2,  permission: 'inquiries.change_status' },
  WAITING_INFO:        { key: 'WAITING_INFO',        color: '#F59E0B', step: 0,  permission: 'inquiries.change_status', pausesClock: true, requiresNote: true },
  PRIORITY_ASSIGNMENT: { key: 'PRIORITY_ASSIGNMENT', color: '#A78BFA', step: 3,  permission: 'inquiries.change_status' },
  ASSIGNED:            { key: 'ASSIGNED',            color: '#3B82F6', step: 4,  permission: 'inquiries.assign' },
  PROCESSING:          { key: 'PROCESSING',          color: '#1D4ED8', step: 5,  permission: 'inquiries.change_status' },
  COSTING:             { key: 'COSTING',             color: '#0EA5E9', step: 6,  permission: 'inquiries.change_status' },
  QUOTATION_PREP:      { key: 'QUOTATION_PREP',      color: '#14B8A6', step: 7,  permission: 'inquiries.change_status' },
  UNDER_REVIEW:        { key: 'UNDER_REVIEW',        color: '#8B5CF6', step: 8,  permission: 'quotations.submit_for_approval' },
  REVISION_REQUIRED:   { key: 'REVISION_REQUIRED',   color: '#F87171', step: 0,  permission: 'quotations.reject', requiresNote: true },
  APPROVED:            { key: 'APPROVED',            color: '#4ADE80', step: 9,  permission: 'quotations.approve' },
  SENT_TO_SALES:       { key: 'SENT_TO_SALES',       color: '#22C55E', step: 10, permission: 'quotations.send_to_sales' },
  SENT_TO_CLIENT:      { key: 'SENT_TO_CLIENT',      color: '#16A34A', step: 11, permission: 'quotations.send_to_client' },
  FOLLOW_UP:           { key: 'FOLLOW_UP',           color: '#EAB308', step: 12, permission: 'follow_ups.create' },
  CLIENT_REVISION:     { key: 'CLIENT_REVISION',     color: '#FB923C', step: 0,  permission: 'quotations.create_revision', requiresNote: true },
  WON:                 { key: 'WON',                 color: '#15803D', step: 13, permission: 'follow_ups.close_won', isFinal: true },
  LOST:                { key: 'LOST',                color: '#B91C1C', step: 13, permission: 'follow_ups.close_lost', isFinal: true, requiresNote: true },
  NO_BID:              { key: 'NO_BID',              color: '#374151', step: 0,  permission: 'inquiries.change_status', isFinal: true, requiresNote: true },
  CANCELLED:           { key: 'CANCELLED',           color: '#9CA3AF', step: 0,  permission: 'inquiries.change_status', isFinal: true, requiresNote: true },
  ON_HOLD:             { key: 'ON_HOLD',             color: '#CA8A04', step: 0,  permission: 'inquiries.change_status', pausesClock: true, requiresNote: true }
};

/** allowed transitions: from -> to[] */
export const TRANSITIONS: Record<InquiryStatus, InquiryStatus[]> = {
  NEW:                 ['FILE_REVIEW', 'NO_BID', 'CANCELLED', 'ON_HOLD'],
  FILE_REVIEW:         ['PRIORITY_ASSIGNMENT', 'WAITING_INFO', 'NO_BID', 'CANCELLED', 'ON_HOLD'],
  WAITING_INFO:        ['FILE_REVIEW', 'PRIORITY_ASSIGNMENT', 'PROCESSING', 'CANCELLED', 'NO_BID'],
  PRIORITY_ASSIGNMENT: ['ASSIGNED', 'WAITING_INFO', 'NO_BID', 'ON_HOLD'],
  ASSIGNED:            ['PROCESSING', 'WAITING_INFO', 'ON_HOLD', 'CANCELLED'],
  PROCESSING:          ['COSTING', 'WAITING_INFO', 'ON_HOLD', 'CANCELLED'],
  COSTING:             ['QUOTATION_PREP', 'PROCESSING', 'WAITING_INFO', 'ON_HOLD'],
  QUOTATION_PREP:      ['UNDER_REVIEW', 'COSTING', 'ON_HOLD'],
  UNDER_REVIEW:        ['APPROVED', 'REVISION_REQUIRED', 'NO_BID'],
  REVISION_REQUIRED:   ['UNDER_REVIEW', 'COSTING'],
  APPROVED:            ['SENT_TO_SALES'],
  SENT_TO_SALES:       ['SENT_TO_CLIENT', 'CLIENT_REVISION'],
  SENT_TO_CLIENT:      ['FOLLOW_UP', 'WON', 'LOST', 'CLIENT_REVISION', 'CANCELLED'],
  FOLLOW_UP:           ['WON', 'LOST', 'CLIENT_REVISION', 'CANCELLED', 'FOLLOW_UP'],
  CLIENT_REVISION:     ['UNDER_REVIEW', 'COSTING'],
  WON:                 [],
  LOST:                [],
  NO_BID:              [],
  CANCELLED:           [],
  ON_HOLD:             ['NEW', 'FILE_REVIEW', 'PRIORITY_ASSIGNMENT', 'ASSIGNED', 'PROCESSING', 'COSTING', 'QUOTATION_PREP', 'CANCELLED']
};

export const MAIN_PATH: InquiryStatus[] = [
  'NEW', 'FILE_REVIEW', 'PRIORITY_ASSIGNMENT', 'ASSIGNED', 'PROCESSING', 'COSTING',
  'QUOTATION_PREP', 'UNDER_REVIEW', 'APPROVED', 'SENT_TO_SALES', 'SENT_TO_CLIENT', 'FOLLOW_UP', 'WON'
];

export const ACTIVE_STATUSES: InquiryStatus[] = (Object.keys(STATUSES) as InquiryStatus[])
  .filter(s => !STATUSES[s].isFinal);

export const PENDING_QUOTE_STATUSES: InquiryStatus[] = ACTIVE_STATUSES
  .filter(s => !['SENT_TO_CLIENT', 'FOLLOW_UP'].includes(s));

export const PRIORITIES: { key: Priority; color: string; order: number }[] = [
  { key: 'CRITICAL', color: '#DC2626', order: 1 },
  { key: 'HIGH',     color: '#F97316', order: 2 },
  { key: 'MEDIUM',   color: '#EAB308', order: 3 },
  { key: 'LOW',      color: '#22C55E', order: 4 }
];

export const LOST_REASONS = ['price', 'competitor', 'project_cancelled', 'late_response', 'technical', 'in_house', 'other'] as const;
export const SCOPE_TYPES = ['cutting', 'coring', 'scanning', 'demolition', 'repair', 'strengthening', 'monitoring', 'other'] as const;
export const SEND_CHANNELS = ['email', 'whatsapp', 'portal', 'hand', 'other'] as const;
export const COST_KEYS = ['labour', 'equipment', 'material', 'subcontractor', 'transport', 'permits', 'other'] as const;
