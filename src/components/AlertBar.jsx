import { useNavigate, useLocation } from "react-router-dom";
import { AlertTriangle, ArrowUpRight } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useAlerts } from "../context/AlertContext";
import { ALERT_ROLES, alertsForUser, formatDuration } from "../data/alerts";

// Red bar right under the navbar while the user has open alerts.
export default function AlertBar() {
  const { user } = useAuth();
  const { alerts, now, openPanel } = useAlerts();
  const navigate = useNavigate();
  const location = useLocation();

  if (!user || !ALERT_ROLES.includes(user.role)) return null;

  const pending = alertsForUser(alerts, user).filter((a) => !a.closedAt);
  if (pending.length === 0) return null;

  const rank = (a) =>
    (a.escalatedAt ? 4 : 0) + (a.urgency === "very_urgent" ? 2 : 0) + (a.acknowledgedAt ? 0 : 1);
  const top = [...pending].sort((a, b) => rank(b) - rank(a) || b.createdAt - a.createdAt)[0];
  const escalated = pending.some((a) => a.escalatedAt);

  const view = () => {
    openPanel("inbox");
    if (location.pathname !== "/") navigate("/");
  };

  return (
    <div className={`alert-bar ${escalated ? "is-escalated" : ""}`} role="alert">
      <span className="alert-bar-dot" />
      <AlertTriangle size={17} />
      <strong>{escalated ? "ESCALATED ALERT" : "ACTIVE ALERT"}</strong>

      <span className="alert-bar-text">
        {top.title}
        <em>{top.details.slice(0, 3).map((d) => d.value).join(" · ")}</em>
      </span>

      <span className="alert-bar-timer">{formatDuration(now - top.createdAt)}</span>
      {pending.length > 1 && <span className="alert-bar-count">+{pending.length - 1} more</span>}

      <button className="alert-bar-btn" onClick={view}>
        View <ArrowUpRight size={15} />
      </button>
    </div>
  );
}
