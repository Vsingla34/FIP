import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer>
      <div className="container">
        <div className="footer-grid">
          <div>
            <div className="footer-logo-wrap">
              <img src="https://www.fipin.org/images/our-img/logo.png" alt="FIP" className="footer-logo-img" onError={e => e.target.style.display = 'none'} />
              <div className="footer-logo-fallback" style={{ display: 'none' }}>FIP<span>.</span></div>
            </div>
            <p className="footer-desc">Federation of Indian Professionals — India's premier network for Chartered Accountants, Company Secretaries, Cost Accountants, and Legal professionals. Connect · Collaborate · Conquer.</p>
            <div className="footer-soc-row">
              <a className="f-soc" href="https://www.facebook.com/fip.officials/" target="_blank" rel="noopener"><i className="fa-brands fa-facebook-f"></i></a>
              <a className="f-soc" href="https://www.linkedin.com/in/federation-of-indian-professionals-fip-8ba0631a8/" target="_blank" rel="noopener"><i className="fa-brands fa-linkedin-in"></i></a>
              <a className="f-soc" href="https://www.youtube.com/c/federationindianprofessionals" target="_blank" rel="noopener"><i className="fa-brands fa-youtube"></i></a>
              <a className="f-soc" href="https://mobile.twitter.com/fip_official" target="_blank" rel="noopener"><i className="fa-brands fa-x-twitter"></i></a>
            </div>
          </div>
          <div className="footer-col">
            <h4>Platform</h4>
            <Link to="/about">About FIP</Link>
            <Link to="/team">Our Team</Link>
            <Link to="/membership">Membership</Link>
            <Link to="/courses">Courses</Link>
            <Link to="/events">Events</Link>
          </div>
          <div className="footer-col">
            <h4>Resources</h4>
            <Link to="/blog">Blog &amp; Insights</Link>
            <Link to="/webinars">Webinars</Link>
            <Link to="/committees">Committees</Link>
            <Link to="/directory">Member Directory</Link>
            <Link to="/contact">Contact</Link>
          </div>
          <div className="footer-col">
            <h4>Legal</h4>
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
            <a href="#">Refund Policy</a>
            <a href="#">Code of Conduct</a>
          </div>
        </div>
        <div className="footer-bottom">
          <span className="footer-copy">© 2026 Federation of Indian Professionals. All rights reserved.</span>
          <div className="footer-legal">
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
            <a href="#">Sitemap</a>
          </div>
        </div>
      </div>
    </footer>
  );
}