import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AppProvider } from './context/AppContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx';

// Components
import AnnounceBar from './components/AnnounceBar.jsx';
import Navbar     from './components/Navbar.jsx';
import Footer     from './components/Footer.jsx';
import Toast      from './components/Toast.jsx';
import Modals     from './components/Modals.jsx';

// Pages
import HomePage          from './pages/HomePage.jsx';
import AboutPage         from './pages/AboutPage.jsx';
import CoursesPage       from './pages/CoursesPage.jsx';
import MembershipPage    from './pages/MembershipPage.jsx';
import EventsPage        from './pages/EventsPage.jsx';
import BlogPage          from './pages/BlogPage.jsx';
import BlogArticlePage   from './pages/BlogArticlePage.jsx';
import TeamPage          from './pages/TeamPage.jsx';
import ContactPage       from './pages/ContactPage.jsx';
import CommitteesPage    from './pages/CommitteesPage.jsx';
import DirectoryPage     from './pages/DirectoryPage.jsx';
import WebinarsPage      from './pages/WebinarsPage.jsx';
import DashboardPage     from './pages/DashboardPage.jsx';
import AdminPage         from './pages/AdminPage.jsx';
import PaymentPage       from './pages/PaymentPage.jsx';
import PaymentSuccessPage from './pages/PaymentSuccessPage.jsx';

function AppContent() {
  const location = useLocation();
  const isAdmin  = location.pathname === '/admin';

  return (
    <>
      {!isAdmin && <AnnounceBar />}
      {!isAdmin && <Navbar />}
      <Routes>
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
        <Route path="/directory"       element={<DirectoryPage />} />
        <Route path="/webinars"        element={<WebinarsPage />} />
        <Route path="/dashboard"       element={<DashboardPage />} />
        <Route path="/admin"           element={<AdminPage />} />
        <Route path="/payment"         element={<PaymentPage />} />
        <Route path="/payment-success" element={<PaymentSuccessPage />} />
      </Routes>
      {!isAdmin && <Footer />}
      <a href="https://wa.me/919999830938" className="wa-fab" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">
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