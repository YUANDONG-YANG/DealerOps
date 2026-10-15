import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSessionStore } from '../store/session';
import { signOut } from '../auth/login';
import { getReleaseTimes, type ReleaseTimes } from '../api/release';

const icons: Record<string, string> = {
  admin: 'M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6l8-3zM9 12l2 2 4-4',
  dms: 'M3 16h18M5 16l1.8-5.5h10.4L19 16M7.5 10.5L9 7h6l1.5 3.5M7 19a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM17 19a1.5 1.5 0 100-3 1.5 1.5 0 000 3z',
  crm: 'M16 19v-1a4 4 0 00-4-4H7a4 4 0 00-4 4v1M9.5 10a3 3 0 100-6 3 3 0 000 6zM21 19v-1a4 4 0 00-3-3.9M16 4.1a3 3 0 010 5.8',
  ads: 'M4 5h16v11H8l-4 4V5zM9 10.5l2 2 4-4',
  leads: 'M3 5h18l-7 8v6l-4-2v-4L3 5z',
};

export default function AppLayout({ children }: { children: ReactNode }) {
  const session = useSessionStore();
  const location = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);
  const isAdmin = session.role === 'Platform.Admin';
  const name = session.displayName || session.username || 'User';
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
  const [release, setRelease] = useState<ReleaseTimes | null>(null);

  useEffect(() => {
    getReleaseTimes().then(setRelease).catch(() => {});
  }, []);

  const items = !session.hasBusinessAccess ? [] : isAdmin
    ? [{ label: 'Admin', to: '/admin', icon: icons.admin }]
    : [
        { label: 'DMS', to: '/dms', icon: icons.dms },
        { label: 'CRM', to: '/crm', icon: icons.crm },
        { label: 'Leads', to: '/leads', icon: icons.leads },
        { label: 'Ad compliance', to: '/ads', icon: icons.ads },
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
            {isAdmin ? 'Platform Admin' : `${session.dealerLegalName || 'Dealership'} · ${session.role}`}
          </span>
          <div
            className="user-chip"
            onClick={() => setProfileOpen((open) => !open)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') setProfileOpen((open) => !open);
            }}
            role="button"
            tabIndex={0}
            aria-expanded={profileOpen}
            style={{ position: 'relative' }}
          >
            <div className="user-avatar">{initials}</div>
            <span>{name}</span>
            <span className="profile-chevron" aria-hidden="true">⌄</span>
            {profileOpen && (
              <div className="user-dropdown" onClick={(event) => event.stopPropagation()}>
                <div className="profile-card">
                  <div className="user-avatar user-avatar-lg">{initials}</div>
                  <div>
                    <strong>{name}</strong>
                    <div className="muted">@{session.username}</div>
                    <div className="muted">{isAdmin ? 'Platform Admin' : session.role}</div>
                    {!isAdmin && (
                      <>
                        <div className="muted">{session.dealerLegalName || 'No dealership'}</div>
                        {session.dealerContactEmail && <div className="muted">{session.dealerContactEmail}</div>}
                        {session.dealerContactPhone && <div className="muted">{session.dealerContactPhone}</div>}
                      </>
                    )}
                  </div>
                </div>
                <button className="dropdown-action" onClick={() => signOut()}>Sign out</button>
              </div>
            )}
          </div>
        </header>
        <main className="app-main">{children}</main>
        {release && (
          <footer className="app-release">
            <span>gateway {release.gateway}</span>
            <span>core {release.core}</span>
            <span>ai {release.ai}</span>
          </footer>
        )}
      </div>
    </div>
  );
}
