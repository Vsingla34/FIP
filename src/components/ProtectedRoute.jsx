import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

/* ── Loading spinner ── */
function LoadingScreen() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '60vh', flexDirection: 'column', gap: '12px',
    }}>
      <i className="fa-solid fa-spinner fa-spin"
         style={{ fontSize: '28px', color: 'var(--orange)' }}></i>
      <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
        Verifying access…
      </span>
    </div>
  );
}

/* ── Access Denied page ── */
function AccessDenied() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '60vh', flexDirection: 'column', gap: '16px', textAlign: 'center',
      padding: '24px',
    }}>
      <div style={{
        width: '72px', height: '72px', borderRadius: '50%',
        background: '#FFF0EE', border: '3px solid #F5BDBA',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <i className="fa-solid fa-shield-halved"
           style={{ fontSize: '28px', color: '#C0392B' }}></i>
      </div>
      <h2 style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: '24px', fontWeight: 700, color: 'var(--blue)',
      }}>
        Access Denied
      </h2>
      <p style={{ fontSize: '14px', color: 'var(--text-muted)', maxWidth: '360px' }}>
        You don't have permission to view this page.
        This area is restricted to FIP administrators only.
      </p>
      <a href="/" className="btn btn-secondary btn-sm">
        <i className="fa-solid fa-house"></i> Back to Home
      </a>
    </div>
  );
}

/* ════════════════════════════════════════
   ProtectedRoute
   - requireAuth: redirect to / if not logged in
   - requireAdmin: show AccessDenied if not admin
   ════════════════════════════════════════ */
export default function ProtectedRoute({
  children,
  requireAuth  = true,
  requireAdmin = false,
}) {
  const { user, loading, isAdmin } = useAuth();

  /* still restoring session */
  if (loading) return <LoadingScreen />;

  /* not logged in */
  if (requireAuth && !user) return <Navigate to="/" replace />;

  /* logged in but not admin */
  if (requireAdmin && !isAdmin) return <AccessDenied />;

  return children;
}