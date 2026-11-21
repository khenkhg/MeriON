import { Link, useNavigate } from "react-router-dom";
import {
  PackageCheck, Weight, Factory, Bell, AlertTriangle, Wrench, Timer, Users,
  ShieldCheck, Truck, Boxes, Inbox, ArrowRight, CheckCircle2, ScanBarcode, ClipboardList, PackageX,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useBarcode } from "../context/BarcodeContext";
import { useAlerts } from "../context/AlertContext";
import { getAtelierNumber, ATELIER_NAMES } from "../data/ateliers";
import { alertsForUser, machineStatuses, mttrMinutes, formatDuration } from "../data/alerts";
import AtelierStockPanel from "../components/AtelierStockPanel";
import { useConformity } from "../data/conformity";

const detail = (a, label) => a.details.find((d) => d.label === label)?.value || "—";
const tons = (kg) => `${(kg / 1000).toFixed(2)} t`;

/* ---------- small building blocks (reuse the Commercial page styles) ---------- */

function Stat({ icon: Icon, tone = "green", label, value, hint }) {
  return (
    <article className="commercial-stat-card">
      <div className={`commercial-stat-icon ${tone}`}>
        <Icon size={24} />
      </div>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{hint}</small>
    </article>
  );
}

function Section({ eyebrow, title, action, children }) {
  return (
    <section className="commercial-section">
      <div className="commercial-section-heading dash-heading">
        <div>
          <span className="eyebrow">{eyebrow}</span>
          <h2>{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function AlertList({ list, now, onOpen, empty = "No open alerts. All clear." }) {
  if (list.length === 0) {
    return (
      <div className="dash-empty">
        <CheckCircle2 size={18} /> {empty}
      </div>
    );
  }
  return (
    <div className="dash-alerts">
      {list.slice(0, 6).map((a) => (
        <button key={a.id} className={`dash-alert ${a.escalatedAt ? "is-escalated" : ""}`} onClick={onOpen}>
          <div className="dash-alert-icon"><AlertTriangle size={18} /></div>
          <div className="dash-alert-main">
            <strong>{a.title}</strong>
            <span>{a.details.slice(0, 3).map((d) => d.value).join(" · ")}</span>
          </div>
          {a.escalatedAt ? (
            <span className="alert-status escalated">Escalated</span>
          ) : a.acknowledgedAt ? (
            <span className="alert-status taken">Taken in charge</span>
          ) : (
            <span className="alert-status waiting">Waiting</span>
          )}
          <span className="dash-alert-timer"><Timer size={13} />{formatDuration(now - a.createdAt)}</span>
        </button>
      ))}
    </div>
  );
}

function MachineGrid({ machines, now }) {
  const groups = [...new Set(machines.map((m) => m.atelier))];
  const label = { running: "Running", degraded: "Degraded", down: "Down" };
  return (
    <div className="machine-grid">
      {groups.map((n) => (
        <div className="machine-group" key={n}>
          <h4>Atelier {n} · {ATELIER_NAMES[n]}</h4>
          <div className="machine-tiles">
            {machines.filter((m) => m.atelier === n).map((m) => (
              <div className={`machine-tile ${m.status}`} key={m.name}>
                <span className="machine-dot" />
                <div>
                  <strong>{m.name}</strong>
                  <small>{label[m.status]}</small>
                </div>
                {m.status === "down" && <em>{formatDuration(now - m.alert.createdAt)}</em>}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ProductsTable({ products, empty = "No products yet." }) {
  return (
    <div className="commercial-table-wrapper">
      <table className="commercial-table">
        <thead>
          <tr><th>Product</th><th>Client</th><th>Machine</th><th>Weight</th><th>Scanned at</th></tr>
        </thead>
        <tbody>
          {products.slice(0, 5).map((p) => (
            <tr key={p.productCode}>
              <td><strong>{p.productCode}</strong></td>
              <td>{p.clientName}</td>
              <td>{p.machineName}</td>
              <td>{p.weightKg} kg</td>
              <td><span className="scan-time">{new Date(p.scannedAt).toLocaleTimeString()}</span></td>
            </tr>
          ))}
          {products.length === 0 && (
            <tr><td colSpan="5" className="empty-state">{empty}</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function ClientBars({ clients }) {
  const max = Math.max(1, ...clients.map((c) => c.totalWeight));
  if (clients.length === 0) return <div className="dash-empty">No conforming products yet.</div>;
  return (
    <div className="client-bars">
      {clients.slice(0, 6).map((c) => (
        <div className="client-bar" key={c.clientName}>
          <div className="client-bar-top">
            <strong>{c.clientName}</strong>
            <span>{c.productCount} products · {tons(c.totalWeight)}</span>
          </div>
          <div className="progress"><div style={{ width: `${(c.totalWeight / max) * 100}%` }} /></div>
        </div>
      ))}
    </div>
  );
}

/* ---------- Quality Manager: conformity shortcut + counters ---------- */

function ConformityBlock() {
  const { totals } = useConformity();
  const n = (v) => v.toLocaleString("en-US");
  return (
    <>
      <div className="dash-cta">
        <div>
          <strong>Conformity follow-up</strong>
          <span>Declare products that turned non conforme and track the ones found at the client.</span>
        </div>
        <Link to="/quality" className="btn-white">Open conformity <ArrowRight size={17} /></Link>
      </div>

      <section className="commercial-stats">
        <Stat icon={PackageX} tone="red" label="Non conforme in production" value={n(totals.ncProduction)} hint="Removed from the available count" />
        <Stat icon={Boxes} tone="blue" label="Available conforme" value={n(totals.available)} hint="Produced - delivered - non conforme" />
        <Stat icon={Truck} tone="amber" label="Non conforme after delivery" value={n(totals.ncClient)} hint="Found once at the client" />
      </section>
    </>
  );
}

/* ---------- the dashboard ---------- */

export default function Dashboard() {
  const { user } = useAuth();
  const { products, semiFiniProducts } = useBarcode();
  const { alerts, now, openPanel } = useAlerts();

  const navigate = useNavigate();
  const role = user.role;
  const myAtelier = getAtelierNumber(role);
  const openMine = () => openPanel("inbox");

  const machines = machineStatuses(alerts);
  const down = machines.filter((m) => m.status === "down");
  const degraded = machines.filter((m) => m.status === "degraded");
  const mine = alertsForUser(alerts, user).filter((a) => !a.closedAt);
  const allOpen = alerts.filter((a) => !a.closedAt);
  const totalKg = products.reduce((s, p) => s + p.weightKg, 0);
  const mttr = mttrMinutes(alerts);
  const countType = (list, ...ids) => list.filter((a) => ids.includes(a.typeId)).length;

  const clients = Object.values(
    products.reduce((acc, p) => {
      acc[p.clientName] ||= { clientName: p.clientName, productCount: 0, totalWeight: 0 };
      acc[p.clientName].productCount++;
      acc[p.clientName].totalWeight += p.weightKg;
      return acc;
    }, {})
  ).sort((a, b) => b.totalWeight - a.totalWeight);

  const alertsBlock = (list = mine, eyebrow = "YOUR ALERTS", title = "Needs your attention") => (
    <Section eyebrow={eyebrow} title={title}>
      <AlertList list={list} now={now} onOpen={openMine} />
    </Section>
  );

  const latestBlock = (
    <Section
      eyebrow="LATEST ACTIVITY"
      title="Latest completed products"
    >
      <ProductsTable products={products} />
    </Section>
  );

  let view;

  if (role === "Production Manager") {
    view = {
      subtitle: "Completed production, machine status and open alerts.",
      action: <Link to="/barcode" className="btn-primary"><ScanBarcode size={17} /> Open scanner</Link>,
      stats: [
        { icon: PackageCheck, label: "Completed products", value: products.length, hint: "Registered as conforming" },
        { icon: Weight, tone: "blue", label: "Completed tonnage", value: tons(totalKg), hint: "Total net weight" },
        { icon: Wrench, tone: down.length ? "red" : "green", label: "Machines down", value: down.length, hint: `of ${machines.length} machines` },
        { icon: Bell, tone: mine.length ? "red" : "green", label: "Open alerts", value: mine.length, hint: "Waiting for action" },
      ],
      body: (
        <>
          <Section eyebrow="MACHINES" title="Machine status"><MachineGrid machines={machines} now={now} /></Section>
          {alertsBlock()}
          {latestBlock}
        </>
      ),
    };
  } else if (role === "Commercial Manager") {
    view = {
      subtitle: "Available tonnage, clients and incoming alerts.",
      action: <Link to="/orders" className="btn-primary"><ClipboardList size={17} /> Check an order</Link>,
      stats: [
        { icon: PackageCheck, label: "Conforming products", value: products.length, hint: "Ready in stock" },
        { icon: Weight, tone: "blue", label: "Available tonnage", value: tons(totalKg), hint: "Total conforming net weight" },
        { icon: Factory, label: "Active clients", value: clients.length, hint: "Clients with scanned products" },
        { icon: Bell, tone: mine.length ? "red" : "green", label: "Open alerts", value: mine.length, hint: "Waiting for action" },
      ],
      body: (
        <>
          <div className="dash-cta">
            <div>
              <strong>A client is on the phone?</strong>
              <span>Type the quantity and instantly see if it can ship, or how long production needs.</span>
            </div>
            <Link to="/orders" className="btn-white">Check availability <ArrowRight size={17} /></Link>
          </div>
          <Section eyebrow="CLIENT BREAKDOWN" title="Tonnage ready by client"><ClientBars clients={clients} /></Section>
          {alertsBlock()}
        </>
      ),
    };
  } else if (role === "DG") {
    const escalated = allOpen.filter((a) => a.escalatedAt).length;
    view = {
      subtitle: "Plant-wide view: production, machines, flows and escalations.",
      stats: [
        { icon: Weight, tone: "blue", label: "Completed tonnage", value: tons(totalKg), hint: `${products.length} conforming products` },
        { icon: Wrench, tone: down.length ? "red" : "green", label: "Machines down", value: down.length, hint: `${degraded.length} degraded · ${machines.length} total` },
        { icon: Bell, tone: escalated ? "red" : "green", label: "Open alerts", value: allOpen.length, hint: `${escalated} escalated to you` },
        { icon: Timer, tone: "blue", label: "Average repair time", value: mttr ? `${mttr} min` : "—", hint: "Closed breakdowns" },
      ],
      body: (
        <>
          {alertsBlock(allOpen, "ALL OPEN ALERTS", "Across the plant")}
          <Section eyebrow="MACHINES" title="Machine status"><MachineGrid machines={machines} now={now} /></Section>
          <Section eyebrow="PRODUCTION FLOW" title="Semi-fini products between workshops">
            <div className="commercial-table-wrapper">
              <table className="commercial-table">
                <thead><tr><th>Workshop</th><th>Waiting products</th><th>Waiting tonnage</th><th>Machines down</th></tr></thead>
                <tbody>
                  {[1, 2, 3, 4, 5].map((n) => {
                    const waiting = semiFiniProducts.filter((p) => p.nextAtelier === n);
                    return (
                      <tr key={n}>
                        <td><strong>Atelier {n} · {ATELIER_NAMES[n]}</strong></td>
                        <td>{waiting.length}</td>
                        <td>{tons(waiting.reduce((s, p) => s + p.weightKg, 0))}</td>
                        <td>{down.filter((m) => m.atelier === n).length}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Section>
        </>
      ),
    };
  } else if (role === "Quality Manager") {
    view = {
      subtitle: "Conforming output and quality-related alerts.",
      action: <Link to="/quality" className="btn-primary"><ShieldCheck size={17} /> Open conformity</Link>,
      stats: [
        { icon: ShieldCheck, label: "Conforming products", value: products.length, hint: "Registered as conforming" },
        { icon: AlertTriangle, tone: countType(mine, "quality", "scrap") ? "red" : "green", label: "Defects & scrap alerts", value: countType(mine, "quality", "scrap"), hint: "Open right now" },
        { icon: Inbox, tone: "blue", label: "Returned products", value: countType(mine, "return"), hint: "Awaiting analysis" },
        { icon: Timer, tone: "blue", label: "Excessive stay", value: countType(mine, "dwell_nc"), hint: "Non-conforming in stock" },
      ],
      body: (<><ConformityBlock />{alertsBlock()}{latestBlock}</>),
    };
  } else if (role === "HR Manager") {
    const staff = mine.filter((a) => a.typeId === "staff");
    const missing = staff.reduce((s, a) => s + (parseInt(detail(a, "Missing"), 10) || 0), 0);
    view = {
      subtitle: "Staff shortages on the lines, to reassign quickly.",
      stats: [
        { icon: Users, tone: staff.length ? "red" : "green", label: "Open shortages", value: staff.length, hint: "Lines waiting for staff" },
        { icon: Factory, label: "Workshops affected", value: new Set(staff.map((a) => detail(a, "Workshop"))).size, hint: "Out of 5" },
        { icon: Users, tone: "blue", label: "Operators missing", value: missing, hint: "Total to reassign" },
        { icon: CheckCircle2, label: "Resolved", value: countType(alerts.filter((a) => a.closedAt), "staff"), hint: "Shortages closed" },
      ],
      body: (
        <Section eyebrow="STAFFING" title="Open shortages">
          <div className="commercial-table-wrapper">
            <table className="commercial-table">
              <thead><tr><th>Workshop</th><th>Team</th><th>Machine</th><th>Missing</th><th>Waiting</th></tr></thead>
              <tbody>
                {staff.map((a) => (
                  <tr key={a.id}>
                    <td><strong>{detail(a, "Workshop")}</strong></td>
                    <td>{detail(a, "Team")}</td>
                    <td>{detail(a, "Machine")}</td>
                    <td>{detail(a, "Missing")}</td>
                    <td><span className="scan-time"><Timer size={13} />{formatDuration(now - a.createdAt)}</span></td>
                  </tr>
                ))}
                {staff.length === 0 && <tr><td colSpan="5" className="empty-state">No shortage reported.</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="dash-actions"><button className="btn-secondary" onClick={openMine}><Bell size={16} /> Open alert center</button></div>
        </Section>
      ),
    };
  } else if (role === "Maintenance Manager") {
    view = {
      subtitle: "Machines out of service and intervention requests.",
      stats: [
        { icon: Wrench, tone: down.length ? "red" : "green", label: "Machines down", value: down.length, hint: `of ${machines.length} machines` },
        { icon: AlertTriangle, tone: "blue", label: "Degraded", value: degraded.length, hint: "Running with a fault" },
        { icon: Bell, tone: mine.filter((a) => !a.acknowledgedAt).length ? "red" : "green", label: "To take in charge", value: mine.filter((a) => !a.acknowledgedAt).length, hint: "Unacknowledged requests" },
        { icon: Timer, tone: "blue", label: "Average repair time", value: mttr ? `${mttr} min` : "—", hint: "Closed breakdowns" },
      ],
      body: (
        <>
          {alertsBlock(mine, "INTERVENTION REQUESTS", "Open requests")}
          <Section eyebrow="MACHINES" title="Machine status"><MachineGrid machines={machines} now={now} /></Section>
        </>
      ),
    };
  } else if (role === "Logistics Manager") {
    view = {
      subtitle: "Tonnage ready to ship and supply alerts.",
      stats: [
        { icon: Truck, tone: "blue", label: "Tonnage ready", value: tons(totalKg), hint: "Conforming, ready to ship" },
        { icon: Factory, label: "Clients waiting", value: clients.length, hint: "With products in stock" },
        { icon: Boxes, tone: countType(mine, "material") ? "red" : "green", label: "Material shortages", value: countType(mine, "material"), hint: "Open right now" },
        { icon: Timer, tone: "blue", label: "Excessive stay", value: countType(mine, "dwell_nc"), hint: "Stock alerts" },
      ],
      body: (
        <>
          <Section eyebrow="SHIPPING" title="Tonnage ready by client"><ClientBars clients={clients} /></Section>
          {alertsBlock()}
        </>
      ),
    };
  } else if (myAtelier) {
    const incoming = semiFiniProducts.filter((p) => p.nextAtelier === myAtelier);
    const myMachines = machines.filter((m) => m.atelier === myAtelier);
    view = {
      subtitle: `Atelier ${myAtelier} · ${ATELIER_NAMES[myAtelier]}: incoming products, your machines and alerts.`,
      action: <Link to="/barcode" className="btn-primary"><ScanBarcode size={17} /> Open scanner</Link>,
      stats: [
        { icon: Inbox, label: "Waiting for you", value: incoming.length, hint: "Semi-fini products" },
        { icon: Weight, tone: "blue", label: "Waiting tonnage", value: tons(incoming.reduce((s, p) => s + p.weightKg, 0)), hint: "Net weight to process" },
        { icon: Wrench, tone: myMachines.some((m) => m.status === "down") ? "red" : "green", label: "Machines down", value: myMachines.filter((m) => m.status === "down").length, hint: `of ${myMachines.length} in your workshop` },
        { icon: Bell, tone: mine.length ? "red" : "green", label: "Open alerts", value: mine.length, hint: "Waiting for action" },
      ],
      body: (
        <>
          <Section eyebrow="RAW MATERIAL" title="Stock & autonomy"><AtelierStockPanel atelier={myAtelier} /></Section>
          <Section eyebrow="YOUR MACHINES" title="Machine status"><MachineGrid machines={myMachines} now={now} /></Section>
          <Section eyebrow="INCOMING" title="Semi-fini products waiting for you">
            <div className="commercial-table-wrapper">
              <table className="commercial-table">
                <thead><tr><th>Product</th><th>Client</th><th>Weight</th><th>From</th></tr></thead>
                <tbody>
                  {incoming.slice(0, 5).map((p) => (
                    <tr
                      key={p.productCode}
                      className="row-link"
                      tabIndex={0}
                      role="link"
                      title="Open the barcode scanner"
                      onClick={() => navigate("/barcode")}
                      onKeyDown={(e) => e.key === "Enter" && navigate("/barcode")}
                    >
                      <td><strong>{p.productCode}</strong></td>
                      <td>{p.clientName}</td>
                      <td>{p.weightKg} kg</td>
                      <td>Atelier {p.history[p.history.length - 1]?.atelier}</td>
                    </tr>
                  ))}
                  {incoming.length === 0 && <tr><td colSpan="4" className="empty-state">Nothing waiting for this atelier.</td></tr>}
                </tbody>
              </table>
            </div>
          </Section>
          {alertsBlock()}
        </>
      ),
    };
  } else {
    view = {
      subtitle: "Your account has no dedicated workspace yet.",
      stats: [],
      body: <div className="dash-empty"><CheckCircle2 size={18} /> Ask an administrator to assign you a role.</div>,
    };
  }

  const firstName = user.name.split(" ")[0];

  return (
    <main className="commercial-page">
      <header className="commercial-header">
        <div>
          <span className="eyebrow">{role.toUpperCase()} / DASHBOARD</span>
          <h1>Welcome back, {firstName}</h1>
          <p>{view.subtitle}</p>
        </div>
        <div className="dash-header-right">
          <span className="connection-status connected"><span className="status-dot" /> Live data</span>
          {view.action}
        </div>
      </header>

      {view.stats.length > 0 && (
        <section className="commercial-stats four">
          {view.stats.map((s) => <Stat key={s.label} {...s} />)}
        </section>
      )}

      {view.body}
    </main>
  );
}
