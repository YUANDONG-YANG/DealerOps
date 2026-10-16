import { useEffect, useRef, useState } from 'react';
import {
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { getMe, type Profile } from './api/me';
import { accessToken, clearAccount, roleHome } from './auth/login';
import { hasBusinessAccess, useSessionStore } from './store/session';

import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AdminPage from './pages/AdminPage';
import DmsPage from './pages/DmsPage';
import CrmPage from './pages/CrmPage';
import LeadsPage from './pages/LeadsPage';
import AdsPage from './pages/AdsPage';
import TeamPage from './pages/TeamPage';
import ProfilePage from './pages/ProfilePage';
import NoAccessPage from './pages/NoAccessPage';

/** The profile is loaded once per signed-in session, not on every navigation. */
let profileRequest: { token: string; profile: Promise<Profile> } | null = null;

function loadProfile(token: string): Promise<Profile> {
  if (profileRequest?.token !== token) {
    profileRequest = {
      token,
      profile: getMe().catch((err) => {
        profileRequest = null;
        throw err;
      }),
    };
  }
  return profileRequest.profile;
}

function AuthGuard() {
  const location = useLocation();
  const navigate = useNavigate();
  const setProfile = useSessionStore((s) => s.setProfile);
  const session = useSessionStore();
  const [status, setStatus] = useState<'loading' | 'ok' | 'redirect'>('loading');

  // Keep the page the user asked for, including its query string and hash (UI-04).
  const requested = `${location.pathname}${location.search}${location.hash}`;
  const requestedRef = useRef(requested);
  requestedRef.current = requested;

  useEffect(() => {
    const token = accessToken();
    if (!token) {
      setStatus('redirect');
      navigate(
        `/login?notice=required&redirect=${encodeURIComponent(requestedRef.current)}`,
        { replace: true },
      );
      return;
    }

    let cancelled = false;
    loadProfile(token)
      .then((profile) => {
        if (cancelled) return;
        setProfile(profile);
        setStatus('ok');
      })
      .catch((err) => {
        if (cancelled) return;
        const status = err?.response?.status;
        if (status === 401) {
          clearAccount();
          navigate('/login?notice=required', { replace: true });
        } else {
          navigate('/login?notice=profile', { replace: true });
        }
        setStatus('redirect');
      });

    return () => {
      cancelled = true;
    };
  }, [navigate, setProfile]);

  if (status === 'loading') {
    return <div className="state">Loading…</div>;
  }
  if (status === 'redirect') return null;

  // Profile is about the signed-in account, so an unbound user can still edit or delete it.
  if (!hasBusinessAccess(session) && location.pathname !== '/profile') {
    return <NoAccessPage />;
  }

  return <Outlet />;
}

// A wrong-role user is sent to their own home page, not to the anonymous landing page (UI-02).
function AdminGuard() {
  const role = useSessionStore((s) => s.role);
  if (role !== 'Platform.Admin') return <Navigate to={roleHome(role)} replace />;
  return <Outlet />;
}

function DealerGuard() {
  const role = useSessionStore((s) => s.role);
  const dealerId = useSessionStore((s) => s.dealerId);
  if (role !== 'Dealer.User' || dealerId == null) {
    return <Navigate to={roleHome(role)} replace />;
  }
  return <Outlet />;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route element={<AuthGuard />}>
        {/* Profile is accessible to both roles; it's about the signed-in user, not tenant data. */}
        <Route path="/profile" element={<ProfilePage />} />
        <Route element={<AdminGuard />}>
          <Route path="/admin" element={<AdminPage />} />
        </Route>
        <Route element={<DealerGuard />}>
          <Route path="/dms" element={<DmsPage />} />
          <Route path="/crm" element={<CrmPage />} />
          <Route path="/leads" element={<LeadsPage />} />
          <Route path="/ads" element={<AdsPage />} />
          <Route path="/team" element={<TeamPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
