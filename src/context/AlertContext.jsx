import { createContext, useContext, useEffect, useState } from "react";
import {
  TYPE_BY_ID,
  DEFAULT_ESCALATION_SECONDS,
  optionLabel,
  resolveTargets,
} from "../data/alerts";

const AlertContext = createContext(null);

const ALERTS_KEY = "merion_alerts";
const ESC_KEY = "merion_escalation_seconds";
const SOUND_KEY = "merion_alert_sound";

const readAlerts = () => {
  try {
    return JSON.parse(localStorage.getItem(ALERTS_KEY)) || [];
  } catch {
    return [];
  }
};

const who = (user) => ({ id: user.id, name: user.name, role: user.role, email: user.email });

export function AlertProvider({ children }) {
  const [alerts, setAlerts] = useState(readAlerts);
  const [escalationSeconds, setEscalationState] = useState(
    () => Number(localStorage.getItem(ESC_KEY)) || DEFAULT_ESCALATION_SECONDS
  );
  const [soundEnabled, setSoundEnabled] = useState(
    () => localStorage.getItem(SOUND_KEY) !== "off"
  );
  const [now, setNow] = useState(Date.now());

  // Alert window, shared so the red bar can open it from any page
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelTab, setPanelTab] = useState("inbox");

  const openPanel = (tab = "inbox") => {
    setPanelTab(tab);
    setPanelOpen(true);
  };

  const toggleSound = () => {
    setSoundEnabled((on) => {
      localStorage.setItem(SOUND_KEY, on ? "off" : "on");
      return !on;
    });
  };

  // 1-second clock for all chronometers
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    localStorage.setItem(ALERTS_KEY, JSON.stringify(alerts));
  }, [alerts]);

  // Live sync between browser windows
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === ALERTS_KEY) setAlerts(readAlerts());
      if (e.key === ESC_KEY) {
        setEscalationState(Number(e.newValue) || DEFAULT_ESCALATION_SECONDS);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Escalate alerts nobody took charge of in time
  useEffect(() => {
    const limit = escalationSeconds * 1000;
    const isDue = (a) =>
      !a.acknowledgedAt && !a.closedAt && !a.escalatedAt && now - a.createdAt >= limit;

    if (alerts.some(isDue)) {
      setAlerts((prev) => prev.map((a) => (isDue(a) ? { ...a, escalatedAt: now } : a)));
    }
  }, [now, alerts, escalationSeconds]);

  const setEscalationSeconds = (seconds) => {
    localStorage.setItem(ESC_KEY, String(seconds));
    setEscalationState(seconds);
  };

  // targetRoles (optional) overrides the default recipients of the alert type
  // extraDetails (optional) adds { label, value } lines to the alert (e.g. who is absent)
  const createAlert = (typeId, values, user, targetRoles = null, extraDetails = []) => {
    const type = TYPE_BY_ID[typeId];

    const alert = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      typeId,
      title: type.label,
      values, // raw selections (used for machine states on the dashboards)
      details: [
        ...type.fields.map((f) => ({ label: f.label, value: optionLabel(f, values) })),
        ...extraDetails,
      ],
      urgency: values.urgency || null,
      tracksDowntime: !!type.tracksDowntime,
      closeLabel: type.closeLabel || "Mark as resolved",
      targets: targetRoles || resolveTargets(type, values, user),
      createdBy: who(user),
      createdAt: Date.now(),
      acknowledgedAt: null,
      acknowledgedBy: null,
      closedAt: null,
      closedBy: null,
      escalatedAt: null,
    };

    setAlerts((prev) => [alert, ...prev]);
    return alert;
  };

  // Notify more roles after the alert was created (staged notification)
  const addAlertTargets = (id, roles) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, targets: [...new Set([...a.targets, ...roles])] } : a))
    );
  };

  const acknowledgeAlert = (id, user) => {
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === id && !a.acknowledgedAt
          ? { ...a, acknowledgedAt: Date.now(), acknowledgedBy: who(user) }
          : a
      )
    );
  };

  const closeAlert = (id, user) => {
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === id && !a.closedAt
          ? {
              ...a,
              acknowledgedAt: a.acknowledgedAt || Date.now(),
              acknowledgedBy: a.acknowledgedBy || who(user),
              closedAt: Date.now(),
              closedBy: who(user),
            }
          : a
      )
    );
  };

  return (
    <AlertContext.Provider
      value={{
        alerts,
        now,
        escalationSeconds,
        setEscalationSeconds,
        soundEnabled,
        toggleSound,
        panelOpen,
        setPanelOpen,
        panelTab,
        setPanelTab,
        openPanel,
        createAlert,
        addAlertTargets,
        acknowledgeAlert,
        closeAlert,
      }}
    >
      {children}
    </AlertContext.Provider>
  );
}

export function useAlerts() {
  return useContext(AlertContext);
}
