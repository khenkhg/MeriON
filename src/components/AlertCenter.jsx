import { useState } from "react";
import {
  BellRing,
  X,
  Wrench,
  Package,
  Users,
  TrendingDown,
  AlertTriangle,
  RotateCcw,
  Clock,
  Timer,
  Send,
  CheckCircle2,
  ArrowUpRight,
  Volume2,
  VolumeX,
  Bell,
  BellOff,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useAlerts } from "../context/AlertContext";
import { getAtelierNumber } from "../data/ateliers";
import {
  ALERT_ROLES,
  ALERT_TYPES,
  ESCALATION_OPTIONS,
  TYPE_BY_ID,
  URGENCY_LABELS,
  formatDuration,
  getOptions,
  resolveTargets,
  alertsForUser,
} from "../data/alerts";

const ICONS = {
  breakdown: Wrench,
  material: Package,
  staff: Users,
  scrap: TrendingDown,
  quality: AlertTriangle,
  return: RotateCcw,
  dwell_nc: Clock,
  dwell_semi: Timer,
};

/* ------------------------------------------------------------------ */
/* One alert (inbox = actions, sent = read-only status)               */
/* ------------------------------------------------------------------ */
function AlertCard({ alert, mode }) {
  const { user } = useAuth();
  const { now, escalationSeconds, acknowledgeAlert, closeAlert } = useAlerts();

  const Icon = ICONS[alert.typeId] || AlertTriangle;
  const isOpen = !alert.closedAt;
  const elapsed = Math.max(0, (alert.closedAt || now) - alert.createdAt);
  const remaining = Math.max(0, escalationSeconds * 1000 - elapsed);

  return (
    <article
      className={`alert-card ${alert.escalatedAt ? "is-escalated" : ""} ${isOpen ? "" : "is-closed"}`}
    >
      <div className="alert-card-head">
        <div className="alert-card-icon">
          <Icon size={18} />
        </div>
        <div className="alert-card-title">
          <strong>{alert.title}</strong>
          <span>
            From {alert.createdBy.name} · {alert.createdBy.role}
          </span>
        </div>
        {alert.urgency && (
          <span className={`alert-urgency urgency-${alert.urgency}`}>
            {URGENCY_LABELS[alert.urgency]}
          </span>
        )}
      </div>

      <dl className="alert-details">
        {alert.details.map((d) => (
          <div key={d.label}>
            <dt>{d.label}</dt>
            <dd>{d.value}</dd>
          </div>
        ))}
      </dl>

      <div className="alert-timer-row">
        <span className="alert-timer">
          <Timer size={14} />
          {alert.tracksDowntime ? "Downtime" : "Elapsed"}
          <strong>{formatDuration(elapsed)}</strong>
        </span>

        {!isOpen ? (
          <span className="alert-status closed">
            <CheckCircle2 size={13} /> Closed
          </span>
        ) : alert.escalatedAt ? (
          <span className="alert-status escalated">
            <ArrowUpRight size={13} /> Escalated to Director
          </span>
        ) : alert.acknowledgedAt ? (
          <span className="alert-status taken">Taken in charge</span>
        ) : (
          <span className="alert-status waiting">
            Escalates in {formatDuration(remaining)}
          </span>
        )}
      </div>

      {mode === "inbox" && isOpen && (
        <div className="alert-actions">
          {!alert.acknowledgedAt && (
            <button className="btn-primary alert-btn" onClick={() => acknowledgeAlert(alert.id, user)}>
              Take charge
            </button>
          )}
          <button className="btn-secondary alert-btn" onClick={() => closeAlert(alert.id, user)}>
            <CheckCircle2 size={14} />
            {alert.closeLabel}
          </button>
        </div>
      )}

      {mode === "sent" && (
        <p className="alert-meta">
          Sent to {alert.targets.join(", ")}
          {alert.acknowledgedBy && ` · taken by ${alert.acknowledgedBy.name}`}
          {alert.closedBy && ` · closed by ${alert.closedBy.name}`}
        </p>
      )}

      {mode === "inbox" && alert.acknowledgedBy && isOpen && (
        <p className="alert-meta">Taken by {alert.acknowledgedBy.name}</p>
      )}
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* New alert form: dropdowns only, no free text                       */
/* ------------------------------------------------------------------ */
function NewAlertForm({ onSent }) {
  const { user } = useAuth();
  const { createAlert, escalationSeconds } = useAlerts();

  const [typeId, setTypeId] = useState("");
  const [values, setValues] = useState({});

  const type = TYPE_BY_ID[typeId];
  const myAtelier = getAtelierNumber(user.role);

  const chooseType = (id) => {
    setTypeId(id);
    const t = TYPE_BY_ID[id];
    // Atelier accounts get their own workshop pre-selected
    const hasWorkshop = t?.fields.some((f) => f.key === "atelier");
    setValues(hasWorkshop && myAtelier ? { atelier: String(myAtelier) } : {});
  };

  const setValue = (key, val) =>
    setValues((prev) => {
      const next = { ...prev, [key]: val };
      type.fields.forEach((f) => {
        if (f.needs === key) delete next[f.key]; // reset dependent dropdowns
      });
      return next;
    });

  const complete = type && type.fields.every((f) => values[f.key]);
  const escLabel = ESCALATION_OPTIONS.find((o) => o.seconds === escalationSeconds)?.label
    || `${Math.round(escalationSeconds / 60)} min`;

  const submit = (e) => {
    e.preventDefault();
    if (!complete) return;
    createAlert(typeId, values, user);
    setTypeId("");
    setValues({});
    onSent();
  };

  return (
    <form className="alert-form" onSubmit={submit}>
      <label className="alert-field">
        <span>What happened?</span>
        <select value={typeId} onChange={(e) => chooseType(e.target.value)}>
          <option value="">Select an event...</option>
          {ALERT_TYPES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </label>

      {type && (
        <>
          <p className="alert-hint">{type.description}</p>

          {type.id === "breakdown" && (
            <p className="alert-hint strong">Requested by {user.name}</p>
          )}

          {type.fields.map((f) => {
            const blocked = f.needs && !values[f.needs];
            return (
              <label className="alert-field" key={f.key}>
                <span>{f.label}</span>
                <select
                  value={values[f.key] || ""}
                  disabled={blocked}
                  onChange={(e) => setValue(f.key, e.target.value)}
                >
                  <option value="">{blocked ? "Select a workshop first" : "Select..."}</option>
                  {getOptions(f, values).map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            );
          })}

          <div className="alert-route">
            <strong>Will notify</strong>
            <span>{resolveTargets(type, values, user).join(" · ")}</span>
            <small>
              Escalates to the Director if nobody takes charge within {escLabel}.
            </small>
          </div>
        </>
      )}

      <button type="submit" className="alert-send" disabled={!complete}>
        <Send size={16} />
        Send alert
      </button>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Floating red button + small window                                 */
/* ------------------------------------------------------------------ */
function NotifySettings() {
  const { soundEnabled, toggleSound } = useAlerts();
  const supported = typeof Notification !== "undefined";
  const [perm, setPerm] = useState(supported ? Notification.permission : "unsupported");

  const enable = async () => {
    const result = await Notification.requestPermission();
    setPerm(result);
    if (result === "granted") {
      new Notification("MeriON notifications enabled", {
        body: "You will be notified as soon as a new alert reaches you.",
      });
    }
  };

  return (
    <div className="alert-settings">
      <button type="button" onClick={toggleSound} className={soundEnabled ? "on" : ""}>
        {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
        Sound {soundEnabled ? "on" : "off"}
      </button>

      {perm === "granted" ? (
        <span className="alert-settings-ok">
          <Bell size={14} /> Desktop notifications on
        </span>
      ) : perm === "denied" ? (
        <span className="alert-settings-off" title="Allow notifications in your browser's site settings">
          <BellOff size={14} /> Blocked in browser
        </span>
      ) : supported ? (
        <button type="button" onClick={enable}>
          <Bell size={14} /> Enable desktop notifications
        </button>
      ) : (
        <span className="alert-settings-off">
          <BellOff size={14} /> Not supported
        </span>
      )}
    </div>
  );
}

export default function AlertCenter() {
  const { user } = useAuth();
  const {
    alerts,
    escalationSeconds,
    setEscalationSeconds,
    panelOpen: open,
    setPanelOpen: setOpen,
    panelTab: tab,
    setPanelTab: setTab,
  } = useAlerts();

  if (!user || !ALERT_ROLES.includes(user.role)) return null;

  const openFirst = (list) =>
    [...list].sort((a, b) => Number(!!a.closedAt) - Number(!!b.closedAt));

  const received = openFirst(alertsForUser(alerts, user));
  const sent = openFirst(alerts.filter((a) => a.createdBy.email === user.email));

  const pending = received.filter((a) => !a.closedAt);
  const unacknowledged = pending.filter((a) => !a.acknowledgedAt);

  return (
    <>
      {open && (
        <section className="alert-panel" role="dialog" aria-label="Alert center">
          <header className="alert-panel-header">
            <div>
              <span className="eyebrow">ALERT CENTER</span>
              <h3>Real-time alerts</h3>
            </div>
            <button className="alert-close" onClick={() => setOpen(false)} aria-label="Close">
              <X size={18} />
            </button>
          </header>

          <div className="alert-tabs">
            <button className={tab === "inbox" ? "active" : ""} onClick={() => setTab("inbox")}>
              Inbox{pending.length > 0 && <em>{pending.length}</em>}
            </button>
            <button className={tab === "sent" ? "active" : ""} onClick={() => setTab("sent")}>
              Sent
            </button>
            <button className={tab === "new" ? "active" : ""} onClick={() => setTab("new")}>
              New alert
            </button>
          </div>

          <div className="alert-body">
            {tab === "inbox" &&
              (received.length ? (
                received.map((a) => <AlertCard key={a.id} alert={a} mode="inbox" />)
              ) : (
                <p className="alert-empty">No alerts for you right now.</p>
              ))}

            {tab === "sent" &&
              (sent.length ? (
                sent.map((a) => <AlertCard key={a.id} alert={a} mode="sent" />)
              ) : (
                <p className="alert-empty">You haven't sent any alert yet.</p>
              ))}

            {tab === "new" && <NewAlertForm onSent={() => setTab("sent")} />}
          </div>

          <NotifySettings />
          <footer className="alert-panel-footer">
            <span>Escalation delay</span>
            <select
              value={escalationSeconds}
              onChange={(e) => setEscalationSeconds(Number(e.target.value))}
            >
              {ESCALATION_OPTIONS.map((o) => (
                <option key={o.seconds} value={o.seconds}>
                  {o.label}
                </option>
              ))}
            </select>
          </footer>
        </section>
      )}

      <button
        className={`alert-fab ${unacknowledged.length ? "is-ringing" : ""}`}
        onClick={() => setOpen((o) => !o)}
        aria-label="Open alerts"
      >
        <BellRing size={20} />
        <span>Alerts</span>
        {pending.length > 0 && <em className="alert-fab-badge">{pending.length}</em>}
      </button>
    </>
  );
}
