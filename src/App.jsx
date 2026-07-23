import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { memo, lazy, Suspense } from 'react';
import { AppProvider }    from './context/AppContext.jsx';
import { AuthProvider }   from './context/AuthContext.jsx';
import ProtectedRoute     from './components/ProtectedRoute.jsx';

// ── Always-present chrome (memo prevents re-render on every navigation)
import AnnounceBar from './components/AnnounceBar.jsx';
import Navbar      from './components/Navbar.jsx';
import Footer      from './components/Footer.jsx';
import Toast       from './components/Toast.jsx';
import Modals      from './components/Modals.jsx';
import PromoPopup  from './components/PromoPopup.jsx';

const MemoAnnounceBar = memo(AnnounceBar);
const MemoNavbar      = memo(Navbar);
const MemoFooter      = memo(Footer);
const MemoToast       = memo(Toast);
const MemoModals      = memo(Modals);
const MemoPromoPopup  = memo(PromoPopup);

// ── Lazy-loaded pages — only download JS when first visited
const HomePage           = lazy(() => import('./pages/HomePage.jsx'));
const AboutPage          = lazy(() => import('./pages/AboutPage.jsx'));
const CoursesPage        = lazy(() => import('./pages/CoursesPage.jsx'));
const MembershipPage     = lazy(() => import('./pages/MembershipPage.jsx'));
const EventsPage         = lazy(() => import('./pages/EventsPage.jsx'));
const BlogPage           = lazy(() => import('./pages/BlogPage.jsx'));
const BlogArticlePage    = lazy(() => import('./pages/BlogArticlePage.jsx'));
const TeamPage           = lazy(() => import('./pages/TeamPage.jsx'));
const ContactPage        = lazy(() => import('./pages/ContactPage.jsx'));
const CommitteesPage     = lazy(() => import('./pages/CommitteesPage.jsx'));
const DirectoryPage      = lazy(() => import('./pages/DirectoryPage.jsx'));
const WebinarsPage       = lazy(() => import('./pages/WebinarsPage.jsx'));
const JobsPage           = lazy(() => import('./pages/JobsPage.jsx'));
const CourseDetailPage   = lazy(() => import('./pages/CourseDetailPage.jsx'));
const MemberProfilePage  = lazy(() => import('./pages/MemberProfilePage.jsx'));
const DashboardPage      = lazy(() => import('./pages/DashboardPage.jsx'));
const AdminPage          = lazy(() => import('./pages/AdminPage.jsx'));
const PaymentPage        = lazy(() => import('./pages/PaymentPage.jsx'));
const PaymentSuccessPage = lazy(() => import('./pages/PaymentSuccessPage.jsx'));
const CourseViewerPage   = lazy(() => import('./pages/CourseViewerPage.jsx'));

// ── Minimal page-loading spinner shown while lazy chunk downloads
function PageLoader() {
  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '28px', color: 'var(--blue)' }}></i>
    </div>
  );
}

function AppContent() {
  const location = useLocation();
  const isAdmin  = location.pathname === '/admin';

  return (
    <>
      {/* Memoized — these do NOT re-render on every navigation */}
      {!isAdmin && <MemoAnnounceBar />}
      {!isAdmin && <MemoNavbar />}
      <MemoPromoPopup />

      {/* Pages are lazy — only the current page re-renders on navigation */}
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* ── Public ── */}
          <Route path="/"             element={<HomePage />} />
          <Route path="/about"        element={<AboutPage />} />
          <Route path="/courses"      element={<CoursesPage />} />
          <Route path="/courses/:slug" element={<CourseDetailPage />} />
          <Route path="/membership"   element={<MembershipPage />} />
          <Route path="/events"       element={<EventsPage />} />
          <Route path="/blog"         element={<BlogPage />} />
          <Route path="/blog/:slug"   element={<BlogArticlePage />} />
          <Route path="/team"         element={<TeamPage />} />
          <Route path="/contact"      element={<ContactPage />} />
          <Route path="/committees"   element={<CommitteesPage />} />
          <Route path="/webinars"     element={<WebinarsPage />} />
          <Route path="/jobs"         element={<JobsPage />} />
          <Route path="/member/:slug" element={<MemberProfilePage />} />

          {/* ── Auth-protected ── */}
          <Route path="/directory" element={
            <ProtectedRoute requireAuth><DirectoryPage /></ProtectedRoute>
          }/>
          <Route path="/dashboard" element={
            <ProtectedRoute requireAuth><DashboardPage /></ProtectedRoute>
          }/>
          <Route path="/payment" element={
            <ProtectedRoute requireAuth><PaymentPage /></ProtectedRoute>
          }/>
          <Route path="/payment-success" element={
            <ProtectedRoute requireAuth><PaymentSuccessPage /></ProtectedRoute>
          }/>
          <Route path="/courses/:slug/watch" element={
            <ProtectedRoute requireAuth><CourseViewerPage /></ProtectedRoute>
          }/>

          {/* ── Admin ── */}
          <Route path="/admin" element={
            <ProtectedRoute requireAuth requireAdmin><AdminPage /></ProtectedRoute>
          }/>
        </Routes>
      </Suspense>

      {!isAdmin && <MemoFooter />}

      {/* WhatsApp FAB */}
      <a href="https://wa.me/919999830938" className="wa-fab"
         target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">
        <i className="fa-brands fa-whatsapp"></i>
      </a>

      {/* Memoized global overlays */}
      <MemoToast />
      <MemoModals />
    </>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <AppProvider>
          <AppContent />
        </AppProvider>
      </AuthProvider>
    </Router>
  );
}