// AI planner: schedules every job (new customer orders + semi-fini products already in
// production) on the plant's machines. Pure functions, no React. Times are MINUTES FROM NOW.
//
// For each production step the planner picks the machine and the job order that protect the
// departure deadlines first, then limit changeovers (cleaning, ink, width, format).
import { MACHINES } from "./alerts";
import { CATALOG, WORKSHOP_RATE_KG_H, productRef } from "./catalog";
import { seedOrders } from "./orders";

// One lane per real machine. DEMO: every machine runs at its workshop's rate from catalog.js
export const MACHINE_LIST = Object.entries(MACHINES).flatMap(([n, names]) =>
  names.map((name) => ({ n: name, a: Number(n), c: WORKSHOP_RATE_KG_H[n] }))
);

// What makes two jobs "different" for a machine (DEMO ASSUMPTIONS: replace with real specs)
export const SPECS = {
  "P-0001": { w: 600, mat: "PEBD", col: [], st: "mono", f: "Bag 5L" },
  "P-0002": { w: 600, mat: "PEBD", col: ["blue", "white"], st: "mono", f: "Bag 5L" },
  "P-574": { w: 600, mat: "PEBD", col: ["blue", "white", "red"], st: "mono", f: "Bag 25kg" },
  "P-610": { w: 800, mat: "PEHD", col: ["green", "white"], st: "alu", f: "Pouch 1kg" },
  "P-720": { w: 800, mat: "PEHD", col: ["green", "white", "red"], st: "alu", f: "Pouch 1kg" },
  "P-815": { w: 800, mat: "PEHD", col: [], st: "alu", f: "Pouch 1kg" },
};

export const hueOf = (i) => [200, 25, 145, 285, 50, 330, 95, 5][i % 8];

const routeOf = (ref) => CATALOG.find((p) => p.ref === ref).route;
const job = (id, client, ref, kg, hours, extra = {}) => ({
  id, client, ref, kg, route: routeOf(ref), dl: Math.round(hours * 60), ...SPECS[ref], ...extra,
});

// Saved customer orders -> planner jobs. The departure time becomes "minutes from now".
export const ordersToJobs = (orders, now = Date.now()) =>
  orders.map((o) =>
    job(o.id, o.client, o.ref, o.kg, 0, { dl: Math.max(0, Math.round((o.departureAt - now) / 60000)) })
  );

// Fallback when no saved orders are passed: the demo seed
export const demoOrders = () => ordersToJobs(seedOrders());
export const urgentOrder = () => job("ORD-URG", "Client A", "P-574", 1200, 7, { urgent: true });

const hash = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

// Semi-fini products already in production: only the remaining route is left to schedule
export const wipJobs = (semiFiniProducts) =>
  semiFiniProducts.map((p) => {
    const ref = productRef(p.productCode);
    return {
      id: p.productCode, client: p.clientName, ref, kg: p.weightKg,
      route: p.route.slice(p.route.indexOf(p.nextAtelier)),
      dl: 1080 + (hash(p.productCode) % 720), // DEMO: 18 h to 30 h from now
      wip: true, ...(SPECS[ref] || SPECS["P-574"]),
    };
  });

const newColors = (p, q) => q.col.filter((x) => !p.col.includes(x)).length;
export function setupMinutes(a, p, q) {
  switch (a) {
    case 1: return (p.w !== q.w ? 25 : 0) + (p.mat !== q.mat ? 30 : 0);
    case 2: return (p.client !== q.client ? 25 : 0) + (p.w !== q.w ? 20 : 0) + newColors(p, q) * 12;
    case 3: return (p.st !== q.st ? 35 : 0) + (p.w !== q.w ? 15 : 0);
    case 4: return p.f !== q.f ? 30 : 0;
    default: return p.f !== q.f ? 15 : 0;
  }
}

// Machines currently stopped -> minutes until they should be back (average past repair time)
export function downMap(alerts, now, simulated = {}) {
  const done = alerts.filter((a) => a.typeId === "breakdown" && a.closedAt);
  const mttr = (atelier) => {
    const l = done.filter((a) => a.values?.atelier === atelier);
    return l.length ? l.reduce((s, a) => s + (a.closedAt - a.createdAt), 0) / l.length / 60000 : 120;
  };
  const map = {};
  alerts
    .filter((a) => a.typeId === "breakdown" && !a.closedAt && a.values?.machine && a.values.state === "stopped")
    .forEach((a) => {
      map[a.values.machine] = Math.max(15, Math.round(mttr(a.values.atelier) - (now - a.createdAt) / 60000));
    });
  return { ...map, ...simulated };
}

