import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LogOut, Menu, X } from "lucide-react";
import { ATELIER_ROLES } from "../data/ateliers";
import { hasInsights } from "../data/analytics";
import { hasPredictions } from "../data/predictions";
import { hasOrders } from "../data/orders";
import { WORKER_ROLE } from "../data/shifts";
import AlertBar from "./AlertBar";
import merionLogo from "../assets/logo-merion.png";

// The page each role gets in the navbar. Roles not listed here get no extra link.
const roleWorkspace = {
  [WORKER_ROLE]: { to: "/my-shifts", label: "My Shifts" },
  "Production Manager": { to: "/barcode", label: "Barcode Scanner" },
  ...Object.fromEntries(
    ATELIER_ROLES.map((role) => [role, { to: "/barcode", label: "Barcode Scanner" }])
  ),
};

const initialsOf = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("") || "U";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const workspace = user ? roleWorkspace[user.role] : null;

  // Shadow appears once the page is scrolled
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the mobile menu whenever the page changes
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    setMenuOpen(false);
    logout();
    navigate("/");
  };

  const linkClass = ({ isActive }) => `nav-link${isActive ? " active" : ""}`;

  return (
    <>
      <nav className={`navbar${scrolled ? " is-scrolled" : ""}`}>
        <Link to="/" className="brand">
          <img src={merionLogo} alt="MeriON" />
        </Link>

        <button
          type="button"
          className="nav-toggle"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        <div className={`nav-links${menuOpen ? " open" : ""}`}>
          <NavLink to="/" end className={linkClass}>
            Home
          </NavLink>

          {workspace && (
            <NavLink to={workspace.to} className={linkClass}>
              {workspace.label}
            </NavLink>
          )}

          {user && hasOrders(user.role) && (
            <NavLink to="/orders" className={linkClass}>
              Orders
            </NavLink>
          )}

          {user && hasInsights(user.role) && (
            <NavLink to="/insights" className={linkClass}>
              Insights
            </NavLink>
          )}

          {user && hasPredictions(user.role) && (
            <NavLink to="/predictions" className={linkClass}>
              AI Predictions
            </NavLink>
          )}

          {user ? (
            <>
              <div className="nav-profile">
                <span className="nav-avatar">{initialsOf(user.name)}</span>
                <div>
                  <strong>{user.name}</strong>
                  <span>{user.atelier ? `${user.role} · Atelier ${user.atelier}` : user.role}</span>
                </div>
              </div>

              <button className="btn-outline" onClick={handleLogout}>
                <LogOut size={16} />
                Logout
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" className={linkClass}>
                Login
              </NavLink>
              <Link to="/signup" className="btn-primary">
                Get Started
              </Link>
            </>
          )}
        </div>
      </nav>
      <AlertBar />
    </>
  );
}
