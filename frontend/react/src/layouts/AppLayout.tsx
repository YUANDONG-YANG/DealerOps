import { type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSessionStore } from '../store/session';
import JoinRequestInbox from '../components/JoinRequestInbox';
import { enumLabel, initials } from '../format';

const icons: Record<string, string> = {
  admin: 'M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6l8-3zM9 12l2 2 4-4',
  dms: 'M3 16h18M5 16l1.8-5.5h10.4L19 16M7.5 10.5L9 7h6l1.5 3.5M7 19a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM17 19a1.5 1.5 0 100-3 1.5 1.5 0 000 3z',
  crm: 'M16 19v-1a4 4 0 00-4-4H7a4 4 0 00-4 4v1M9.5 10a3 3 0 100-6 3 3 0 000 6zM21 19v-1a4 4 0 00-3-3.9M16 4.1a3 3 0 010 5.8',
  ads: 'M4 5h16v11H8l-4 4V5zM9 10.5l2 2 4-4',
  leads: 'M3 5h18l-7 8v6l-4-2v-4L3 5z',
  dashboard: 'M4 13h6V4H4v9zM14 20h6V11h-6v9zM4 20h6v-3H4v3zM14 4v3h6V4h-6z',
  team: 'M17 20h5v-2a4 4 0 00-3-3.9M9 20H3v-2a4 4 0 014-4h4a4 4 0 014 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM16 3.1a4 4 0 010 7.8',
};

/** Signed-in shell: the role-based side menu, the request inbox, and the profile link. */
export default function AppLayout({ children }: { children: ReactNode }) {
  const session = useSessionStore();
  const location = useLocation();
  const isAdmin = session.role === 'Platform.Admin';
  // Team and the join-request inbox belong to the dealership's managers (AUTH-27).
  const isManager = session.dealerRole === 'MANAGER';
  const name = session.displayName || session.username || 'User';

  const items = !session.hasBusinessAccess ? [] : isAdmin
    ? [{ label: 'Admin', to: '/admin', icon: icons.admin }]
    : [
        { label: 'Dashboard', to: '/dashboard', icon: icons.dashboard },
        { label: 'DMS', to: '/dms', icon: icons.dms },
        { label: 'CRM', to: '/crm', icon: icons.crm },
        { label: 'Leads', to: '/leads', icon: icons.leads },
        { label: 'Sales report', to: '/reports/sales-funnel', icon: icons.leads },
        { label: 'Ad compliance', to: '/ads', icon: icons.ads },
        ...(isManager ? [{ label: 'Team', to: '/team', icon: icons.team }] : []),
      ];

  return (
    <div className="app-shell">
      <aside className="app-aside">
        <div className="brand">
          <div className="brand-mark">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 17h14M6 17l1.5-5h9L18 17M8 12l1.2-3.5h5.6L16 12" />
              <circle cx="8" cy="17" r="1.6" /><circle cx="16" cy="17" r="1.6" />
            </svg>
          </div>
          Dealer Ops
        </div>
        <nav className="side-menu">
          {items.map((item) => (
            <Link key={item.to} to={item.to}
              className={`side-menu-item ${location.pathname === item.to ? 'active' : ''}`}>
              <svg className="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d={item.icon} />
              </svg>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </aside>
      <div className="app-main-wrap">
        <header className="app-header">
          <span className="dealer-chip">
            {!isAdmin && session.dealerLogoDataUrl && <img src={session.dealerLogoDataUrl} alt="" className="dealer-logo" />}
            {isAdmin ? 'Platform Admin' : (
              <>
                {session.dealerLegalName || 'Dealership'}
                <span className="header-role">{session.dealerRole ? enumLabel(session.dealerRole) : session.role}</span>
              </>
            )}
          </span>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
            {session.hasBusinessAccess && <JoinRequestInbox isManager={isManager} />}
          </div>
          {/* Clicking the name/avatar goes to /profile, where the user can view their sign-in
              method, edit their details, and sign out or delete the account. */}
          <Link
            to="/profile"
            className={`user-chip ${location.pathname === '/profile' ? 'active' : ''}`}
            aria-label="Open profile"
          >
            {session.avatarUrl ? (
              <img src={session.avatarUrl} alt="" referrerPolicy="no-referrer"
                className="user-avatar" style={{ objectFit: 'cover' }} />
            ) : (
              <div className="user-avatar">{initials(name)}</div>
            )}
            <span>{name}</span>
          </Link>
        </header>
        <main className="app-main">{children}</main>
      </div>
    </div>
  );
}
