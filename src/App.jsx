import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AppProvider }    from './context/AppContext.jsx';
import { AuthProvider }   from './context/AuthContext.jsx';
import ProtectedRoute     from './components/ProtectedRoute.jsx';

// Components
import AnnounceBar from './components/AnnounceBar.jsx';
import Navbar      from './components/Navbar.jsx';
import Footer      from './components/Footer.jsx';
import Toast       from './components/Toast.jsx';
import Modals      from './components/Modals.jsx';

// Pages
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
import DirectoryPage      from './pages/DirectoryPage.jsx';
import WebinarsPage       from './pages/WebinarsPage.jsx';
import JobsPage           from './pages/JobsPage.jsx';
import CourseViewerPage   from './pages/CourseViewerPage.jsx';
import CourseDetailPage   from './pages/CourseDetailPage.jsx';
import MemberProfilePage  from './pages/MemberProfilePage.jsx';
import DashboardPage      from './pages/DashboardPage.jsx';
import AdminPage          from './pages/AdminPage.jsx';
import PaymentPage        from './pages/PaymentPage.jsx';
import PaymentSuccessPage from './pages/PaymentSuccessPage.jsx';

function AppContent() {
  const location = useLocation();
  const isAdmin   = location.pathname === '/admin';
  const isViewer  = location.pathname.endsWith('/watch');

  return (
    <>
      {!isAdmin && !isViewer && <AnnounceBar />}
      {!isAdmin && !isViewer && <Navbar />}

      <Routes>
        {/* ── Public routes ── */}
        <Route path="/"                element={<HomePage />} />
        <Route path="/about"           element={<AboutPage />} />
        <Route path="/courses"         element={<CoursesPage />} />
        <Route path="/membership"      element={<MembershipPage />} />
        <Route path="/events"          element={<EventsPage />} />
        <Route path="/blog"            element={<BlogPage />} />
        <Route path="/blog/:slug"      element={<BlogArticlePage />} />
        <Route path="/team"            element={<TeamPage />} />
        <Route path="/contact"         element={<ContactPage />} />
        <Route path="/committees"      element={<CommitteesPage />} />
        <Route path="/webinars"        element={<WebinarsPage />} />
        <Route path="/jobs"            element={<JobsPage />} />

        {/* ── Member-only routes (must be logged in) ── */}
        <Route path="/directory" element={
          <ProtectedRoute requireAuth>
            <DirectoryPage />
          </ProtectedRoute>
        }/>
        <Route path="/dashboard" element={
          <ProtectedRoute requireAuth>
            <DashboardPage />
          </ProtectedRoute>
        }/>
        <Route path="/member/:slug" element={<MemberProfilePage />}/>
        <Route path="/courses/:slug"       element={<CourseDetailPage />}/>
        <Route path="/courses/:slug/watch" element={<CourseViewerPage />}/>
        <Route path="/payment" element={
          <ProtectedRoute requireAuth>
            <PaymentPage />
          </ProtectedRoute>
        }/>
        <Route path="/payment-success" element={
          <ProtectedRoute requireAuth>
            <PaymentSuccessPage />
          </ProtectedRoute>
        }/>

        {/* ── Admin-only route ── */}
        <Route path="/admin" element={
          <ProtectedRoute requireAuth requireAdmin>
            <AdminPage />
          </ProtectedRoute>
        }/>
      </Routes>

      {!isAdmin && !isViewer && <Footer />}
      <a href="https://wa.me/919999830938" className="wa-fab"
         target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">
        <i className="fa-brands fa-whatsapp"></i>
      </a>
      <Toast />
      <Modals />
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