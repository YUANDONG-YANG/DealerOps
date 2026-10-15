import { useEffect, useState } from 'react';
import {
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { http } from './api/http';
import { accessToken, clearAccount } from './auth/login';
import {
  hasBusinessAccess,
  useSessionStore,
  type MeResponse,
} from './store/session';

import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AdminPage from './pages/AdminPage';
import DmsPage from './pages/DmsPage';
import CrmPage from './pages/CrmPage';
import LeadsPage from './pages/LeadsPage';
import AdsPage from './pages/AdsPage';
import NoAccessPage from './pages/NoAccessPage';

function AuthGuard() {
  const location = useLocation();
  const navigate = useNavigate();
  const setProfile = useSessionStore((s) => s.setProfile);
  const session = useSessionStore();
  const [status, setStatus] = useState<'loading' | 'ok' | 'redirect'>('loading');

  useEffect(() => {
    const token = accessToken();
    if (!token) {
      setStatus('redirect');
      navigate(
        `/login?notice=required&redirect=${encodeURIComponent(location.pathname)}`,
        { replace: true },
      );
      return;
    }

    let cancelled = false;
    http
      .get<MeResponse>('/api/v1/me')
      .then((res) => {
        if (cancelled) return;
        setProfile(res.data);
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
  }, [location.pathname, navigate, setProfile]);

  if (status === 'loading') {
    return <div className="state">Loading…</div>;
  }
  if (status === 'redirect') return null;

  if (!hasBusinessAccess(session)) {
    return <NoAccessPage />;
  }

  return <Outlet />;
}

function AdminGuard() {
  const role = useSessionStore((s) => s.role);
  if (role !== 'Platform.Admin') return <Navigate to="/" replace />;
  return <Outlet />;
}

function DealerGuard() {
  const role = useSessionStore((s) => s.role);
  const dealerId = useSessionStore((s) => s.dealerId);
  if (role !== 'Dealer.User' || dealerId == null) return <Navigate to="/" replace />;
  return <Outlet />;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route element={<AuthGuard />}>
        <Route element={<AdminGuard />}>
          <Route path="/admin" element={<AdminPage />} />
        </Route>
        <Route element={<DealerGuard />}>
          <Route path="/dms" element={<DmsPage />} />
          <Route path="/crm" element={<CrmPage />} />
          <Route path="/leads" element={<LeadsPage />} />
          <Route path="/ads" element={<AdsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
