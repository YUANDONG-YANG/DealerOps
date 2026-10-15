import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import AppRoutes from './router';
import AssistantWidget from './components/AssistantWidget';
import { getReleaseTimes, type ReleaseTimes } from './api/release';
import { hasBusinessAccess, useSessionStore } from './store/session';

const webBuiltAt =
  (import.meta.env.VITE_PUBLISHED_AT || '').trim() || __WEB_BUILT_AT__;

const PENDING: ReleaseTimes = { web: '…', gateway: '…', core: '…', ai: '…' };

export default function App() {
  const location = useLocation();
  const session = useSessionStore();
  const [backend, setBackend] = useState<ReleaseTimes>(PENDING);
  const fetched = useRef(false);

  const isPublicRoute = ['/', '/login', '/register'].includes(location.pathname);
  const showAssistant =
    session.role === 'Dealer.User' &&
    hasBusinessAccess(session) &&
    !isPublicRoute;

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;
    getReleaseTimes()
      .then(setBackend)
      .catch(() =>
        setBackend({
          web: webBuiltAt,
          gateway: 'unavailable',
          core: 'unavailable',
          ai: 'unavailable',
        }),
      );
  }, []);

  return (
    <>
      <AppRoutes />
      {showAssistant && <AssistantWidget />}
      <footer className="app-footer">
        <div className="app-footer-title">Published (UTC)</div>
        <div>web {webBuiltAt}</div>
        <div>gateway {backend.gateway}</div>
        <div>core {backend.core}</div>
        <div>ai {backend.ai}</div>
      </footer>
    </>
  );
}
