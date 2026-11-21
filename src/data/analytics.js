// Pure helpers that turn the app's data (completed products, semi-fini products, alerts)
// into chart-ready series. No React in here.

import { ATELIER_ROLES } from "./ateliers";
import { CATALOG, productRef } from "./catalog";

const HOUR = 3600000;

export const RANGES = [
  { id: "24h", label: "24 h" },
  { id: "7d", label: "7 days" },
  { id: "6m", label: "6 months" },
];

export const ATELIER_COLORS = { 1: "#3AAA35", 2: "#3b82f6", 3: "#f59e0b", 4: "#8b5cf6", 5: "#f43f5e" };
export const PALETTE = ["#3AAA35", "#3b82f6", "#f59e0b", "#8b5cf6", "#f43f5e", "#14b8a6", "#64748b"];

/* ---------- time buckets ---------- */

export function bucketStarts(range, now = Date.now()) {
  const d = new Date(now);
  const starts = [];
  if (range === "24h") {
    const base = new Date(d);
    base.setMinutes(0, 0, 0);
    for (let i = 23; i >= 0; i--) starts.push(base.getTime() - i * HOUR);
  } else if (range === "7d") {
    const base = new Date(d);
    base.setHours(0, 0, 0, 0);
    for (let i = 6; i >= 0; i--) {
      const x = new Date(base);
      x.setDate(x.getDate() - i);
      starts.push(x.getTime());
    }
  } else {
    for (let i = 5; i >= 0; i--) starts.push(new Date(d.getFullYear(), d.getMonth() - i, 1).getTime());
  }
  return starts;
}

function bucketEnd(range, last) {
  if (range === "24h") return last + HOUR;
  const x = new Date(last);
  if (range === "7d") x.setDate(x.getDate() + 1);
  else x.setMonth(x.getMonth() + 1);
  return x.getTime();
}

function bucketLabel(range, start) {
  const d = new Date(start);
  if (range === "24h") return `${String(d.getHours()).padStart(2, "0")}h`;
  if (range === "7d") return d.toLocaleDateString(undefined, { weekday: "short" });
  return d.toLocaleDateString(undefined, { month: "short" });
}

export const rangeStart = (range, now) => bucketStarts(range, now)[0];

/* ---------- production ---------- */

// One event per atelier step recorded in the product histories
export function outputEvents(products, semiFiniProducts) {
  const events = [];
  [...products, ...semiFiniProducts].forEach((p) =>
    (p.history || []).forEach((h) => {
      const at = Date.parse(h.at);
      if (Number.isFinite(at)) events.push({ atelier: h.atelier, kg: h.weightKg, at });
    })
  );
  return events;
}

const measure = (list, metric) => (metric === "kg" ? list.reduce((s, e) => s + e.kg, 0) : list.length);

export function trendSeries(events, range, now, metric, atelier = null) {
  const starts = bucketStarts(range, now);
  const bounds = [...starts, bucketEnd(range, starts[starts.length - 1])];
  return starts.map((s, i) => ({
    label: bucketLabel(range, s),
    value: measure(
      events.filter((e) => e.at >= s && e.at < bounds[i + 1] && (!atelier || e.atelier === atelier)),
      metric
    ),
  }));
}

export function shareByAtelier(events, range, now, metric) {
  const from = rangeStart(range, now);
  return [1, 2, 3, 4, 5].map((n) => ({
    label: `Atelier ${n}`,
    atelier: n,
    color: ATELIER_COLORS[n],
    value: measure(events.filter((e) => e.atelier === n && e.at >= from), metric),
  }));
}

// Semi-fini products waiting in front of each workshop (bottleneck detector)
export function wipByAtelier(semiFiniProducts) {
  return [1, 2, 3, 4, 5].map((n) => {
    const waiting = semiFiniProducts.filter((p) => p.nextAtelier === n);
    return { atelier: n, count: waiting.length, kg: waiting.reduce((s, p) => s + p.weightKg, 0) };
  });
}

export function clientShare(products) {
  const map = {};
  products.forEach((p) => (map[p.clientName] = (map[p.clientName] || 0) + p.weightKg));
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .map(([label, value], i) => ({ label, value, color: PALETTE[i % PALETTE.length] }));
}

/* ---------- alerts ---------- */

export function downtimeByAtelier(alerts, range, now) {
  const from = rangeStart(range, now);
  return [1, 2, 3, 4, 5].map((n) => ({
    label: `A${n}`,
    value:
      alerts
        .filter((a) => a.typeId === "breakdown" && a.createdAt >= from && a.values?.atelier === String(n))
        .reduce((s, a) => s + ((a.closedAt || now) - a.createdAt), 0) / 60000,
  }));
}

export function breakdownsByMachine(alerts, range, now, limit = 6) {
  const from = rangeStart(range, now);
  const map = {};
  alerts
    .filter((a) => a.typeId === "breakdown" && a.createdAt >= from && a.values)
    .forEach((a) => {
      const key = `A${a.values.atelier} · ${a.values.machine}`;
      map[key] ||= { label: key, count: 0, minutes: 0 };
      map[key].count++;
      map[key].minutes += ((a.closedAt || now) - a.createdAt) / 60000;
    });
  return Object.values(map).sort((a, b) => b.count - a.count || b.minutes - a.minutes).slice(0, limit);
}

