import { ALL_PERMISSION_KEYS } from './permissions';
import type { Role } from '@/types';

const pick = (...keys: string[]) => keys;

export const DEFAULT_ROLES: Omit<Role, 'createdAt'>[] = [
  {
    id: 'super_admin', nameAr: 'المدير الأعلى', nameEn: 'Super Admin', isSystem: true,
    permissions: ALL_PERMISSION_KEYS
  },
  {
    // مدير النظام — the default destination for approval requests
    id: 'admin', nameAr: 'مدير النظام', nameEn: 'System Admin', isSystem: true,
    permissions: ALL_PERMISSION_KEYS.filter(k => k !== 'activity_log.purge')
  },
  {
    // مدير القسم — owns the queue: distributes tasks, follows the work, may also approve
    id: 'department_manager', nameAr: 'مدير القسم', nameEn: 'Department Manager', isSystem: true,
    permissions: pick(
      'inquiries.view.all', 'inquiries.create', 'inquiries.edit', 'inquiries.delete',
      'inquiries.assign', 'inquiries.set_priority', 'inquiries.change_status',
      'tasks.view.own', 'tasks.view.all', 'tasks.create', 'tasks.edit', 'tasks.delete', 'tasks.complete',
      'issues.view', 'issues.create', 'issues.edit', 'issues.resolve', 'issues.delete',
      'quotations.view', 'quotations.create', 'quotations.edit', 'quotations.submit_for_approval', 'quotations.choose_approver',
      'quotations.approve', 'quotations.reject', 'quotations.send_to_sales', 'quotations.send_to_client', 'quotations.create_revision',
      'extensions.request', 'extensions.approve', 'extensions.reject',
      'follow_ups.view', 'follow_ups.create', 'follow_ups.edit', 'follow_ups.close_won', 'follow_ups.close_lost',
      'clients.view', 'clients.create', 'clients.edit',
      'projects.view', 'projects.create', 'projects.edit',
      'team.view', 'team.create', 'team.edit', 'team.delete',
      'users.view', 'activity_log.view',
      'reports.view', 'reports.export_pdf', 'reports.export_excel', 'reports.view_financials',
      'dashboards.view.personal', 'dashboards.view.team', 'dashboards.view.company', 'dashboards.view.performance',
      'settings.view'
    )
  },
  {
    id: 'priority_engineer', nameAr: 'مهندس الأولويات', nameEn: 'Priority Engineer', isSystem: true,
    permissions: pick(
      'inquiries.view.all', 'inquiries.set_priority', 'inquiries.assign', 'inquiries.change_status',
      'tasks.view.own', 'tasks.view.all', 'tasks.create', 'tasks.edit', 'tasks.complete',
      'issues.view', 'issues.create', 'issues.edit',
      'clients.view', 'projects.view', 'team.view', 'reports.view',
      'dashboards.view.personal', 'dashboards.view.team'
    )
  },
  {
    id: 'estimation_engineer', nameAr: 'مهندس التسعير', nameEn: 'Estimation Engineer', isSystem: true,
    permissions: pick(
      'inquiries.view.own', 'inquiries.edit', 'inquiries.change_status',
      'tasks.view.own', 'tasks.complete',
      'issues.view', 'issues.create',
      'quotations.view', 'quotations.create', 'quotations.edit', 'quotations.submit_for_approval', 'quotations.create_revision',
      'extensions.request', 'clients.view', 'projects.view', 'team.view',
      'dashboards.view.personal'
    )
  },
  {
    id: 'salesperson', nameAr: 'مسوق', nameEn: 'Salesperson', isSystem: true,
    permissions: pick(
      'inquiries.view.own', 'inquiries.create', 'inquiries.edit',
      'tasks.view.own', 'tasks.complete',
      'issues.view', 'issues.create',
      'quotations.view', 'quotations.send_to_client',
      'follow_ups.view', 'follow_ups.create', 'follow_ups.edit', 'follow_ups.close_won', 'follow_ups.close_lost',
      'clients.view', 'clients.create', 'projects.view', 'projects.create', 'team.view',
      'dashboards.view.personal'
    )
  },
  {
    id: 'management', nameAr: 'الإدارة العليا', nameEn: 'Management', isSystem: true,
    permissions: pick(
      'inquiries.view.all', 'quotations.view', 'quotations.approve', 'quotations.reject',
      'tasks.view.own', 'tasks.view.all', 'tasks.create', 'tasks.edit',
      'issues.view',
      'extensions.approve', 'extensions.reject', 'follow_ups.view',
      'clients.view', 'projects.view', 'team.view', 'users.view',
      'reports.view', 'reports.export_pdf', 'reports.export_excel', 'reports.view_financials',
      'dashboards.view.personal', 'dashboards.view.team', 'dashboards.view.company', 'dashboards.view.performance', 'settings.view'
    )
  },
  {
    id: 'viewer', nameAr: 'مشاهد', nameEn: 'Viewer', isSystem: true,
    permissions: pick('inquiries.view.all', 'quotations.view', 'issues.view', 'follow_ups.view', 'clients.view', 'projects.view', 'dashboards.view.company')
  }
];
