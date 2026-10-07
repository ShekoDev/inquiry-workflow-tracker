import { useMemo } from 'react';
import { orderBy } from 'firebase/firestore';
import { useCollection } from './useCollection';
import type { AppUser, Client, CountryCode, Project, Role, TeamMember } from '@/types';

export interface PersonOption {
  id: string;
  name: string;
  country?: CountryCode;
  /** true when this person also has a login account (so notifications reach them) */
  isUser: boolean;
}

/** Users, roles, clients, projects, team roster — cached live lists used by many screens. */
export function useLookups() {
  const { data: users } = useCollection<AppUser & { id: string }>('users', [orderBy('nameAr')]);
  const { data: roles } = useCollection<Role>('roles');
  const { data: clients } = useCollection<Client>('clients', [orderBy('nameAr')]);
  const { data: projects } = useCollection<Project>('projects', [orderBy('nameAr')]);
  const { data: team } = useCollection<TeamMember>('team_members', [orderBy('name')]);

  const activeUsers = useMemo(() => users.map(u => ({ ...u, uid: u.uid || u.id })).filter(u => u.status === 'active'), [users]);
  const activeTeam = useMemo(() => team.filter(m => m.isActive !== false), [team]);
  const byRole = (roleId: string) => activeUsers.filter(u => u.roleId === roleId);

  const engineers = useMemo(() => activeUsers.filter(u => (u.effectivePermissions || []).includes('costing.create') || u.roleId === 'estimation_engineer'), [activeUsers]);
  const salespeople = useMemo(() => activeUsers.filter(u => u.roleId === 'salesperson' || (u.effectivePermissions || []).includes('quotations.send_to_client')), [activeUsers]);

  /**
   * The pickable people for a role: everyone with a matching login account PLUS the roster
   * members who have none. `country` narrows the list to one market when supplied.
   */
  const peopleFor = (kind: 'engineer' | 'salesperson', country?: string): PersonOption[] => {
    const fromUsers = (kind === 'engineer' ? engineers : salespeople)
      .map(u => ({ id: u.uid, name: u.nameEn || u.nameAr || u.email, isUser: true as const, country: undefined as CountryCode | undefined }));
    const fromTeam = activeTeam
      .filter(m => m.type === kind || m.type === 'both')
      .filter(m => !country || !m.country || m.country === country)
      .map(m => ({ id: m.id, name: m.name, country: m.country, isUser: false as const }));
    const seen = new Set<string>();
    return [...fromUsers, ...fromTeam].filter(p => (seen.has(p.id) ? false : (seen.add(p.id), true)));
  };

  /** resolve a stored id to a display name, whether it points at a user or a roster member */
  const personName = (id?: string, lang: 'ar' | 'en' = 'en') => {
    if (!id) return '';
    const u = users.find(x => (x.uid || x.id) === id);
    if (u) return (lang === 'ar' ? u.nameAr : u.nameEn) || u.nameEn || u.nameAr || u.email;
    return team.find(m => m.id === id)?.name || '';
  };

  const isRealUser = (id?: string) => !!id && users.some(x => (x.uid || x.id) === id);

  const userName = (uid?: string, lang: 'ar' | 'en' = 'ar') => { const u = users.find(x => (x.uid || x.id) === uid); return u ? (lang === 'ar' ? u.nameAr : u.nameEn) || u.email : ''; };

  return {
    users: users.map(u => ({ ...u, uid: u.uid || u.id })), activeUsers, roles, clients, projects,
    team, activeTeam, byRole, engineers, salespeople, peopleFor, personName, isRealUser, userName
  };
}