// Machines at high breakdown risk run 30% slower in the plan
export const slowMap = (risks) =>
  Object.fromEntries(risks.filter((r) => r.state === "running" && r.score >= 70).map((r) => [r.name, 0.7]));

export function build(jobs, rule, w, { down = {}, slow = {}, prio = {} } = {}) {
  const mach = MACHINE_LIST.map((m) => ({ ...m, c: m.c * (slow[m.n] || 1) }));
  const avg = [1, 2, 3, 4, 5].map((a) => {
    const l = mach.filter((m) => m.a === a);
    return l.reduce((s, m) => s + m.c, 0) / l.length;
  });
  const free = mach.map((m) => down[m.n] || 0);
  const last = mach.map(() => null);
  const rdy = jobs.map(() => 0);
  const ix = jobs.map(() => 0);
  const ops = [];
  const total = jobs.reduce((s, j) => s + j.route.length, 0);

  for (let k = 0; k < total; k++) {
    let b = null;
    jobs.forEach((o, i) => {
      if (ix[i] >= o.route.length) return;
      const a = o.route[ix[i]];
      let bm = null;
      mach.forEach((m, j) => {
        if (m.a !== a) return;
        const su = last[j] ? setupMinutes(a, last[j], o) : 0;
        const st = free[j];
        const rs = Math.max(st + su, rdy[i]);
        const f = rs + Math.round((o.kg / m.c) * 60);
        if (!bm || f < bm.f) bm = { j, su, st, rs, f };
      });
      const rem = o.route.slice(ix[i] + 1).reduce((s, x) => s + (o.kg / avg[x - 1]) * 60, 0);
      const sc = rule === "fifo" ? i : o.dl - bm.f - rem + w * bm.su - (prio[o.id] ? 1e5 : 0);
      if (!b || sc < b.sc) b = { i, a, sc, ...bm };
    });
    ops.push({ i: b.i, a: b.a, j: b.j, su: b.su, st: b.st, rs: b.rs, end: b.f });
    free[b.j] = b.f;
    last[b.j] = jobs[b.i];
    rdy[b.i] = b.f;
    ix[b.i]++;
  }
  return ops;
}

export function stats(jobs, ops, prio = {}) {
  const e = jobs.map(() => 0);
  ops.forEach((x) => (e[x.i] = Math.max(e[x.i], x.end)));
  const late = e.map((v, i) => Math.max(0, v - jobs[i].dl));
  const su = ops.reduce((s, x) => s + x.su, 0);
  const L = late.reduce((a, b) => a + b, 0);
  const n = late.filter(Boolean).length;
  return {
    e, late, su, n, L, end: Math.max(0, ...e),
    cost: 10 * L + 200 * n + su + late.reduce((s, v, i) => s + (prio[jobs[i].id] ? 100 * v : 0), 0),
  };
}

// Tries several balances between "avoid delays" and "avoid changeovers", keeps the cheapest
export function best(jobs, opts) {
  let b = null, bs = null;
  [["fifo", 0], ["ia", 0], ["ia", 0.5], ["ia", 1], ["ia", 2], ["ia", 4], ["ia", 8]].forEach(([r, w]) => {
    const ops = build(jobs, r, w, opts);
    const s = stats(jobs, ops, opts.prio);
    if (!bs || s.cost < bs.cost) { b = ops; bs = s; }
  });
  return b;
}

export const makePlan = (jobs, mode, opts) => (mode === "ai" ? best(jobs, opts) : build(jobs, "fifo", 0, opts));

// Arrival order vs AI plan, with the plant's current constraints (used by the overview)
export function planSummary(alerts, semiFiniProducts, risks, now, orders = null) {
  const jobs = [...wipJobs(semiFiniProducts), ...(orders ? ordersToJobs(orders, now) : demoOrders())];
  const opts = { down: downMap(alerts, now), slow: slowMap(risks), prio: {} };
  return {
    jobs, opts,
    fifo: stats(jobs, makePlan(jobs, "fifo", opts)),
    ai: stats(jobs, makePlan(jobs, "ai", opts)),
  };
}
