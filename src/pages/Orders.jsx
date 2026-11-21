import { useState } from "react";
import {
  PackagePlus,
  ClipboardList,
  Scale,
  CalendarClock,
  Trash2,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  XCircle,
  ArrowRight,
  Package,
  Weight,
  Boxes,
  Timer,
} from "lucide-react";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import { useAlerts } from "../context/AlertContext";
import { useBarcode } from "../context/BarcodeContext";
import { useOrders } from "../context/OrderContext";
import { machineStatuses } from "../data/alerts";
import { CATALOG, estimateOrder, formatEta } from "../data/catalog";
import { CLIENTS, canCreateOrders } from "../data/orders";
import { fmtKg } from "../data/analytics";

const H = 3600000;

// The availability check always shows plain kg (e.g. "1,250 kg")
const fmtKgExact = (n) => `${Math.round(n).toLocaleString()} kg`;

// Date + time in the format <input type="datetime-local"> expects, in local time
const toLocalInput = (ms) => {
  const d = new Date(ms);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

const fmtDeparture = (ms) =>
  new Date(ms).toLocaleString([], { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

export default function Orders() {
  const { user } = useAuth();
  const { alerts, now } = useAlerts();
  const { products, semiFiniProducts } = useBarcode();
  const { orders, addOrder, cancelOrder } = useOrders();
  const canCreate = canCreateOrders(user.role);

  const [form, setForm] = useState(() => ({
    client: CLIENTS[0],
    ref: CATALOG[0].ref,
    qty: "",
    unit: "kg",
    departure: toLocalInput(Date.now() + 24 * H),
  }));
  const [msg, setMsg] = useState(null);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const product = CATALOG.find((p) => p.ref === form.ref);

  const sorted = [...orders].sort((a, b) => a.departureAt - b.departureAt);
  const totalKg = orders.reduce((s, o) => s + o.kg, 0);
  const next = sorted[0];

  // ---- Availability check (updates live while the quantity is typed)
  const quantityKg = Number(form.qty) * (form.unit === "t" ? 1000 : 1);
  const valid = form.qty !== "" && Number.isFinite(quantityKg) && quantityKg > 0;

  // workshops with a machine currently down slow the estimate
  const downWorkshops = new Set(
    machineStatuses(alerts).filter((m) => m.status === "down").map((m) => m.atelier)
  );

  const est = valid
    ? estimateOrder({ product, quantityKg, products, semiFiniProducts, downWorkshops })
    : null;

  const readyAt = est && est.etaHours > 0
    ? new Date(Date.now() + est.etaHours * H).toLocaleString([], {
        weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
      })
    : null;

  const banner =
    est?.status === "available"
      ? { cls: "scan-success", Icon: CheckCircle2, title: "Available right now", text: `${form.client} can be served immediately from stock.` }
      : est?.status === "partial"
      ? { cls: "scan-warning", Icon: AlertTriangle, title: "Partially available", text: `${fmtKgExact(est.stock)} can ship now. The remaining ${fmtKgExact(est.missing)} will be ready in about ${formatEta(est.etaHours)}.` }
      : est
      ? { cls: "scan-error", Icon: XCircle, title: "Not in stock", text: `Production is needed. Estimated ready in about ${formatEta(est.etaHours)}.` }
      : null;

  const submit = (e) => {
    e.preventDefault();
    const departureAt = new Date(form.departure).getTime();

    if (!valid) {
      setMsg({ ok: false, text: "Enter a quantity above 0." });
      return;
    }
    if (!Number.isFinite(departureAt) || departureAt <= Date.now()) {
      setMsg({ ok: false, text: "The departure time must be in the future." });
      return;
    }

    const order = addOrder({ client: form.client, ref: form.ref, kg: quantityKg, departureAt }, user);
    setMsg({ ok: true, text: `${order.id} created for ${order.client}. It is now part of the production plan.` });
  };

  const cancel = (o) => {
    if (window.confirm(`Cancel ${o.id} (${o.client}, ${fmtKg(o.kg)})? It will be removed from the production plan.`)) {
      cancelOrder(o.id);
    }
  };

  return (
    <>
      <Navbar />
      <main className="commercial-page">
        <header className="commercial-header">
          <div>
            <span className="eyebrow">{user.role.toUpperCase()} / ORDERS</span>
            <h1>Orders</h1>
            <p>
              {canCreate
                ? "Check instantly whether an order can ship, then place it with a departure time. The production plan and the AI predictions pick it up straight away."
                : "Customer orders waiting to be produced, sorted by departure time. Only the Commercial Manager can create or cancel them."}
            </p>
          </div>
        </header>

        <div className="commercial-stats">
          <div className="commercial-stat-card">
            <div className="commercial-stat-icon green"><ClipboardList size={22} /></div>
            <span>Open orders</span>
            <strong>{orders.length}</strong>
            <small>waiting to be produced</small>
          </div>
          <div className="commercial-stat-card">
            <div className="commercial-stat-icon blue"><Scale size={22} /></div>
            <span>Total quantity</span>
            <strong>{fmtKg(totalKg)}</strong>
            <small>across all open orders</small>
          </div>
          <div className="commercial-stat-card">
            <div className="commercial-stat-icon amber"><CalendarClock size={22} /></div>
            <span>Next departure</span>
            <strong>{next ? formatEta(Math.max(0, next.departureAt - now) / H) : "—"}</strong>
            <small>{next ? `${next.id} · ${next.client}` : "no open order"}</small>
          </div>
        </div>

        {canCreate && (
          <section className="commercial-section">
            <div className="commercial-section-heading">
              <span className="eyebrow">NEW ORDER</span>
              <h2>Check and place an order</h2>
            </div>

            <form className="order-card" onSubmit={submit}>
              <div className="order-form ord-form">
                <label className="order-field">
                  <span>Client</span>
                  <select value={form.client} onChange={set("client")}>
                    {CLIENTS.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </label>

                <label className="order-field">
                  <span>Product</span>
                  <select value={form.ref} onChange={set("ref")}>
                    {CATALOG.map((p) => (
                      <option key={p.ref} value={p.ref}>{p.ref} · {p.name}</option>
                    ))}
                  </select>
                </label>

                <div className="order-field">
                  <span>Quantity</span>
                  <div className="order-qty">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      inputMode="decimal"
                      placeholder="e.g. 500"
                      aria-label="Quantity"
                      value={form.qty}
                      onChange={set("qty")}
                      required
                    />
                    <select value={form.unit} onChange={set("unit")} aria-label="Unit">
                      <option value="kg">kg</option>
                      <option value="t">t</option>
                    </select>
                  </div>
                </div>

                <label className="order-field">
                  <span>Departure</span>
                  <input type="datetime-local" value={form.departure} onChange={set("departure")} required />
                </label>
              </div>

              <p className="order-route">
                Production route:
                {product.route.map((n, i) => (
                  <span key={n}>
                    {i > 0 && <ArrowRight size={13} />}
                    <b className={downWorkshops.has(n) ? "down" : ""}>Atelier {n}</b>
                  </span>
                ))}
              </p>

              {!est && (
                <p className="order-placeholder">Type a quantity to see if it can ship right now.</p>
              )}

              {est && (
                <>
                  <div className={`scan-result ${banner.cls}`}>
                    <banner.Icon size={24} />
                    <div>
                      <strong>{banner.title}</strong>
                      <p>{banner.text}</p>
                    </div>
                  </div>

                  <div className="scanned-product">
                    <div>
                      <Package size={17} />
                      <span>{form.client} wants</span>
                      <strong>{fmtKgExact(quantityKg)}</strong>
                    </div>
                    <div>
                      <Boxes size={17} />
                      <span>In stock ({product.ref})</span>
                      <strong>{fmtKgExact(est.stock)}</strong>
                    </div>
                    <div>
                      <Weight size={17} />
                      <span>Still missing</span>
                      <strong>{est.missing > 0 ? fmtKgExact(est.missing) : "None"}</strong>
                    </div>
                    <div>
                      <Timer size={17} />
                      <span>Ready in</span>
                      <strong>{est.etaHours > 0 ? `≈ ${formatEta(est.etaHours)}` : "Now"}</strong>
                    </div>
                  </div>

                  {readyAt && <p className="order-note">Estimated ready around <b>{readyAt}</b>.</p>}
                  {est.wipUsed > 0 && (
                    <p className="order-note">The estimate includes products already in production.</p>
                  )}
                  {est.blocked.length > 0 && (
                    <p className="order-note warn">
                      A machine is down at {est.blocked.map((n) => `Atelier ${n}`).join(", ")}: the
                      estimate includes a delay.
                    </p>
                  )}
                </>
              )}

              <div className="ord-actions">
                <button type="submit" className="btn-primary">
                  <PackagePlus size={17} /> Place order
                </button>
                {msg && (
                  <p className={`ord-msg ${msg.ok ? "ok" : "error"}`} role="status">
                    {msg.ok ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                    {msg.text}
                  </p>
                )}
              </div>
            </form>
          </section>
        )}

        <section className="commercial-section">
          <div className="commercial-section-heading">
            <span className="eyebrow">OPEN ORDERS</span>
            <h2>Orders to produce</h2>
          </div>

          <div className="commercial-table-wrapper">
            <table className="commercial-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Product</th>
                  <th>Route</th>
                  <th>Quantity</th>
                  <th>Departure</th>
                  {canCreate && <th></th>}
                </tr>
              </thead>
              <tbody>
                {sorted.map((o) => {
                  const p = CATALOG.find((x) => x.ref === o.ref);
                  const left = o.departureAt - now;
                  return (
                    <tr key={o.id}>
                      <td>
                        <strong>{o.id}</strong>
                        <br />
                        <small className="pred-sub">{o.client}</small>
                      </td>
                      <td>
                        {o.ref}
                        <br />
                        <small className="pred-sub">{p?.name}</small>
                      </td>
                      <td>
                        <div className="pred-route">
                          {(p?.route || []).map((a) => <b key={a}>A{a}</b>)}
                        </div>
                      </td>
                      <td>{fmtKg(o.kg)}</td>
                      <td>
                        {fmtDeparture(o.departureAt)}
                        <br />
                        <small className={`pred-sub ord-due${left <= 0 ? " late" : ""}`}>
                          {left <= 0 ? "Departure time passed" : `in ${formatEta(left / H)}`}
                        </small>
                      </td>
                      {canCreate && (
                        <td>
                          <button type="button" className="btn-secondary ord-cancel" onClick={() => cancel(o)}>
                            <Trash2 size={14} /> Cancel
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
                {sorted.length === 0 && (
                  <tr>
                    <td colSpan={canCreate ? 6 : 5} className="empty-state">
                      No open orders.{canCreate ? " Place the first one above." : ""}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </>
  );
}
