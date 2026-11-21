import { Link } from "react-router-dom";
import { ArrowUp, Activity, Bell, Network, ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import merionLogo from "../assets/logo-merion.png";
import meriplastLogo from "../assets/logo-meriplast.png";

const highlights = [
  { icon: Activity, label: "Real-time monitoring", color: "#3AAA35" },
  { icon: Bell, label: "Smart notifications", color: "#f59e0b" },
  { icon: Network, label: "Connected operations", color: "#3b82f6" },
  { icon: ShieldCheck, label: "Controlled access", color: "#f43f5e" },
];

export default function Footer() {
  const { user } = useAuth();

  const scrollTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <footer className="site-footer">
      <div className="site-footer-bar" />

      <div className="site-footer-main">
        <div className="site-footer-brand">
          <img src={merionLogo} alt="MeriON" />
          <p>
            One centralized platform bringing industrial operations, teams and
            management together.
          </p>

          <a
            className="site-footer-parent"
            href="https://meriplast.dz/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Visit the Meriplast website"
          >
            <span>A solution by</span>
            <img src={meriplastLogo} alt="Meriplast" />
          </a>
        </div>

        <div className="site-footer-col">
          <h4>Platform</h4>
          <ul className="site-footer-tags">
            {highlights.map(({ icon: Icon, label, color }) => (
              <li key={label} style={{ "--c": color }}>
                <Icon size={14} />
                {label}
              </li>
            ))}
          </ul>
        </div>

        <div className="site-footer-col">
          <h4>Access</h4>
          <ul className="site-footer-links">
            <li>
              <Link to="/">Home</Link>
            </li>
            {!user && (
              <>
                <li>
                  <Link to="/login">Login</Link>
                </li>
                <li>
                  <Link to="/signup">Create an account</Link>
                </li>
              </>
            )}
          </ul>
        </div>
      </div>

      <div className="site-footer-bottom">
        <span>© 2026 MeriON, part of Meriplast. Industrial Management Platform.</span>

        <button type="button" className="site-footer-top" onClick={scrollTop}>
          Back to top
          <ArrowUp size={15} />
        </button>
      </div>
    </footer>
  );
}
