// Rule-based predictions computed from the app's own data (alerts, scans, stock).
// Scores and minutes are shown instead of invented probabilities: the weights below are
// starting values to calibrate with real plant data, not a trained model.
import { MACHINES } from "./alerts";
import { consumptionRate } from "./material";
import { bucketStarts } from "./analytics";

const MIN = 60000, DAY = 86400000;

export const RISK_ALERT = 70;   // "imminent": maintenance should inspect
export const RISK_WATCH = 40;
export const WEAR_REF_KG = 4000; // tonnage per machine after which wear counts fully
export const LEAD_MIN = { 1: 45, 2: 60, 3: 45, 4: 30, 5: 30 }; // DEMO: supplier lead time per atelier

export const PREDICTION_ROLES = ["DG", "Production Manager", "Maintenance Manager", "Logistics Manager"];
export const hasPredictions = (role) => PREDICTION_ROLES.includes(role);

// Which tabs each role sees
export const TABS_BY_ROLE = {
  DG: ["overview", "breakdowns", "material", "schedule"],
  "Production Manager": ["overview", "breakdowns", "material", "schedule"],
  "Maintenance Manager": ["overview", "breakdowns"],
  "Logistics Manager": ["overview", "material", "schedule"],
};

const WEIGHTS = [40, 35, 25];
export const FACTORS = [
  "breakdowns repeating on this machine",
  "quality / scrap alerts on this machine",
  "tonnage since the last breakdown",
];

const modeOf = (list) => {
  const c = {};
  list.forEach((x) => x && (c[x] = (c[x] || 0) + 1));
  return Object.entries(c).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
};

/* ---------------- breakdown risk ---------------- */

export function machineRisks(alerts, events, now) {
  const out = [];
  Object.entries(MACHINES).forEach(([n, names]) =>
    names.forEach((name) => {
      const atelier = Number(n);
      const past = alerts
        .filter((a) => a.typeId === "breakdown" && a.values?.atelier === n && a.values?.machine === name)
        .sort((a, b) => b.createdAt - a.createdAt);
      const open = past.find((a) => !a.closedAt) || null;

      const recent = past.filter((a) => now - a.createdAt <= 30 * DAY).length;
      const qs = alerts.filter(
        (a) => (a.typeId === "quality" || a.typeId === "scrap") &&
          a.values?.atelier === n && a.values?.machine === name && now - a.createdAt <= 21 * DAY
      ).length;
      const lastEnd = past.reduce((m, a) => Math.max(m, a.closedAt || a.createdAt), 0) || now - 90 * DAY;
      const kg = events.filter((e) => e.atelier === atelier && e.at > lastEnd).reduce((s, e) => s + e.kg, 0) / names.length;

      const parts = [Math.min(recent / 3, 1), Math.min(qs / 3, 1), Math.min(kg / WEAR_REF_KG, 1)];
      const pts = parts.map((p, i) => Math.round(p * WEIGHTS[i]));
      const score = Math.round(parts.reduce((s, p, i) => s + p * WEIGHTS[i], 0));
      const main = parts.map((p, i) => p * WEIGHTS[i]).indexOf(Math.max(...parts.map((p, i) => p * WEIGHTS[i])));

      out.push({
        key: `${n}:${name}`, name, atelier, open, past,
        state: open ? (open.values.state === "degraded" ? "degraded" : "down") : "running",
        score, pts, main,
        signals: { recent, qs, kg: Math.round(kg) },
        part: modeOf(past.map((a) => a.values.organ)),
        anomaly: modeOf(past.map((a) => a.values.anomaly)),
        downtime30: Math.round(
          past.filter((a) => now - a.createdAt <= 30 * DAY).reduce((s, a) => s + ((a.closedAt || now) - a.createdAt), 0) / MIN
        ),
      });
    })
  );
  return out;
}

// Breakdowns per month for one machine (last 6 months)
export function monthlyBreakdowns(risk, now) {
  const starts = bucketStarts("6m", now);
  return starts.map((s, i) => ({
    label: new Date(s).toLocaleDateString(undefined, { month: "short" }),
    value: risk.past.filter((a) => a.createdAt >= s && a.createdAt < (starts[i + 1] ?? Infinity)).length,
  }));
}

/* ---------------- raw material run-out ---------------- */

export function materialForecast(getStock, now) {
  return [1, 2, 3, 4, 5].map((atelier) => {
    const s = getStock(atelier);
    const perMs = consumptionRate(s.log, now);
    const kgH = perMs ? perMs * 3600000 : null;
    const runoutMin = s.stockKg <= 0 ? 0 : kgH ? (s.stockKg / kgH) * 60 : null;
    const lead = LEAD_MIN[atelier];
    const threshold = 60 + lead; // alert when the stock lasts less than 1 h + the supplier lead time
    const status =
      s.stockKg <= 0 ? "empty"
      : runoutMin === null ? "unknown"
      : runoutMin < lead ? "critical"
      : runoutMin < threshold ? "resupply"
      : "ok";
    return { atelier, ...s, kgH, runoutMin, lead, threshold, status, cushion: runoutMin === null ? null : runoutMin - lead };
  });
}
