import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { demoUsers } from "../data/users";
import {
  LockKeyhole,
  Mail,
  ArrowRight,
  Eye,
  EyeOff,
  Factory,
  Bell,
  Users,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import merionLogo from "../assets/logo-merion.png";

const sideItems = [
  { icon: Bell, color: "#f59e0b", text: "Real-time updates and notifications" },
  { icon: Users, color: "#3b82f6", text: "Teams and management, connected" },
  { icon: ShieldCheck, color: "#f43f5e", text: "Access based on your role" },
];

// ---- Demo accounts for the quick-login dropdown
const isWorker = (u) => u.role === "Worker";
const isChef = (u) => u.role.startsWith("Atelier");

const accountGroups = [
  {
    label: "Management",
    users: demoUsers.filter((u) => !isWorker(u) && !isChef(u)),
  },
  { label: "Atelier heads", users: demoUsers.filter(isChef) },
  { label: "Workers", users: demoUsers.filter(isWorker) },
];

const optionLabel = (u) =>
  isWorker(u) ? `${u.name} (Atelier ${u.atelier})` : `${u.name} (${u.role})`;

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Message sent by the signup page after a successful registration
  const successMessage = location.state?.message;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    if (login(email, password)) {
      navigate("/");
    } else {
      setError("Invalid email or password. Please try again.");
    }
  };

  // Sign in directly with the account picked in the dropdown
  const handleQuickLogin = (e) => {
    const user = demoUsers.find((u) => String(u.id) === e.target.value);
    if (!user) return;

    setError("");

    if (login(user.email, user.password)) {
      navigate("/");
    } else {
      setError("Could not sign in with this account.");
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-card">
        <Link to="/" className="auth-logo">
          <img src={merionLogo} alt="MeriON" />
        </Link>

        <span className="eyebrow">
          <span className="status-dot" />
          WELCOME BACK
        </span>
        <h1>
          Sign in to <span className="au-gradient">MeriON</span>
        </h1>

        <p className="auth-description">
          Enter your credentials to access your workspace.
        </p>

        {successMessage && (
          <p className="au-success">
            <CheckCircle2 size={18} />
            {successMessage}
          </p>
        )}

        <div className="quick-login">
          <label htmlFor="quick-account">Quick sign in with a demo account</label>

          <div className="input-wrapper">
            <Users size={19} />
            <select id="quick-account" value="" onChange={handleQuickLogin}>
              <option value="" disabled>
                Select an account to sign in…
              </option>
              {accountGroups.map((g) => (
                <optgroup key={g.label} label={g.label}>
                  {g.users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {optionLabel(u)}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div className="quick-login-divider">
            <span>or sign in with your email</span>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <label htmlFor="email">Email address</label>

          <div className="input-wrapper">
            <Mail size={19} />

            <input
              id="email"
              type="email"
              placeholder="name@merion.demo"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <label htmlFor="password">Password</label>

          <div className="input-wrapper">
            <LockKeyhole size={19} />

            <input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword(!showPassword)}
              aria-label="Toggle password visibility"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {error && (
            <p className="error-message au-error" key={error} role="alert">
              <AlertCircle size={16} />
              {error}
            </p>
          )}

          <button type="submit" className="btn-primary auth-submit">
            Sign In <ArrowRight size={18} />
          </button>
        </form>

        <p className="auth-switch">
          Don't have an account? <Link to="/signup">Sign up</Link>
        </p>

        <Link to="/" className="back-home">
          ← Back to home
        </Link>
      </div>

      <div className="auth-side">
        <span className="au-blob au-blob-1" />
        <span className="au-blob au-blob-2" />
        <span className="au-blob au-blob-3" />

        <div className="auth-side-content">
          <span className="eyebrow">MERION WORKSPACE</span>
          <h2>
            One platform.
            <br />
            <span className="au-side-accent">Better coordination.</span>
          </h2>
          <p>
            Connect your teams, streamline communication and keep your
            industrial operations moving.
          </p>

          <ul className="au-side-list">
            {sideItems.map(({ icon: Icon, color, text }, i) => (
              <li key={text} style={{ "--c": color, "--i": i }}>
                <span>
                  <Icon size={18} />
                </span>
                {text}
              </li>
            ))}
          </ul>

          <div className="auth-side-decoration au-float">
            <Factory size={100} strokeWidth={1} />
          </div>
        </div>
      </div>
    </main>
  );
}