export function alertsByType(alerts, range, now, typeIds = null) {
  const from = rangeStart(range, now);
  const map = {};
  alerts
    .filter((a) => a.createdAt >= from && (!typeIds || typeIds.includes(a.typeId)))
    .forEach((a) => (map[a.title] = (map[a.title] || 0) + 1));
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ label, count }));
}

/* ---------- commercial: ready stock, orders, clients ---------- */

const OTHER = "Other";
const MIX_COLORS = PALETTE.slice(0, 6); // up to 6 products, the 7th palette colour is for "Other"
const OTHER_COLOR = PALETTE[6];

const startOfDay = (t) => {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d;
};

const shiftDays = (date, n) => {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
};

const shortWeekday = (d) => d.toLocaleDateString([], { weekday: "short", day: "numeric" });

// Same matching as the order checker (productRef): "P-574-007" -> catalog item P-574.
// Codes that are not in the catalog (e.g. a hand-typed label) give undefined.
const productOf = (code) => CATALOG.find((p) => p.ref === productRef(code));

/** One event per completed product, in the shape trendSeries() expects. */
export function readyEvents(products) {
  return products
    .map((p) => ({
      kg: p.weightKg,
      at: Date.parse(p.scannedAt),
      name: productOf(p.productCode)?.name ?? OTHER,
    }))
    .filter((e) => Number.isFinite(e.at));
}

/** Product mix of the selected period, as donut slices (top 6 + Other). -> [{ label, value, color }] */
export function readyMix(events, range, now, metric) {
  const from = rangeStart(range, now);
  const totals = new Map();

  for (const e of events) {
    if (e.at < from) continue;
    totals.set(e.name, (totals.get(e.name) || 0) + (metric === "kg" ? e.kg : 1));
  }

  const named = [...totals].filter(([name]) => name !== OTHER).sort((a, b) => b[1] - a[1]);
  const data = named.slice(0, MIX_COLORS.length).map(([label, value], i) => ({ label, value, color: MIX_COLORS[i] }));
  const rest = named.slice(MIX_COLORS.length).reduce((sum, [, v]) => sum + v, 0) + (totals.get(OTHER) || 0);
  if (rest > 0) data.push({ label: OTHER, value: rest, color: OTHER_COLOR });

  return data;
}

/** Ready stock vs open orders, per catalog product. -> [{ ref, name, stockKg, demandKg }] */
export function stockVsOrders(products, orders) {
  const rows = new Map(CATALOG.map((p) => [p.ref, { ref: p.ref, name: p.name, stockKg: 0, demandKg: 0 }]));

  for (const p of products) {
    const item = productOf(p.productCode);
    if (item) rows.get(item.ref).stockKg += p.weightKg;
  }
  for (const o of orders) {
    const row = rows.get(o.ref);
    if (row) row.demandKg += o.kg;
  }

  return [...rows.values()]
    .filter((r) => r.stockKg > 0 || r.demandKg > 0)
    .sort((a, b) => b.demandKg - a.demandKg || b.stockKg - a.stockKg);
}

/** Open orders grouped by client. -> [{ client, count, kg }] */
export function ordersByClient(orders) {
  const byClient = new Map();

  for (const o of orders) {
    const row = byClient.get(o.client) || { client: o.client, count: 0, kg: 0 };
    row.count += 1;
    row.kg += o.kg;
    byClient.set(o.client, row);
  }

  return [...byClient.values()].sort((a, b) => b.kg - a.kg);
}

/** Quantity leaving per day: Late, Today, the next days, then Later. -> [{ label, value }] */
export function departuresTimeline(orders, at, days = 10) {
  const today = startOfDay(at);
  const dayStart = (i) => shiftDays(today, i).getTime();

  const slots = [{ label: "Late", from: -Infinity, to: at, value: 0 }];
  for (let i = 0; i < days; i++) {
    slots.push({
      label: i === 0 ? "Today" : shortWeekday(shiftDays(today, i)),
      from: i === 0 ? at : dayStart(i),
      to: dayStart(i + 1),
      value: 0,
    });
  }
  slots.push({ label: "Later", from: dayStart(days), to: Infinity, value: 0 });

  for (const o of orders) {
    const slot = slots.find((s) => o.departureAt >= s.from && o.departureAt < s.to);
    if (slot) slot.value += o.kg;
  }

  return slots.map(({ label, value }) => ({ label, value }));
}

/* ---------- formatting ---------- */

export const fmtKg = (v) => (v >= 1000 ? `${(v / 1000).toFixed(1)} t` : `${Math.round(v)} kg`);
export const fmtCount = (v) => String(Math.round(v));
export const fmtMinutes = (m) => (m >= 60 ? `${(m / 60).toFixed(1)} h` : `${Math.round(m)} min`);

/* ---------- access ---------- */

export const INSIGHT_ROLES = [
  "DG", "Production Manager", "Maintenance Manager", "Logistics Manager",
  "Quality Manager", "Commercial Manager", ...ATELIER_ROLES,
];
export const hasInsights = (role) => INSIGHT_ROLES.includes(role);
