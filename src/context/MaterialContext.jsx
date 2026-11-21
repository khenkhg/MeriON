import { createContext, useContext, useEffect, useState } from "react";
import { useAlerts } from "./AlertContext";
import {
  SYSTEM_USER,
  OTHER_RECIPIENTS,
  OTHERS_DELAY_SECONDS,
  RATE_MAX_WINDOW_MS,
  defaultStock,
  estimateDepletion,
} from "../data/material";

const MaterialContext = createContext(null);
const KEY = "merion_material";

const read = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    return {};
  }
};

const round1 = (n) => Math.round(n * 10) / 10;

export function MaterialProvider({ children }) {
  const { alerts, now, createAlert, closeAlert, addAlertTargets } = useAlerts();
  const [state, setState] = useState(read);

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(state));
  }, [state]);

  const getStock = (atelier) => ({ ...defaultStock(atelier), ...state[atelier] });

  /**
   * Single entry point for every change: applies it, then runs the threshold rules
   *  - stock <= minimum and no alert yet  -> automatic shortage alert, atelier first
   *  - stock back above the minimum       -> alert closed automatically
   */
  const commit = (atelier, change) => {
    const prev = getStock(atelier);
    let next = change(prev);
    const low = next.stockKg <= next.minKg;

    if (low && !next.alertId) {
      const alert = createAlert(
        "material",
        {
          atelier: String(atelier),
          material: next.material,
          level: next.stockKg <= 0 ? "Almost empty" : "Below critical threshold",
        },
        SYSTEM_USER,
        [`Atelier ${atelier}`] // atelier manager first, the others come later
      );
      next = { ...next, alertId: alert.id, alertAt: Date.now(), widened: false };
    } else if (!low && next.alertId) {
      closeAlert(next.alertId, SYSTEM_USER);
      next = { ...next, alertId: null, alertAt: null, widened: false };
    }

    next.depletionAt = estimateDepletion(next.stockKg, next.log);
    setState((s) => ({ ...s, [atelier]: next }));
  };

  // Called after every successful scan made by an atelier
  const recordProduction = (atelier, weightKg) =>
    commit(atelier, (s) => {
      const t = Date.now();
      const used = weightKg * s.ratio;
      return {
        ...s,
        productCount: s.productCount + 1,
        producedKg: s.producedKg + weightKg,
        stockKg: Math.max(0, round1(s.stockKg - used)),
        log: [...s.log, { t, kg: used }].filter((e) => t - e.t <= RATE_MAX_WINDOW_MS),
      };
    });

  const addStock = (atelier, kg) =>
    commit(atelier, (s) => {
      const stockKg = round1(s.stockKg + kg);
      return { ...s, stockKg, capacityKg: Math.max(s.capacityKg, stockKg) };
    });

  const updateSettings = (atelier, patch) => commit(atelier, (s) => ({ ...s, ...patch }));

  // After the grace delay, the rest of the people who need to know are notified too
  useEffect(() => {
    Object.entries(state).forEach(([n, s]) => {
      if (!s.alertId || s.widened || now - s.alertAt < OTHERS_DELAY_SECONDS * 1000) return;
      const alert = alerts.find((a) => a.id === s.alertId);
      if (alert && !alert.closedAt) addAlertTargets(s.alertId, OTHER_RECIPIENTS);
      setState((prev) => ({ ...prev, [n]: { ...prev[n], widened: true } }));
    });
  }, [now]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <MaterialContext.Provider value={{ getStock, recordProduction, addStock, updateSettings }}>
      {children}
    </MaterialContext.Provider>
  );
}

export function useMaterial() {
  return useContext(MaterialContext);
}
