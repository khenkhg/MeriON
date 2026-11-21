import { useEffect, useMemo, useState } from "react";
import {
  Sparkles,
  AlertTriangle,
  Wrench,
  Boxes,
  CalendarClock,
  ChevronDown,
  ChevronUp,
  Plus,
  RotateCcw,
  CheckCircle2,
} from "lucide-react";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import { useAlerts } from "../context/AlertContext";
import { useBarcode } from "../context/BarcodeContext";
import { useOrders } from "../context/OrderContext";
import { useMaterial } from "../context/MaterialContext";
import { ATELIER_NAMES } from "../data/ateliers";
import { MACHINES } from "../data/alerts";
import { defaultStock } from "../data/material";
import { outputEvents, fmtMinutes, fmtKg } from "../data/analytics";
import {
  TABS_BY_ROLE,
  FACTORS,
  RISK_ALERT,
  RISK_WATCH,
  machineRisks,
  monthlyBreakdowns,
  materialForecast,
} from "../data/predictions";
import {
  MACHINE_LIST,
  hueOf,
  urgentOrder,
  wipJobs,
  ordersToJobs,
  downMap,
  slowMap,
  makePlan,
  stats,
} from "../data/planner";

const TAB_LABELS = {
  overview: "Overview",
  breakdowns: "Breakdowns",
  material: "Raw material",
  schedule: "Schedule",
};

const WEIGHTS = [40, 35, 25];

/* ---------- small helpers ---------- */

