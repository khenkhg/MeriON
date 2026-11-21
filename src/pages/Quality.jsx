import { useState } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  PackageX,
  Truck,
  Boxes,
  Plus,
  Undo2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import {
  useConformity,
  STAGES,
  CLIENTS,
  stageLabel,
} from "../data/conformity";

const nf = new Intl.NumberFormat("en-US");
const fmt = (n) => nf.format(n);
const pct = (a, b) => (b ? ((a / b) * 100).toFixed(1) : "0.0");

const FILTERS = [
  { id: "all", label: "All" },
  { id: "production", label: "During production" },
  { id: "client", label: "After delivery" },
];

export default function Quality() {
  const { lots, declarations, totals, byStage, declare, cancel } =
    useConformity();

  const [filter, setFilter] = useState("all");
  const [form, setForm] = useState({
    lotId: "",
    stage: "1",
    client: "",
    qty: "",
    reason: "",
  });
  const [msg, setMsg] = useState(null); // { ok, text }

  const set = (key) => (e) => {
    setMsg(null);
    setForm((f) => ({ ...f, [key]: e.target.value }));
  };

  const atClient = form.stage === "client";
  const selectedLot = lots.find((l) => l.id === form.lotId);
  const maxQty = selectedLot
    ? atClient
      ? selectedLot.maxClient
      : selectedLot.maxProduction
    : null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const res = declare(form);
    if (res.ok) {
      setMsg({ ok: true, text: "Non conformity recorded." });
      setForm((f) => ({ ...f, qty: "", reason: "" }));
    } else {
      setMsg({ ok: false, text: res.error });
    }
  };

  const visible = declarations.filter((d) => {
    if (filter === "client") return String(d.stage) === "client";
    if (filter === "production") return String(d.stage) !== "client";
    return true;
  });

  const lotName = (id) => lots.find((l) => l.id === id)?.product ?? id;
  const maxStageQty = Math.max(1, ...byStage.map((s) => s.qty));

  return (
    <main className="commercial-page">
      <header className="commercial-header">
        <div>
          <span className="eyebrow">
            <span className="status-dot" />
            QUALITY MANAGEMENT
          </span>
          <h1>Conformity</h1>
          <p>
            Every product starts conforme at the first atelier. Record the ones
            that turn non conforme so they leave the available count, and track
            those declared after they reached the client.
          </p>
        </div>
      </header>

      {/* KPIs */}
      <section className="commercial-stats four">
        <div className="commercial-stat-card">
          <div className="commercial-stat-icon green">
            <ShieldCheck size={24} />
          </div>
          <span>Produced (conforme at start)</span>
          <strong>{fmt(totals.produced)}</strong>
          <small>{fmt(totals.delivered)} delivered to clients</small>
        </div>

        <div className="commercial-stat-card">
          <div className="commercial-stat-icon red">
            <PackageX size={24} />
          </div>
          <span>Non conforme in production</span>
          <strong>{fmt(totals.ncProduction)}</strong>
          <small>
            {pct(totals.ncProduction, totals.produced)}% of production, removed
            from the count
          </small>
        </div>

        <div className="commercial-stat-card">
          <div className="commercial-stat-icon blue">
            <Boxes size={24} />
          </div>
          <span>Available conforme</span>
          <strong>{fmt(totals.available)}</strong>
          <small>Produced - delivered - non conforme</small>
        </div>

        <div className="commercial-stat-card">
          <div className="commercial-stat-icon amber">
            <Truck size={24} />
          </div>
          <span>Non conforme after delivery</span>
          <strong>{fmt(totals.ncClient)}</strong>
          <small>
            {pct(totals.ncClient, totals.delivered)}% of delivered units
          </small>
        </div>
      </section>

      {/* Where they become non conforme + lots */}
      <section className="commercial-section">
        <div className="commercial-section-heading">
          <span className="eyebrow">WHERE IT HAPPENS</span>
          <h2>Non conforme units by stage</h2>
        </div>

        <div className="chart-card">
          <ul className="hbars">
            {byStage.map((s) => (
              <li key={s.id}>
                <span className="hbars-label" title={s.label}>
                  {s.label}
                </span>
                <span className="hbars-track">
                  <span
                    className="hbars-fill"
                    style={{
                      display: "block",
                      width: `${(s.qty / maxStageQty) * 100}%`,
                      background:
                        s.id === "client" ? "#E59A00" : "var(--alert-red)",
                    }}
                  />
                </span>
                <span className="hbars-value">{fmt(s.qty)}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="commercial-section">
        <div className="commercial-section-heading">
          <span className="eyebrow">BY LOT</span>
          <h2>Conformity per lot</h2>
        </div>

        <div className="commercial-table-wrapper">
          <table className="commercial-table">
            <thead>
              <tr>
                <th>Lot</th>
                <th>Product</th>
                <th>Produced</th>
                <th>NC in production</th>
                <th>Delivered</th>
                <th>NC after delivery</th>
                <th>Available</th>
                <th>NC rate</th>
              </tr>
            </thead>
            <tbody>
              {lots.map((l) => (
                <tr key={l.id}>
                  <td>
                    <strong>{l.id}</strong>
                  </td>
                  <td>{l.product}</td>
                  <td>{fmt(l.produced)}</td>
                  <td>{fmt(l.ncProduction)}</td>
                  <td>{fmt(l.delivered)}</td>
                  <td>{fmt(l.ncClient)}</td>
                  <td>
                    <strong>{fmt(l.available)}</strong>
                  </td>
                  <td>
                    <span
                      className={`pred-badge ${
                        l.ncRate >= 5 ? "red" : l.ncRate >= 2 ? "amber" : "green"
                      }`}
                    >
                      {l.ncRate.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Declare form */}
      <section className="commercial-section">
        <div className="commercial-section-heading">
          <span className="eyebrow">DECLARE</span>
          <h2>Record a non conformity</h2>
        </div>

        <form className="order-card" onSubmit={handleSubmit}>
          <div className="qa-form">
            <label className="order-field">
              <span>Lot</span>
              <select value={form.lotId} onChange={set("lotId")} required>
                <option value="">Select a lot…</option>
                {lots.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.id} - {l.product}
                  </option>
                ))}
              </select>
            </label>

            <label className="order-field">
              <span>Where was it found?</span>
              <select value={form.stage} onChange={set("stage")}>
                {STAGES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>

            {atClient && (
              <label className="order-field">
                <span>Client</span>
                <select value={form.client} onChange={set("client")} required>
                  <option value="">Select a client…</option>
                  {CLIENTS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label className="order-field">
              <span>
                Quantity
                {maxQty !== null && (
                  <em className="qa-max"> (max {fmt(maxQty)})</em>
                )}
              </span>
              <input
                type="number"
                min="1"
                max={maxQty ?? undefined}
                value={form.qty}
                onChange={set("qty")}
                placeholder="0"
                required
              />
            </label>

            <label className="order-field qa-wide">
              <span>Reason (optional)</span>
              <input
                type="text"
                value={form.reason}
                onChange={set("reason")}
                placeholder="Leave empty if unknown"
              />
            </label>
          </div>

          <p className="order-note">
            {atClient ? (
              <>
                These units already reached the client: they are{" "}
                <b>tracked as returns</b> and do not change the available
                count.
              </>
            ) : (
              <>
                These units will be <b>removed from the available count</b>{" "}
                immediately.
              </>
            )}
          </p>

          <div className="ord-actions">
            <button type="submit" className="btn-primary">
              <Plus size={18} /> Declare non conforme
            </button>
            {msg && (
              <span className={`ord-msg ${msg.ok ? "ok" : "error"}`} role="status">
                {msg.ok ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                {msg.text}
              </span>
            )}
          </div>
        </form>
      </section>

      {/* History */}
      <section className="commercial-section">
        <div className="commercial-section-heading dash-heading">
          <div>
            <span className="eyebrow">HISTORY</span>
            <h2>Declarations</h2>
          </div>

          <div className="chart-seg" role="tablist">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={filter === f.id}
                className={filter === f.id ? "active" : ""}
                onClick={() => setFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="commercial-table-wrapper">
          <table className="commercial-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Lot</th>
                <th>Product</th>
                <th>Qty</th>
                <th>Found at</th>
                <th>Client</th>
                <th>Reason</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 ? (
                <tr>
                  <td className="empty-state" colSpan={8}>
                    <ShieldAlert size={18} /> No declarations here yet.
                  </td>
                </tr>
              ) : (
                visible.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <span className="scan-time">
                        {new Date(d.date).toLocaleString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </td>
                    <td>
                      <strong>{d.lotId}</strong>
                    </td>
                    <td>{lotName(d.lotId)}</td>
                    <td>
                      <strong>{fmt(d.qty)}</strong>
                    </td>
                    <td>
                      <span
                        className={`pred-badge ${
                          String(d.stage) === "client" ? "amber" : "red"
                        }`}
                      >
                        {stageLabel(d.stage)}
                      </span>
                    </td>
                    <td>{d.client || "-"}</td>
                    <td>{d.reason}</td>
                    <td>
                      <button
                        type="button"
                        className="btn-outline ord-cancel"
                        onClick={() => cancel(d.id)}
                        title="Undo: these units count as conforme again"
                      >
                        <Undo2 size={14} /> Undo
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
