import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  User,
  Mail,
  LockKeyhole,
  ArrowRight,
  Eye,
  EyeOff,
  Factory,
  UserPlus,
  LogIn,
  LayoutDashboard,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import merionLogo from "../assets/logo-merion.png";

const sideSteps = [
  { icon: UserPlus, color: "#3AAA35", text: "Create your account" },
  { icon: LogIn, color: "#3b82f6", text: "Sign in to MeriON" },
  { icon: LayoutDashboard, color: "#8b5cf6", text: "Open your workspace" },
];

const strengthLevels = [
  { label: "Too short", color: "#D62828" },
  { label: "Weak", color: "#f43f5e" },
  { label: "Fair", color: "#f59e0b" },
  { label: "Good", color: "#14b8a6" },
  { label: "Strong", color: "#3AAA35" },
];

// Visual hint only: the real rule (6+ characters) is still checked on submit
function getStrength(password) {
  if (!password) return 0;
  if (password.length < 6) return 0;

  let score = 1;
  if (password.length >= 10) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score += 1;
  return Math.min(score, 4);
}

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const strength = getStrength(password);
  const level = strengthLevels[strength];
  const passwordsMatch = confirmPassword && password === confirmPassword;
  const passwordsDiffer = confirmPassword && password !== confirmPassword;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password must contain at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    const success = signup(name, email, password);

    if (success) {
      navigate("/login", {
        state: { message: "Account created! You can now sign in." },
      });
    } else {
      setError("This email is already registered.");
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
          JOIN MERION
        </span>
        <h1>
          Create an <span className="au-gradient">account</span>
        </h1>

        <p className="auth-description">
          Register to access the MeriON platform.
        </p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="name">Full name</label>

          <div className="input-wrapper">
            <User size={19} />
            <input
              id="name"
              type="text"
              placeholder="Your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <label htmlFor="email">Work email</label>

          <div className="input-wrapper">
            <Mail size={19} />
            <input
              id="email"
              type="email"
              placeholder="name@company.com"
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
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
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

          {password && (
            <div className="au-strength" style={{ "--s": level.color }}>
              <div className="au-strength-bars">
                {[1, 2, 3, 4].map((n) => (
                  <span key={n} className={n <= strength ? "on" : ""} />
                ))}
              </div>
              <small>{level.label}</small>
            </div>
          )}

          <label htmlFor="confirmPassword">Confirm password</label>

          <div
            className={`input-wrapper${passwordsMatch ? " is-valid" : ""}${
              passwordsDiffer ? " is-invalid" : ""
            }`}
          >
            <LockKeyhole size={19} />
            <input
              id="confirmPassword"
              type={showConfirm ? "text" : "password"}
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />

            {passwordsMatch && (
              <CheckCircle2 size={18} className="au-match" />
            )}

            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowConfirm(!showConfirm)}
              aria-label="Toggle confirm password visibility"
            >
              {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {error && (
            <p className="error-message au-error" key={error} role="alert">
              <AlertCircle size={16} />
              {error}
            </p>
          )}

          <button type="submit" className="btn-primary auth-submit">
            Create Account <ArrowRight size={18} />
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Sign in</Link>
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
          <span className="eyebrow">WELCOME TO MERION</span>
          <h2>
            Connect.
            <br />
            Coordinate.
            <br />
            <span className="au-side-accent">Progress.</span>
          </h2>
          <p>A unified environment for industrial teams and management.</p>

          <ul className="au-side-list au-steps">
            {sideSteps.map(({ icon: Icon, color, text }, i) => (
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
