import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import { ProtectedRoute, RequirePerm } from '@/components/guards';
import Login from '@/pages/auth/Login';
import ChangePassword from '@/pages/auth/ChangePassword';
import Setup from '@/pages/auth/Setup';
import Dashboard from '@/pages/Dashboard';
import InquiriesList from '@/pages/inquiries/InquiriesList';
import InquiryForm from '@/pages/inquiries/InquiryForm';
import InquiryDetail from '@/pages/inquiries/InquiryDetail';
import Approvals from '@/pages/Approvals';
import Extensions from '@/pages/Extensions';
import Clients from '@/pages/masterdata/Clients';
import Projects from '@/pages/masterdata/Projects';
import Team from '@/pages/masterdata/Team';
import Tasks from '@/pages/Tasks';
import Trash from '@/pages/admin/Trash';
import Users from '@/pages/admin/Users';
import UserPermissions from '@/pages/admin/UserPermissions';
import Roles from '@/pages/admin/Roles';
import ActivityLog from '@/pages/admin/ActivityLog';
import Settings from '@/pages/admin/Settings';
import Reports from '@/pages/reports/Reports';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/setup" element={<Setup />} />
      <Route path="/change-password" element={<ProtectedRoute><ChangePassword /></ProtectedRoute>} />
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/inquiries" element={<RequirePerm perms={['inquiries.view.own', 'inquiries.view.all']}><InquiriesList /></RequirePerm>} />
        <Route path="/inquiries/new" element={<RequirePerm perms={['inquiries.create']}><InquiryForm /></RequirePerm>} />
        <Route path="/inquiries/:id/edit" element={<RequirePerm perms={['inquiries.edit']}><InquiryForm /></RequirePerm>} />
        <Route path="/inquiries/:id" element={<RequirePerm perms={['inquiries.view.own', 'inquiries.view.all']}><InquiryDetail /></RequirePerm>} />
        <Route path="/tasks" element={<RequirePerm perms={['tasks.view.own', 'tasks.view.all']}><Tasks /></RequirePerm>} />
        <Route path="/approvals" element={<RequirePerm perms={['quotations.approve', 'quotations.reject']}><Approvals /></RequirePerm>} />
        <Route path="/extensions" element={<RequirePerm perms={['extensions.request', 'extensions.approve', 'extensions.reject']}><Extensions /></RequirePerm>} />
        <Route path="/clients" element={<RequirePerm perms={['clients.view']}><Clients /></RequirePerm>} />
        <Route path="/projects" element={<RequirePerm perms={['projects.view']}><Projects /></RequirePerm>} />
        <Route path="/team" element={<RequirePerm perms={['team.view', 'clients.view']}><Team /></RequirePerm>} />
        <Route path="/reports" element={<RequirePerm perms={['reports.view']}><Reports /></RequirePerm>} />
        <Route path="/admin/users" element={<RequirePerm perms={['users.view']}><Users /></RequirePerm>} />
        <Route path="/admin/users/:uid/permissions" element={<RequirePerm perms={['users.edit', 'roles.manage_permissions']}><UserPermissions /></RequirePerm>} />
        <Route path="/admin/roles" element={<RequirePerm perms={['roles.view']}><Roles /></RequirePerm>} />
        <Route path="/admin/trash" element={<RequirePerm perms={['activity_log.view', 'inquiries.delete']}><Trash /></RequirePerm>} />
        <Route path="/admin/activity-log" element={<RequirePerm perms={['activity_log.view']}><ActivityLog /></RequirePerm>} />
        <Route path="/admin/settings" element={<RequirePerm perms={['settings.view']}><Settings /></RequirePerm>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
