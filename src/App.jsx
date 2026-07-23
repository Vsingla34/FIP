import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { memo }           from 'react';
import { AppProvider }    from './context/AppContext.jsx';
import { AuthProvider }   from './context/AuthContext.jsx';
import ProtectedRoute     from './components/ProtectedRoute.jsx';
import ScrollToTop        from './components/ScrollToTop.jsx';

/* ── Chrome components (always shown, memoized to avoid re-renders on navigation) ── */
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

/* ── Page components (imported eagerly — lazy loading optional later) ── */
import HomePage           from './pages/HomePage.jsx';
import AboutPage          from './pages/AboutPage.jsx';
import CoursesPage        from './pages/CoursesPage.jsx';
import MembershipPage     from './pages/MembershipPage.jsx';
import EventsPage         from './pages/EventsPage.jsx';
import BlogPage           from './pages/BlogPage.jsx';
import BlogArticlePage    from './pages/BlogArticlePage.jsx';
import TeamPage           from './pages/TeamPage.jsx';
import ContactPage        from './pages/ContactPage.jsx';
import CommitteesPage     from './pages/CommitteesPage.jsx';
import WebinarsPage       from './pages/WebinarsPage.jsx';
import JobsPage           from './pages/JobsPage.jsx';
import CourseDetailPage   from './pages/CourseDetailPage.jsx';
import CourseViewerPage   from './pages/CourseViewerPage.jsx';
import MemberProfilePage  from './pages/MemberProfilePage.jsx';
import DirectoryPage      from './pages/DirectoryPage.jsx';
import DashboardPage      from './pages/DashboardPage.jsx';
import AdminPage          from './pages/AdminPage.jsx';
import PaymentPage        from './pages/PaymentPage.jsx';
import PaymentSuccessPage from './pages/PaymentSuccessPage.jsx';

function AppContent() {
  const location = useLocation();
  const isAdmin  = location.pathname === '/admin';

  return (
    <>
      <ScrollToTop />
      {!isAdmin && <MemoAnnounceBar />}
      {!isAdmin && <MemoNavbar />}
      <MemoPromoPopup />

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

      {!isAdmin && <MemoFooter />}

      {/* WhatsApp FAB */}
      <a href="https://wa.me/919999830938" className="wa-fab"
         target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">
        <i className="fa-brands fa-whatsapp"></i>
      </a>

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