import React, { useMemo, useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { orderBy, where, limit, doc, updateDoc, writeBatch } from 'firebase/firestore';
import {
  LayoutDashboard, FileText, PlusCircle, CheckSquare, Clock, Users, Briefcase, UserCog, ShieldCheck,
  ScrollText, Settings, BarChart3, Menu, Bell, Sun, Moon, Monitor, LogOut, Languages, Palette, X, ListTodo, Trash2, Send
} from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/contexts/ThemeContext';
import { useCollection } from '@/hooks/useCollection';
import { GlobalSearch } from '@/components/search/GlobalSearch';
import { checkAndNotifyDeadlines } from '@/services/deadlineAlerts';
import { NotificationPanel } from '@/components/notifications/NotificationPanel';
import { BroadcastMessage } from '@/components/notifications/BroadcastMessage';
import { BroadcastPopup } from '@/components/notifications/BroadcastPopup';
import { deleteNotification } from '@/services/notifications';
import type { AppNotification } from '@/types';
import { db } from '@/config/firebase';
import { fmtDateTime, initials } from '@/utils/format';

interface NavItem { to: string; label: string; icon: React.ElementType; perms?: string[] }
interface NavGroup { label: string; items: NavItem[] }

export default function AppLayout() {
  const { user, can, canAny, logout } = useAuth();
  const { t, lang, setLang } = useI18n();
  const { mode, setMode, themes, themeId, setThemeId, settings } = useTheme();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifPanelOpen, setNotifPanelOpen] = useState(false);
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);

  const { data: notifs } = useCollection<AppNotification>(user ? 'notifications' : null, [where('userId', '==', user?.uid || '-'), orderBy('createdAt', 'desc'), limit(30)], [user?.uid]);
  // hide notifications the user soft-deleted
  const visibleNotifs = notifs.filter(n => !n.deletedBy?.[user?.uid || '']);
  const unread = visibleNotifs.filter(n => !n.read).length;

  // time category → color (today: blue, week: yellow, older: gray, urgent: red)
  const notifCat = (n: AppNotification): 'urgent' | 'today' | 'week' | 'older' => {
    if (n.level === 'danger' || n.level === 'warning') return 'urgent';
    const d = (n.createdAt as any)?.toDate?.();
    if (!d) return 'today';
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (d >= todayStart) return 'today';
    if (d >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)) return 'week';
    return 'older';
  };
  const catClass: Record<string, string> = {
    urgent: 'border-s-4 border-s-red-500 bg-red-500/10',
    today: 'border-s-4 border-s-blue-500 bg-blue-500/10',
    week: 'border-s-4 border-s-yellow-500 bg-yellow-500/10',
    older: 'border-s-4 border-s-gray-400 bg-gray-400/10'
  };

  const removeNotif = async (n: AppNotification) => {
    if (!user) return;
    try { await deleteNotification(n.id, user.uid); } catch (e) { console.error('Delete notification failed:', e); }
  };

  // Check for deadline alerts when user logs in or settings change
  useEffect(() => {
    if (!user) return;
    // Check once on mount and every 30 minutes
    const timer = setInterval(() => {
      checkAndNotifyDeadlines(user, settings).catch(e => console.error('Deadline check error:', e));
    }, 30 * 60 * 1000);
    checkAndNotifyDeadlines(user, settings).catch(e => console.error('Deadline check error:', e));
    return () => clearInterval(timer);
  }, [user?.uid, settings]);

  const groups: NavGroup[] = useMemo(() => [
    { label: t('nav.work'), items: [
      { to: '/', label: t('nav.dashboard'), icon: LayoutDashboard },
      { to: '/inquiries', label: t('nav.inquiries'), icon: FileText, perms: ['inquiries.view.own', 'inquiries.view.all'] },
      { to: '/inquiries/new', label: t('nav.newInquiry'), icon: PlusCircle, perms: ['inquiries.create'] },
      { to: '/tasks', label: t('nav.tasks'), icon: ListTodo, perms: ['tasks.view.own', 'tasks.view.all'] },
      { to: '/approvals', label: t('nav.approvals'), icon: CheckSquare, perms: ['quotations.approve', 'quotations.reject'] },
      { to: '/extensions', label: t('nav.extensions'), icon: Clock, perms: ['extensions.request', 'extensions.approve'] },
      { to: '/reports', label: t('nav.reports'), icon: BarChart3, perms: ['reports.view'] }
    ] },
    { label: t('nav.masterData'), items: [
      { to: '/clients', label: t('nav.clients'), icon: Briefcase, perms: ['clients.view'] },
      { to: '/projects', label: t('nav.projects'), icon: Briefcase, perms: ['projects.view'] },
      { to: '/team', label: t('nav.team'), icon: Users, perms: ['team.view', 'clients.view'] }
    ] },
    { label: t('nav.admin'), items: [
      { to: '/admin/users', label: t('nav.users'), icon: Users, perms: ['users.view'] },
      { to: '/admin/roles', label: t('nav.roles'), icon: ShieldCheck, perms: ['roles.view'] },
      { to: '/admin/activity-log', label: t('nav.activityLog'), icon: ScrollText, perms: ['activity_log.view'] },
      { to: '/admin/trash', label: t('nav.trash'), icon: Trash2, perms: ['activity_log.view', 'inquiries.delete'] },
      { to: '/admin/settings', label: t('nav.settings'), icon: Settings, perms: ['settings.view'] }
    ] }
  ], [t]);

  const visible = groups.map(g => ({ ...g, items: g.items.filter(i => !i.perms || canAny(...i.perms)) })).filter(g => g.items.length);

  const markAllRead = async () => {
    const b = writeBatch(db);
    visibleNotifs.filter(n => !n.read).forEach(n => b.update(doc(db, 'notifications', n.id), { read: true }));
    await b.commit();
  };
  const openNotif = async (n: AppNotification) => {
    if (!n.read) await updateDoc(doc(db, 'notifications', n.id), { read: true });
    setNotifOpen(false);
    if (n.link) nav(n.link);
  };

  // admin-configurable neon signature on the copyright line
  const fx = settings.copyrightFx;
  const fxOn = !!fx?.enabled;
  const fxCls = fxOn ? `fx-base fx-${fx?.style || 'sweep'}` : '';
  const fxVars = fxOn && fx?.color ? ({ '--fx-color': fx.color } as React.CSSProperties) : undefined;

  const modeIcon = mode === 'dark' ? Moon : mode === 'system' ? Monitor : Sun;
  const ModeIcon = modeIcon;
  const cycleMode = () => setMode(mode === 'light' ? 'dark' : mode === 'dark' ? 'system' : 'light');

  const Sidebar = (
    <aside className="flex flex-col h-full w-64 bg-primary text-white">
      <div className="px-4 py-4 border-b border-white/10">
        <div className="text-2xl font-bold tracking-wide">PIQCS</div>
        <div className="text-xs text-white/70 truncate">{lang === 'ar' ? settings.companyNameAr : settings.companyNameEn}</div>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {visible.map(g => (
          <div key={g.label}>
            <div className="px-3 text-[10px] uppercase tracking-wider text-white/50 mb-1">{g.label}</div>
            {g.items.map(i => (
              <NavLink key={i.to} to={i.to} end={i.to === '/' || i.to === '/inquiries'} onClick={() => setOpen(false)} className={({ isActive }) => clsx('nav-item', isActive && 'active')}>
                <i.icon size={17} /><span>{i.label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      <div className="px-4 py-3 border-t border-white/10 text-[11px] text-center leading-relaxed">
        <span className={fxOn ? fxCls : 'text-white/70'} style={fxVars}>{t('app.copyright')}</span>
      </div>
    </aside>
  );

  return (
    <div className="flex h-full">
      <div className="hidden lg:block h-full">{Sidebar}</div>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 start-0">{Sidebar}</div>
        </div>
      )}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        <header className="h-12 sm:h-14 flex items-center justify-between px-2 sm:px-4 bg-surface border-b border-border no-print gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button className="lg:hidden btn-ghost p-2" onClick={() => setOpen(true)}><Menu size={18} /></button>
            <div className="text-xs sm:text-sm text-muted hidden sm:block truncate">{t('app.fullName')}</div>
          </div>
          <div className="hidden sm:block flex-1 max-w-xs">
            <GlobalSearch />
          </div>
          <div className="flex items-center gap-0.5 sm:gap-1">
            <button className="btn-ghost p-1.5 sm:p-2" title={t('common.language')} onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}><Languages size={16} /><span className="text-[10px] sm:text-xs hidden sm:inline">{lang === 'ar' ? 'EN' : 'ع'}</span></button>
            <button className="btn-ghost p-1.5 sm:p-2" title={t('common.darkMode')} onClick={cycleMode}><ModeIcon size={16} /></button>
            {settings.allowUserTheme && (
              <div className="relative">
                <button className="btn-ghost p-1.5 sm:p-2" title={t('common.theme')} onClick={() => setThemeOpen(o => !o)}><Palette size={16} /></button>
                {themeOpen && (
                  <div className="absolute end-0 mt-1 card p-2 w-40 sm:w-48 z-50">
                    {themes.map(th => (
                      <button key={th.id} onClick={() => { setThemeId(th.id); setThemeOpen(false); }} className={clsx('w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs sm:text-sm hover:bg-bg', themeId === th.id && 'bg-bg font-semibold')}>
                        <span className="h-3 w-3 sm:h-4 sm:w-4 rounded-full" style={{ background: th.colors.primary }} /><span className="truncate">{lang === 'ar' ? th.nameAr : th.nameEn}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {/* Broadcast Message Button - Admin Only */}
            {can('admin.broadcast_message') && (
              <button
                className="btn-ghost p-1.5 sm:p-2"
                title={lang === 'ar' ? 'إرسال رسالة جماعية' : 'Send Broadcast'}
                onClick={() => setBroadcastOpen(true)}
              >
                <Send size={16} />
              </button>
            )}

            <div className="relative">
              <button className="btn-ghost p-1.5 sm:p-2 relative" onClick={() => setNotifOpen(o => !o)}>
                <Bell size={16} />
                {unread > 0 && <span className="absolute -top-0.5 -end-0.5 bg-danger text-white text-[9px] rounded-full h-4 min-w-4 px-0.5 flex items-center justify-center">{unread}</span>}
              </button>
              {notifOpen && (
                <div className="absolute end-0 mt-1 card w-64 sm:w-80 z-50 max-h-96 overflow-y-auto">
                  <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                    <span className="font-semibold text-xs sm:text-sm">{t('notif.title')}</span>
                    <div className="flex gap-1">
                      {unread > 0 && <button className="text-[10px] sm:text-xs text-primary" onClick={markAllRead}>{t('notif.markAll')}</button>}
                      <button onClick={() => { setNotifOpen(false); setNotifPanelOpen(false); }}><X size={14} /></button>
                    </div>
                  </div>
                  {visibleNotifs.length === 0 && <div className="p-3 sm:p-4 text-xs sm:text-sm text-muted text-center">{t('notif.empty')}</div>}
                  {visibleNotifs.map(n => (
                    <div key={n.id} onClick={() => openNotif(n)} className={clsx('w-full flex items-start gap-1 text-start px-3 py-2 border-b border-border hover:bg-bg cursor-pointer', catClass[notifCat(n)], !n.read && 'font-semibold')}>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs sm:text-sm font-medium line-clamp-1">{lang === 'ar' ? n.titleAr : n.titleEn}</div>
                        <div className="text-[10px] sm:text-xs text-muted line-clamp-1">{lang === 'ar' ? n.bodyAr : n.bodyEn}</div>
                        <div className="text-[9px] sm:text-[10px] text-muted">{fmtDateTime(n.createdAt, lang)}</div>
                      </div>
                      <button
                        className="p-1 mt-0.5 text-danger hover:bg-danger/10 rounded shrink-0"
                        title={lang === 'ar' ? 'حذف' : 'Delete'}
                        onClick={e => { e.stopPropagation(); removeNotif(n); }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                  {visibleNotifs.length > 0 && <button className="w-full text-center text-primary text-[10px] sm:text-xs py-2 border-t border-border hover:bg-bg" onClick={() => { setNotifOpen(false); setNotifPanelOpen(true); }}>{lang === 'ar' ? 'عرض الكل' : 'View All'}</button>}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1 sm:gap-2 ps-1 sm:ps-2 ms-0.5 sm:ms-1 border-s border-border">
              <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-primary text-white flex items-center justify-center text-[10px] sm:text-xs font-bold">{initials(lang === 'ar' ? user?.nameAr : user?.nameEn)}</div>
              <div className="hidden md:block leading-tight min-w-0">
                <div className="text-xs sm:text-sm font-medium truncate">{lang === 'ar' ? user?.nameAr : user?.nameEn}</div>
                <div className="text-[10px] text-muted truncate">{user?.email}</div>
              </div>
              <button className="btn-ghost p-1.5 sm:p-2" title={t('common.logout')} onClick={logout}><LogOut size={16} /></button>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
        <footer className="px-4 py-2 text-center text-[11px] text-muted border-t border-border bg-surface">
          <span className={fxOn ? fxCls : undefined} style={fxVars}>{t('app.copyright')}</span> — {t('app.name')} v1.0
        </footer>
      </div>

      {/* Notification Panel - Categorized display */}
      <NotificationPanel
        isOpen={notifPanelOpen}
        onClose={() => setNotifPanelOpen(false)}
      />

      {/* Broadcast messages waiting for acknowledgment pop up on login */}
      <BroadcastPopup />

      {/* Broadcast Message - Admin only */}
      <BroadcastMessage
        isOpen={broadcastOpen}
        onClose={() => setBroadcastOpen(false)}
        onSuccess={() => {
          // Refresh notifications after broadcast sent
          setNotifOpen(false);
        }}
      />
    </div>
  );
}