const clock = (minFromNow, now) =>
  new Date(now + minFromNow * 60000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const riskTone = (score) => (score >= RISK_ALERT ? "red" : score >= RISK_WATCH ? "amber" : "green");
const riskLabel = (score) => (score >= RISK_ALERT ? "Imminent" : score >= RISK_WATCH ? "Watch" : "Normal");

function Badge({ tone = "green", children }) {
  return <span className={`pred-badge ${tone}`}>{children}</span>;
}

function Delta({ value, unit, base }) {
  const d = value - base;
  if (!d) return <small className="pred-delta">same as arrival order</small>;
  return (
    <small className={`pred-delta ${d < 0 ? "good" : "bad"}`}>
      {d < 0 ? "−" : "+"}
      {Math.abs(d)} {unit} vs arrival order
    </small>
  );
}

function StatCard({ icon: Icon, tone, label, value, hint }) {
  return (
    <div className="commercial-stat-card">
      <div className={`commercial-stat-icon ${tone}`}>
        <Icon size={22} />
      </div>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{hint}</small>
    </div>
  );
}

function SectionHead({ eyebrow, title, note }) {
  return (
    <div className="commercial-section-heading">
      <span className="eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      {note && <p className="pred-note">{note}</p>}
    </div>
  );
}

/* ---------- page ---------- */

export default function Predictions() {
  const { user } = useAuth();
  const { alerts = [] } = useAlerts();
  const { products = [], semiFiniProducts = [] } = useBarcode();
  const { orders = [] } = useOrders();
  const material = useMaterial();

  const tabs = TABS_BY_ROLE[user.role] || ["overview"];
  const [tab, setTab] = useState(tabs[0]);

  // refresh the time-based predictions every 30 s
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  const getStock = useMemo(
    () =>
      material?.getStock ||
      ((n) => material?.material?.[n] || material?.stock?.[n] || defaultStock(n)),
    [material]
  );

  const events = useMemo(() => outputEvents(products, semiFiniProducts), [products, semiFiniProducts]);
  const risks = useMemo(() => machineRisks(alerts, events, now), [alerts, events, now]);
  const forecast = useMemo(() => materialForecast(getStock, now), [getStock, now, material]);

  // The overview and the schedule tab must use the same plan inputs
  const planOpts = useMemo(
    () => ({ down: downMap(alerts, now), slow: slowMap(risks), prio: {} }),
    [alerts, risks, now]
  );
  const baseJobs = useMemo(
    () => [...wipJobs(semiFiniProducts), ...ordersToJobs(orders, now)],
    [semiFiniProducts, orders, now]
  );
  const baseFifo = useMemo(() => stats(baseJobs, makePlan(baseJobs, "fifo", planOpts)), [baseJobs, planOpts]);
  const baseAi = useMemo(() => stats(baseJobs, makePlan(baseJobs, "ai", planOpts)), [baseJobs, planOpts]);

  const atRisk = risks.filter((r) => r.state === "running" && r.score >= RISK_ALERT);
  const resupply = forecast.filter((f) => ["empty", "critical", "resupply"].includes(f.status));

  return (
    <>
      <Navbar />
      <main className="commercial-page">
        <header className="commercial-header">
          <div>
            <span className="eyebrow">{user.role.toUpperCase()} / AI PREDICTIONS</span>
            <h1>AI Predictions</h1>
            <p>
              What is likely to happen next on the shop floor: breakdowns, material run-outs and late orders,
              with the reasoning behind each one.
            </p>
          </div>
          <span className="connection-status connected">
            <span className="status-dot" />
            Live · updated {new Date(now).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        </header>

        {tabs.length > 1 && (
          <div className="pred-tabs">
            <div className="chart-seg" role="tablist">
              {tabs.map((t) => (
                <button
                  key={t}
                  role="tab"
                  aria-selected={tab === t}
                  className={tab === t ? "active" : ""}
                  onClick={() => setTab(t)}
                >
                  {TAB_LABELS[t]}
                </button>
              ))}
            </div>
          </div>
        )}

        {tab === "overview" && (
          <Overview
            tabs={tabs}
            go={setTab}
            now={now}
            risks={risks}
            atRisk={atRisk}
            forecast={forecast}
            resupply={resupply}
            baseFifo={baseFifo}
            baseAi={baseAi}
            jobs={baseJobs}
          />
        )}
        {tab === "breakdowns" && <Breakdowns risks={risks} now={now} />}
        {tab === "material" && <MaterialTab forecast={forecast} now={now} />}
        {tab === "schedule" && (
          <Schedule alerts={alerts} semiFiniProducts={semiFiniProducts} orders={orders} risks={risks} now={now} />
        )}

        <p className="pred-footnote">
          Scores and times come from rules applied to your own alerts, scans and stock. They are starting values
          to calibrate with real plant data, not a trained model.
        </p>
      </main>
    </>
  );
}

/* ---------- overview ---------- */

function Overview({ tabs, go, now, risks, atRisk, forecast, resupply, baseFifo, baseAi, jobs }) {
  const [open, setOpen] = useState(null);
  const saved = baseFifo.n - baseAi.n;

  // One list of predicted problems, most urgent first
  const items = [
    ...atRisk.map((r) => ({
      id: `risk-${r.key}`,
      tab: "breakdowns",
      tone: "red",
      icon: Wrench,
      title: `${r.name} may break down soon`,
      sub: `${r.score}% risk of breakdown soon · Atelier ${r.atelier} · ${ATELIER_NAMES[r.atelier]}`,
      rank: 100 + r.score,
      why: [
        ["Main factor", FACTORS[r.main]],
        ["Signals", `${r.signals.recent} breakdown(s) in 30 days · ${r.signals.qs} quality/scrap alert(s) · ${fmtKg(r.signals.kg)} since last breakdown`],
        r.part && ["Usual failing part", r.part],
        ["Suggested action", "Inspect at the next planned stop. The planner already runs this machine 30% slower."],
      ].filter(Boolean),
    })),
    ...resupply.map((f) => ({
      id: `mat-${f.atelier}`,
      tab: "material",
      tone: f.status === "resupply" ? "amber" : "red",
      icon: Boxes,
      title:
        f.status === "empty"
          ? `Atelier ${f.atelier} is out of ${f.material}`
          : `${f.material} runs out in ${fmtMinutes(f.runoutMin)} at Atelier ${f.atelier}`,
      sub: `Supplier lead time ${f.lead} min · alert threshold ${f.threshold} min`,
      rank: f.status === "empty" ? 200 : f.status === "critical" ? 150 : 60,
      why: [
        ["Calculation", f.kgH ? `${Math.round(f.stockKg)} kg ÷ ${Math.round(f.kgH)} kg/h = ${fmtMinutes(f.runoutMin)}` : "No consumption data yet"],
        ["Rule", `Alert when stock lasts less than 1 h + ${f.lead} min of supplier lead time`],
        ["Suggested action", "Request a resupply now, before the line stops."],
      ],
    })),
    ...(baseFifo.n > 0
      ? [{
          id: "late",
          tab: "schedule",
          tone: "amber",
          icon: CalendarClock,
          title: `${baseFifo.n} of ${jobs.length} orders would be late in arrival order`,
          sub: saved > 0 ? `The AI plan brings that down to ${baseAi.n}` : "The AI plan cannot recover them with current constraints",
          rank: 40 + baseFifo.n,
          why: [
            ["Signal", `Projected finish compared with each departure deadline`],
            ["Total delay", `${fmtMinutes(baseFifo.L)} in arrival order, ${fmtMinutes(baseAi.L)} with the AI plan`],
            ["Suggested action", "Open the Schedule tab, review the AI plan and send it to the workshops."],
          ],
        }]
      : []),
  ].sort((a, b) => b.rank - a.rank);

  const canOpen = (t) => tabs.includes(t);

  return (
    <>
      <div className="commercial-stats four">
        <StatCard icon={Wrench} tone="red" label="Machines at risk" value={atRisk.length} hint={`${RISK_ALERT}% risk of breakdown or more`} />
        <StatCard icon={Boxes} tone="amber" label="Materials to resupply" value={resupply.length} hint="stock runs out before resupply" />
        <StatCard icon={CalendarClock} tone="blue" label="Orders predicted late" value={baseFifo.n} hint={`out of ${jobs.length} in arrival order`} />
        <StatCard
          icon={Sparkles}
          tone="green"
          label="Late orders avoided by AI plan"
          value={Math.max(0, saved)}
          hint={`${baseAi.su} min of changeovers planned`}
        />
      </div>

      <section className="commercial-section">
        <SectionHead
          eyebrow="PREDICTED ALERTS"
          title="What needs attention"
          note="Sorted by urgency. Open a line to see how the prediction was calculated."
        />
        {items.length === 0 ? (
          <div className="dash-empty">
            <CheckCircle2 size={18} /> Nothing is predicted to go wrong right now.
          </div>
        ) : (
          <div className="dash-alerts">
            {items.map((it) => {
              const Icon = it.icon;
              const isOpen = open === it.id;
              return (
                <div key={it.id} className={`pred-alert ${it.tone}`}>
                  <button
                    type="button"
                    className="pred-alert-head"
                    aria-expanded={isOpen}
                    onClick={() => setOpen(isOpen ? null : it.id)}
                  >
                    <span className="pred-alert-icon">
                      <Icon size={18} />
                    </span>
                    <span className="dash-alert-main">
                      <strong>{it.title}</strong>
                      <span>{it.sub}</span>
                    </span>
                    {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                  {isOpen && (
                    <div className="pred-why">
                      <dl>
                        {it.why.map(([k, v]) => (
                          <div key={k}>
                            <dt>{k}</dt>
                            <dd>{v}</dd>
                          </div>
                        ))}
                      </dl>
                      {canOpen(it.tab) && (
                        <button type="button" className="btn-secondary pred-open" onClick={() => go(it.tab)}>
                          Open {TAB_LABELS[it.tab].toLowerCase()}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="commercial-section">
        <SectionHead eyebrow="MACHINES" title="Breakdown risk by machine" />
        <div className="machine-grid">
          {Object.entries(MACHINES).map(([n, names]) => (
            <div className="machine-group" key={n}>
              <h4>
                Atelier {n} · {ATELIER_NAMES[n]}
              </h4>
              <div className="machine-tiles">
                {names.map((name) => {
                  const r = risks.find((x) => x.name === name);
                  const cls = r.state === "down" ? "down" : r.state === "degraded" || r.score >= RISK_ALERT ? "degraded" : "";
                  return (
                    <div className={`machine-tile ${cls}`} key={name}>
                      <span className="machine-dot" />
                      <div>
                        <strong>{name}</strong>
                        <small>
                          {r.state === "down" ? "Stopped" : r.state === "degraded" ? "Running (degraded)" : riskLabel(r.score)}
                        </small>
                      </div>
                      <em>{r.score}%</em>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

/* ---------- breakdowns ---------- */

function BarsChart({ data }) {
  const w = 520, h = 160, pad = 24;
  const max = Math.max(1, ...data.map((d) => d.value));
  const bw = (w - pad * 2) / data.length;
  return (
    <svg className="chart-svg" viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Breakdowns per month">
      <line className="chart-grid" x1={pad} x2={w - pad} y1={h - pad} y2={h - pad} />
      {data.map((d, i) => {
        const bh = (d.value / max) * (h - pad * 2 - 14);
        const x = pad + i * bw + bw * 0.2;
        return (
          <g key={d.label + i}>
            <rect x={x} y={h - pad - bh} width={bw * 0.6} height={bh} rx="4" fill="#3b82f6" />
            <text className="chart-value" x={x + bw * 0.3} y={h - pad - bh - 5} textAnchor="middle">
              {d.value}
            </text>
            <text className="chart-axis" x={x + bw * 0.3} y={h - 7} textAnchor="middle">
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function Breakdowns({ risks, now }) {
  const sorted = useMemo(() => [...risks].sort((a, b) => b.score - a.score), [risks]);
  const [key, setKey] = useState(sorted[0]?.key);
  const r = risks.find((x) => x.key === key) || sorted[0];
  const monthly = useMemo(() => monthlyBreakdowns(r, now), [r, now]);
  const signals = [
    ["Breakdowns in the last 30 days", String(r.signals.recent)],
    ["Quality / scrap alerts in 21 days", String(r.signals.qs)],
    ["Tonnage since last breakdown", fmtKg(r.signals.kg)],
  ];

  return (
    <section className="commercial-section">
      <SectionHead
        eyebrow="BREAKDOWN PREDICTION"
        title="Which machine is next?"
        note="The chance that each machine breaks down soon. Pick a machine to see what drives it."
      />

      <div className="pred-tabs">
        <div className="chart-seg">
          {sorted.map((m) => (
            <button key={m.key} className={m.key === r.key ? "active" : ""} onClick={() => setKey(m.key)}>
              {m.name} · {m.score}%
            </button>
          ))}
        </div>
      </div>

      <div className="chart-grid-layout">
        <div className="chart-card">
          <div className="pred-row">
            <h3>{r.name}</h3>
            <Badge tone={riskTone(r.score)}>{riskLabel(r.score)}</Badge>
          </div>
          <div className="pred-score">
            <strong>{r.score}%</strong>
            <span>risk of breakdown soon</span>
          </div>
          <div className="stock-bar" aria-hidden="true">
            <div className="stock-bar-fill" style={{ width: `${r.score}%`, background: r.score >= RISK_ALERT ? "#D62828" : r.score >= RISK_WATCH ? "#f59e0b" : "#3AAA35" }} />
            <span className="stock-bar-min" style={{ left: `${RISK_ALERT}%` }} title={`Alert at ${RISK_ALERT}`} />
          </div>
          <p className="chart-note">
            Atelier {r.atelier} · {ATELIER_NAMES[r.atelier]}. The red marker is the alert threshold ({RISK_ALERT}%).
            {r.state !== "running" && " This machine already has an open breakdown."}
          </p>
          {r.part && (
            <p className="chart-note">
              Usual failing part: <b>{r.part}</b>
              {r.anomaly && <> · usual anomaly: <b>{r.anomaly}</b></>}
            </p>
          )}
        </div>

        <div className="chart-card">
          <h3>Why this score</h3>
          <div className="commercial-table-wrapper">
            <table className="commercial-table pred-compact">
              <thead>
                <tr>
                  <th>Signal</th>
                  <th>Value</th>
                  <th>Points</th>
                </tr>
              </thead>
              <tbody>
                {signals.map(([label, value], i) => (
                  <tr key={label}>
                    <td>{label}</td>
                    <td>{value}</td>
                    <td>
                      <strong>{r.pts[i]}</strong> / {WEIGHTS[i]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="chart-note">
            Main factor: <b>{FACTORS[r.main]}</b>. Downtime in the last 30 days: {fmtMinutes(r.downtime30)}.
          </p>
        </div>

        <div className="chart-card wide">
          <h3>Breakdowns per month on {r.name}</h3>
          <BarsChart data={monthly} />
        </div>
      </div>

      <div className="commercial-section-heading pred-gap">
        <h2>Past breakdowns on {r.name}</h2>
      </div>
      <div className="commercial-table-wrapper">
        <table className="commercial-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Failed part</th>
              <th>Anomaly</th>
              <th>Downtime</th>
            </tr>
          </thead>
          <tbody>
            {r.past.slice(0, 6).map((a) => (
              <tr key={a.id}>
                <td>{new Date(a.createdAt).toLocaleDateString([], { day: "2-digit", month: "short" })}</td>
                <td>{a.values?.organ || "—"}</td>
                <td>{a.values?.anomaly || "—"}</td>
                <td>{a.closedAt ? fmtMinutes((a.closedAt - a.createdAt) / 60000) : "Still open"}</td>
              </tr>
            ))}
            {r.past.length === 0 && (
              <tr>
                <td colSpan={4} className="empty-state">No breakdown recorded on this machine.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ---------- raw material ---------- */

const MAT_STATUS = {
  empty: { tone: "red", label: "Empty" },
  critical: { tone: "red", label: "Stops before resupply" },
  resupply: { tone: "amber", label: "Resupply now" },
  ok: { tone: "green", label: "Enough" },
  unknown: { tone: "gray", label: "Not enough data" },
};

function MaterialTab({ forecast }) {
  return (
    <section className="commercial-section">
      <SectionHead
        eyebrow="RAW MATERIAL"
        title="When will each line run out?"
        note="Run-out time = stock ÷ consumption over the last hour. We alert when it drops below 1 h plus the supplier lead time."
      />
      <div className="machine-grid">
        {forecast.map((f) => {
          const s = MAT_STATUS[f.status];
          const pct = Math.max(0, Math.min(100, (f.stockKg / f.capacityKg) * 100));
          const minPct = Math.max(0, Math.min(100, (f.minKg / f.capacityKg) * 100));
          return (
            <div className="machine-group" key={f.atelier}>
              <div className="pred-row">
                <h4>
                  Atelier {f.atelier} · {ATELIER_NAMES[f.atelier]}
                </h4>
                <Badge tone={s.tone}>{s.label}</Badge>
              </div>
              <p className="pred-material-name">{f.material}</p>
              <div className="pred-big">
                {f.runoutMin === null ? "—" : f.runoutMin === 0 ? "0 min" : fmtMinutes(f.runoutMin)}
                <small>left at the current pace</small>
              </div>
              <div className="stock-bar" aria-hidden="true">
                <div className="stock-bar-fill" style={{ width: `${pct}%`, background: s.tone === "red" ? "#D62828" : s.tone === "amber" ? "#f59e0b" : "#3AAA35" }} />
                <span className="stock-bar-min" style={{ left: `${minPct}%` }} />
              </div>
              <dl className="pred-facts">
                <div>
                  <dt>Stock</dt>
                  <dd>{fmtKg(f.stockKg)}</dd>
                </div>
                <div>
                  <dt>Usage</dt>
                  <dd>{f.kgH ? `${Math.round(f.kgH)} kg/h` : "—"}</dd>
                </div>
                <div>
                  <dt>Supplier lead time</dt>
                  <dd>{f.lead} min</dd>
                </div>
                <div>
                  <dt>Margin after resupply</dt>
                  <dd className={f.cushion !== null && f.cushion < 0 ? "bad" : ""}>
                    {f.cushion === null ? "—" : `${f.cushion < 0 ? "−" : ""}${fmtMinutes(Math.abs(f.cushion))}`}
                  </dd>
                </div>
              </dl>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ---------- schedule ---------- */

function Schedule({ alerts, semiFiniProducts, orders, risks, now }) {
  const [mode, setMode] = useState("ai");
  const [pan, setPan] = useState("");
  const [urgent, setUrgent] = useState(false);
  const [sent, setSent] = useState(false);

  const jobs = useMemo(
    () => [...wipJobs(semiFiniProducts), ...ordersToJobs(orders, now), ...(urgent ? [urgentOrder()] : [])],
    [semiFiniProducts, orders, now, urgent]
  );
  const opts = useMemo(
    () => ({ down: downMap(alerts, now, pan ? { [pan]: 240 } : {}), slow: slowMap(risks), prio: {} }),
    [alerts, now, pan, risks]
  );
  const ref = useMemo(() => stats(jobs, makePlan(jobs, "fifo", opts)), [jobs, opts]);
  const plan = useMemo(() => makePlan(jobs, mode, opts), [jobs, mode, opts]);
  const k = useMemo(() => stats(jobs, plan), [jobs, plan]);

  const span = Math.max(600, Math.ceil((k.end + 30) / 60) * 60);
  const P = (v) => Math.max(0, Math.min(100, (v / span) * 100));
  const ticks = [];
  for (let t = 0; t <= span; t += span > 1200 ? 360 : 180) ticks.push(t);

  const change = () => {
    setSent(false);
  };

  return (
    <section className="commercial-section">
      <SectionHead
        eyebrow="AI PLANNER"
        title="Production schedule"
        note="Each order follows its own route. For every step the AI picks the machine and order that protect departure deadlines first, then limit changeovers. Machines at high breakdown risk run 30% slower in the plan."
      />

      <div className="order-card">
        <div className="pred-toolbar">
          <div className="chart-seg">
            <button className={mode === "fifo" ? "active" : ""} onClick={() => { setMode("fifo"); change(); }}>
              Arrival order
            </button>
            <button className={mode === "ai" ? "active" : ""} onClick={() => { setMode("ai"); change(); }}>
              AI plan
            </button>
          </div>
          <label className="pred-select">
            <span>Breakdown on</span>
            <select value={pan} onChange={(e) => { setPan(e.target.value); change(); }}>
              <option value="">None</option>
              {MACHINE_LIST.map((m) => (
                <option key={m.n}>{m.n}</option>
              ))}
            </select>
          </label>
          <button className="btn-secondary pred-btn" disabled={urgent} onClick={() => { setUrgent(true); change(); }}>
            <Plus size={16} /> Add urgent order
          </button>
          {(urgent || pan) && (
            <button
              className="btn-secondary pred-btn"
              onClick={() => { setUrgent(false); setPan(""); setMode("ai"); change(); }}
            >
              <RotateCcw size={16} /> Reset
            </button>
          )}
        </div>

        <div className="pred-kpis">
          <div>
            <span>Total changeover time</span>
            <strong>{k.su} min</strong>
            {mode === "ai" ? <Delta value={k.su} base={ref.su} unit="min" /> : <small className="pred-delta">reference</small>}
          </div>
          <div>
            <span>Orders late</span>
            <strong>{k.n} of {jobs.length}</strong>
            {mode === "ai" ? <Delta value={k.n} base={ref.n} unit="" /> : <small className="pred-delta">reference</small>}
          </div>
          <div>
            <span>Total delay</span>
            <strong>{fmtMinutes(k.L)}</strong>
            {mode === "ai" ? <Delta value={k.L} base={ref.L} unit="min" /> : <small className="pred-delta">reference</small>}
          </div>
          <div>
            <span>Production ends</span>
            <strong>{clock(k.end, now)}</strong>
            <small className="pred-delta">in {fmtMinutes(k.end)}</small>
          </div>
        </div>

        <div className="pred-gantt-scroll">
          <div className="pred-gantt">
            <div className="pred-lane">
              <span />
              <div className="pred-axis">
                {ticks.map((t) => (
                  <i key={t} style={{ left: `${P(t)}%` }}>{t === 0 ? "now" : clock(t, now)}</i>
                ))}
              </div>
            </div>
            {MACHINE_LIST.map((m, j) => {
              const first = j === 0 || MACHINE_LIST[j - 1].a !== m.a;
              return (
                <div className={`pred-lane${first ? " first" : ""}`} key={m.n}>
                  <div className="pred-lane-label">
                    <strong>{m.n}</strong>
                    {first && <small>Atelier {m.a} · {ATELIER_NAMES[m.a]}</small>}
                  </div>
                  <div className="pred-track">
                    {opts.down[m.n] ? (
                      <i className="pn" style={{ left: 0, width: `${P(opts.down[m.n])}%` }}>Down</i>
                    ) : null}
                    {plan.filter((x) => x.j === j).map((x) => {
                      const job = jobs[x.i];
                      return (
                        <span key={`${x.i}-${x.a}`}>
                          {x.su > 0 && (
                            <i className="su" style={{ left: `${P(x.st)}%`, width: `${P(x.st + x.su) - P(x.st)}%` }} title={`Changeover ${x.su} min`} />
                          )}
                          <i
                            className="run"
                            style={{ left: `${P(x.rs)}%`, width: `${P(x.end) - P(x.rs)}%`, background: `hsl(${hueOf(x.i)} 55% 38%)` }}
                            title={`${job.id} · ${job.client}: ${clock(x.rs, now)} to ${clock(x.end, now)}`}
                          >
                            {job.id}
                          </i>
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="pred-legend">
          <span><i className="hatch" /> Changeover (cleaning, ink, width, format)</span>
          <span><i className="solid" /> Production, coloured by order</span>
          <span><i className="down" /> Machine down</span>
        </div>
      </div>

      <div className="dash-actions">
        <button className="btn-primary" onClick={() => setSent(true)}>
          <CheckCircle2 size={17} /> Approve and send to workshops
        </button>
      </div>
      {sent && (
        <div className="dash-empty pred-sent" role="status">
          <CheckCircle2 size={18} />
          Plan approved: {plan.length} production steps spread over {new Set(plan.map((x) => x.j)).size} machines.
          {k.n ? ` ${k.n} order(s) will still be late.` : " Every order is on time."}
        </div>
      )}
    </section>
  );
}
