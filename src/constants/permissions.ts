// Every permission is `module.action`. Labels live in i18n under `perm.<key>`.
export interface PermissionDef { key: string; module: string }

const M = (module: string, actions: string[]): PermissionDef[] =>
  actions.map(a => ({ key: `${module}.${a}`, module }));

export const PERMISSION_MODULES = [
  'inquiries', 'tasks', 'issues', 'quotations', 'extensions', 'follow_ups',
  'clients', 'projects', 'team', 'users', 'roles', 'activity_log', 'reports', 'dashboards', 'settings', 'admin'
] as const;

export const PERMISSIONS: PermissionDef[] = [
  ...M('inquiries', ['view.own', 'view.all', 'create', 'edit', 'delete', 'assign', 'set_priority', 'change_status']),
  ...M('tasks', ['view.own', 'view.all', 'create', 'edit', 'delete', 'complete']),
  ...M('issues', ['view', 'create', 'edit', 'resolve', 'delete']),
  ...M('quotations', ['view', 'create', 'edit', 'delete', 'submit_for_approval', 'choose_approver', 'approve', 'reject', 'send_to_sales', 'send_to_client', 'create_revision']),
  ...M('extensions', ['request', 'approve', 'reject']),
  ...M('follow_ups', ['view', 'create', 'edit', 'close_won', 'close_lost']),
  ...M('clients', ['view', 'create', 'edit', 'delete']),
  ...M('projects', ['view', 'create', 'edit', 'delete']),
  ...M('team', ['view', 'create', 'edit', 'delete']),
  ...M('users', ['view', 'create', 'edit', 'deactivate', 'delete', 'reset_password', 'assign_role']),
  ...M('roles', ['view', 'create', 'edit', 'delete', 'manage_permissions']),
  ...M('activity_log', ['view', 'export', 'delete', 'purge']),
  ...M('reports', ['view', 'export_pdf', 'export_excel', 'view_financials']),
  ...M('dashboards', ['view.personal', 'view.team', 'view.company', 'view.performance']),
  ...M('settings', ['view', 'edit_general', 'edit_theme', 'edit_workflow', 'edit_sla']),
  ...M('admin', ['broadcast_message'])
];

export const ALL_PERMISSION_KEYS = PERMISSIONS.map(p => p.key);

export function computeEffective(rolePerms: string[], overrides?: { granted?: string[]; denied?: string[] }): string[] {
  const set = new Set<string>(rolePerms || []);
  (overrides?.granted || []).forEach(p => set.add(p));
  (overrides?.denied || []).forEach(p => set.delete(p));
  return Array.from(set);
}
