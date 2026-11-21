import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
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
