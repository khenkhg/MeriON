import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import AlertCenter from "../components/AlertCenter";
import Dashboard from "../components/Dashboard";
import { useAuth } from "../context/AuthContext";
import {
  Activity,
  Bell,
  Factory,
  BarChart3,
  ShieldCheck,
  ArrowRight,
  Users,
  Network,
  CheckCircle2,
  Sparkles,
  Zap,
  Truck,
  Wrench,
  ClipboardCheck,
  Gauge,
  Layers,
} from "lucide-react";
import Footer from "../components/Footer";

/* ---------- small helpers ---------- */

// Adds the "in-view" class once an element scrolls into view
function useReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("in-view");
          io.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return ref;
}

function Reveal({ children, delay = 0, className = "" }) {
  const ref = useReveal();
  return (
    <div
      ref={ref}
      className={`reveal ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

// Counts up to a target number when visible
function Counter({ to, suffix = "" }) {
  const ref = useRef(null);
  const [value, setValue] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      io.disconnect();
      const duration = 1400;
      const start = performance.now();
      const tick = (now) => {
        const p = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        setValue(Math.round(eased * to));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    io.observe(el);
    return () => io.disconnect();
  }, [to]);

  return (
    <span ref={ref}>
      {value}
      {suffix}
    </span>
  );
}

/* ---------- data ---------- */

const rotatingWords = ["Operate Better.", "Move Faster.", "Stay Connected.", "Work Together."];

const features = [
  {
    icon: Activity,
    color: "#3AAA35",
    title: "Real-Time Monitoring",
    description:
      "Stay informed about operational activities and important updates as they happen.",
  },
  {
    icon: Bell,
    color: "#f59e0b",
    title: "Smart Notifications",
    description:
      "Notify responsible employees about important events, requests and decisions.",
  },
  {
    icon: BarChart3,
    color: "#3b82f6",
    title: "Centralized Information",
    description:
      "Access essential information from different departments in one place.",
  },
  {
    icon: Users,
    color: "#8b5cf6",
    title: "Team Coordination",
    description:
      "Improve communication and coordination between management and production teams.",
  },
  {
    icon: Network,
    color: "#14b8a6",
    title: "Connected Operations",
    description:
      "Connect different sites and departments through a unified information platform.",
  },
  {
    icon: ShieldCheck,
    color: "#f43f5e",
    title: "Controlled Access",
    description:
      "Organize access to information according to employee roles and responsibilities.",
  },
];

// Illustrative content: edit to match your real roles / modules
const roles = [
  {
    id: "management",
    label: "Management",
    icon: Gauge,
    color: "#3b82f6",
    headline: "The big picture, at a glance.",
    points: [
      "Overview of every department and site",
      "Requests and decisions waiting for approval",
      "Key indicators in one place",
    ],
  },
  {
    id: "production",
    label: "Production",
    icon: Factory,
    color: "#3AAA35",
    headline: "Stay in sync with the floor.",
    points: [
      "Live status of production activities",
      "Instant updates from other teams",
      "Clear notifications when action is needed",
    ],
  },
  {
    id: "maintenance",
    label: "Maintenance",
    icon: Wrench,
    color: "#f59e0b",
    headline: "Know what needs attention.",
    points: [
      "Be alerted the moment something comes up",
      "Coordinate with production quickly",
      "Keep everyone informed on progress",
    ],
  },
  {
    id: "logistics",
    label: "Logistics",
    icon: Truck,
    color: "#8b5cf6",
    headline: "Keep everything moving.",
    points: [
      "Shared visibility across departments",
      "Requests routed to the right person",
      "Less back-and-forth, more done",
    ],
  },
];

const feedTemplates = [
  { icon: Bell, color: "#f59e0b", text: "New request sent to Production" },
  { icon: CheckCircle2, color: "#3AAA35", text: "Decision approved by Management" },
  { icon: Zap, color: "#3b82f6", text: "Real-time update received" },
  { icon: ClipboardCheck, color: "#8b5cf6", text: "Report shared with the team" },
  { icon: Wrench, color: "#f43f5e", text: "Maintenance notified instantly" },
  { icon: Truck, color: "#14b8a6", text: "Logistics status updated" },
];

const stats = [
  {
    icon: Activity,
    color: "#3AAA35",
    to: 24,
    suffix: "/7",
    label: "Always-on visibility",
    text: "Know what is happening, at any hour.",
  },
  {
    icon: Layers,
    color: "#3b82f6",
    to: 6,
    suffix: "",
    label: "Core capabilities",
    text: "Everything your teams need in one place.",
  },
  {
    icon: Users,
    color: "#8b5cf6",
    to: 4,
    suffix: "",
    label: "Role-based workspaces",
    text: "Each team sees what matters to them.",
  },
  {
    icon: Network,
    color: "#f43f5e",
    to: 1,
    suffix: "",
    label: "Unified platform",
    text: "One connected system for every site.",
  },
];

const marqueeItems = [
  "Real-Time Monitoring",
  "Smart Notifications",
  "Centralized Information",
  "Team Coordination",
  "Connected Operations",
  "Controlled Access",
];

/* ---------- sections ---------- */

function RotatingWord() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % rotatingWords.length), 2400);
    return () => clearInterval(t);
  }, []);
  return (
    <span key={i} className="rotating-word">
      {rotatingWords[i]}
    </span>
  );
}

function LiveCard() {
  const cardRef = useRef(null);
  const [feed, setFeed] = useState(() =>
    feedTemplates.slice(0, 3).map((f, idx) => ({ ...f, id: idx }))
  );
  const counter = useRef(3);

  // Live activity feed
  useEffect(() => {
    const t = setInterval(() => {
      const tpl = feedTemplates[counter.current % feedTemplates.length];
      setFeed((prev) => [{ ...tpl, id: counter.current }, ...prev].slice(0, 4));
      counter.current += 1;
    }, 2600);
    return () => clearInterval(t);
  }, []);

  // 3D tilt on hover
  const onMove = (e) => {
    const el = cardRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(900px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg)`;
  };
  const onLeave = () => {
    if (cardRef.current) cardRef.current.style.transform = "";
  };

  return (
    <div className="lp-visual-card" ref={cardRef} onMouseMove={onMove} onMouseLeave={onLeave}>
      <div className="lp-visual-header">
        <div>
          <span className="lp-visual-label">MERION OVERVIEW</span>
          <h3>Operations Center</h3>
        </div>
        <span className="lp-pulse-icon">
          <Activity size={22} />
        </span>
      </div>

      <div className="lp-status-row">
        <div>
          <span className="lp-muted">Platform status</span>
          <strong className="lp-online">
            <span className="lp-dot" /> Operational
          </strong>
        </div>
        <CheckCircle2 size={22} color="#3AAA35" />
      </div>

      <div className="lp-feed">
        {feed.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              className={`lp-feed-item ${idx === 0 ? "is-new" : ""}`}
              key={item.id}
              style={{ "--c": item.color }}
            >
              <span className="lp-feed-icon">
                <Icon size={16} />
              </span>
              <span>{item.text}</span>
              <small>{idx === 0 ? "now" : `${idx * 3}s ago`}</small>
            </div>
          );
        })}
      </div>

      <div className="lp-visual-bottom">
        <BarChart3 size={18} />
        <span>Unified industrial management</span>
      </div>
    </div>
  );
}

