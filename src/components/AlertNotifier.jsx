import { useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useAlerts } from "../context/AlertContext";
import { ALERT_ROLES, alertsForUser } from "../data/alerts";
import { playAlertSound } from "../utils/alertSound";

/**
 * Invisible component: fires the real notifications.
 *  - browser/OS notification (Notification API)
 *  - alarm sound
 *  - "(2) MeriON" counter in the tab title
 * It only reacts to NEW alerts (or new escalations) after the page is loaded.
 */
export default function AlertNotifier() {
  const { user } = useAuth();
  const { alerts, soundEnabled, openPanel } = useAlerts();

  const seen = useRef(null);
  const baseTitle = useRef(document.title || "MeriON");

  const eligible = !!user && ALERT_ROLES.includes(user.role);
  const mine = eligible ? alertsForUser(alerts, user).filter((a) => !a.closedAt) : [];

  // forget what was seen when another account logs in
  useEffect(() => {
    seen.current = null;
  }, [user?.email]);

  useEffect(() => {
    if (!eligible) return;

    const known = new Set();
    const fresh = [];

    mine.forEach((a) => {
      known.add(a.id);
      if (a.escalatedAt) known.add(`${a.id}:esc`);

      if (seen.current) {
        if (!seen.current.has(a.id)) {
          fresh.push({ alert: a, escalated: !!a.escalatedAt });
        } else if (a.escalatedAt && !seen.current.has(`${a.id}:esc`)) {
          fresh.push({ alert: a, escalated: true });
        }
      }
    });

    const firstRun = seen.current === null;
    seen.current = known;
    if (firstRun || fresh.length === 0) return;

    if (soundEnabled) playAlertSound(fresh.some((f) => f.escalated));

    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      fresh.forEach(({ alert, escalated }) => {
        try {
          const n = new Notification(
            escalated ? `ESCALATED: ${alert.title}` : `New alert: ${alert.title}`,
            {
              body:
                alert.details.slice(0, 4).map((d) => d.value).join(" · ") +
                `\nFrom ${alert.createdBy.name}`,
              tag: escalated ? `${alert.id}:esc` : alert.id,
              requireInteraction: escalated || alert.urgency === "very_urgent",
            }
          );
          n.onclick = () => {
            window.focus();
            openPanel("inbox");
            n.close();
          };
        } catch {
          /* some browsers only allow notifications from a service worker */
        }
      });
    }
  }, [alerts, eligible]); // eslint-disable-line react-hooks/exhaustive-deps

  // tab title counter
  useEffect(() => {
    document.title = mine.length ? `(${mine.length}) ${baseTitle.current}` : baseTitle.current;
    return () => {
      document.title = baseTitle.current;
    };
  }, [mine.length]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