function FeatureCard({ feature, index }) {
  const Icon = feature.icon;
  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
  };
  return (
    <Reveal delay={index * 70}>
      <article
        className="lp-feature-card"
        style={{ "--accent": feature.color }}
        onMouseMove={onMove}
      >
        <div className="lp-feature-icon">
          <Icon size={24} />
        </div>
        <h3>{feature.title}</h3>
        <p>{feature.description}</p>
        <span className="lp-feature-bar" />
      </article>
    </Reveal>
  );
}

function RoleExplorer() {
  const [active, setActive] = useState(roles[0].id);
  const role = roles.find((r) => r.id === active);
  const ActiveIcon = role.icon;

  return (
    <div className="lp-roles" style={{ "--accent": role.color }}>
      <div className="lp-role-tabs" role="tablist">
        {roles.map((r) => {
          const Icon = r.icon;
          return (
            <button
              key={r.id}
              role="tab"
              aria-selected={r.id === active}
              className={`lp-role-tab ${r.id === active ? "active" : ""}`}
              style={{ "--tab": r.color }}
              onClick={() => setActive(r.id)}
            >
              <Icon size={18} />
              {r.label}
            </button>
          );
        })}
      </div>

      <div className="lp-role-panel" key={role.id}>
        <div className="lp-role-badge">
          <ActiveIcon size={30} />
        </div>
        <div>
          <h3>{role.headline}</h3>
          <ul>
            {role.points.map((p) => (
              <li key={p}>
                <CheckCircle2 size={18} />
                {p}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/* ---------- page ---------- */

export default function Home() {
  const { user } = useAuth();
  const heroRef = useRef(null);

  // Soft light that follows the cursor in the hero
  const onHeroMove = (e) => {
    const el = heroRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--hx", `${e.clientX - r.left}px`);
    el.style.setProperty("--hy", `${e.clientY - r.top}px`);
  };

  // Logged in: the landing page becomes the role-based dashboard
  if (user) {
    return (
      <>
        <Navbar />
        <Dashboard />
        <AlertCenter />
      </>
    );
  }

  return (
    <>
      <Navbar />

      <main className="lp">
        {/* HERO */}
        <section className="lp-hero" ref={heroRef} onMouseMove={onHeroMove}>
          <div className="lp-blob lp-blob-1" />
          <div className="lp-blob lp-blob-2" />
          <div className="lp-blob lp-blob-3" />
          <div className="lp-grid-bg" />
          <div className="lp-cursor-glow" />

          <div className="lp-hero-content">
            <span className="lp-eyebrow">
              <span className="lp-dot" />
              INDUSTRIAL MANAGEMENT PLATFORM
            </span>

            <h1>
              Manage Smarter.
              <br />
              <RotatingWord />
            </h1>

            <p>
              Bringing industrial operations, teams and management together through one
              centralized platform. Stay connected, informed and in control.
            </p>

            <div className="lp-actions">
              <Link to="/login" className="lp-btn-primary">
                Access Your Workspace
                <ArrowRight size={18} />
              </Link>
              <Link to="/signup" className="lp-btn-secondary">
                <Sparkles size={17} />
                Create an Account
              </Link>
            </div>

            <div className="lp-note">
              <ShieldCheck size={18} />
              One platform. Connected operations.
            </div>
          </div>

          <div className="lp-hero-visual">
            <span className="lp-float lp-float-1">
              <Bell size={20} />
            </span>
            <span className="lp-float lp-float-2">
              <Factory size={20} />
            </span>
            <span className="lp-float lp-float-3">
              <Users size={20} />
            </span>
            <LiveCard />
          </div>
        </section>

        {/* MARQUEE */}
        <div className="lp-marquee" aria-hidden="true">
          <div className="lp-marquee-track">
            {[...marqueeItems, ...marqueeItems, ...marqueeItems].map((m, i) => (
              <span key={i}>
                <Sparkles size={14} /> {m}
              </span>
            ))}
          </div>
        </div>

        {/* STATS */}
        <section className="lp-stats">
          {stats.map((st, i) => {
            const Icon = st.icon;
            return (
              <Reveal key={st.label} delay={i * 100} className="lp-stat-wrap">
                <article className="lp-stat" style={{ "--accent": st.color }}>
                  <span className="lp-stat-icon">
                    <Icon size={22} />
                  </span>
                  <strong>
                    <Counter to={st.to} suffix={st.suffix} />
                  </strong>
                  <h4>{st.label}</h4>
                  <p>{st.text}</p>
                </article>
              </Reveal>
            );
          })}
        </section>

        {/* FEATURES */}
        <section className="lp-section">
          <Reveal className="lp-heading">
            <span className="lp-eyebrow light">THE MERION ADVANTAGE</span>
            <h2>
              Everything <span className="lp-gradient-text">Connected.</span>
            </h2>
            <p>
              A smarter way to coordinate industrial activities and keep every department
              informed.
            </p>
          </Reveal>

          <div className="lp-feature-grid">
            {features.map((f, i) => (
              <FeatureCard feature={f} index={i} key={f.title} />
            ))}
          </div>
        </section>

        {/* ROLES */}
        <section className="lp-section lp-section-tint">
          <Reveal className="lp-heading">
            <span className="lp-eyebrow light">BUILT FOR EVERY TEAM</span>
            <h2>
              One platform, <span className="lp-gradient-text">your view.</span>
            </h2>
            <p>Pick a team and see how MeriON adapts to the way they work.</p>
          </Reveal>
          <Reveal>
            <RoleExplorer />
          </Reveal>
        </section>

        {/* CTA */}
        <section className="lp-cta">
          <div className="lp-cta-blob" />
          <Reveal className="lp-cta-inner">
            <div>
              <span className="lp-eyebrow on-dark">GET STARTED</span>
              <h2>Bring your operations together.</h2>
              <p>Discover a more connected approach to industrial management with MeriON.</p>
            </div>
            <Link to="/login" className="lp-btn-white">
              Access MeriON <ArrowRight size={18} />
            </Link>
          </Reveal>
        </section>
      </main>

      <Footer />
    </>
  );
}
