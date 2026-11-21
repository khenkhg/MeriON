// Realistic demo history so the Insights page tells a story.
// Everything is generated RELATIVE TO "now" (so the charts are never empty) with a fixed
// random seed (so the demo is identical every time). Weekend shifts (Fri + Sat) are reduced.
//
// The story: 6 months of production with an August summer slowdown and a strong autumn;
// Atelier 3 (Lamination) is the bottleneck right now because Laminator L1 is down;
// Atelier 2 is about to run out of ink.
import { demoUsers } from "./users";
import { CATALOG } from "./catalog";
import { ATELIER_MACHINES } from "./ateliers";
import { TYPE_BY_ID, MACHINES, getOptions, optionLabel, resolveTargets } from "./alerts";
import { seedOrders } from "./orders";
import { SYSTEM_USER, DEFAULT_MATERIAL, defaultStock, estimateDepletion } from "./material";

const MIN = 60000, H = 3600000, DAY = 24 * H;
const FLAG = "merion_demo_seeded";
const VERSION = "v3"; // bumped so browsers that already seeded get the new history + orders

function mulberry32(seed) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const OPERATORS = ["Ahmed", "Yacine", "Karim", "Samir", "Nadia", "Lyes", "Amine", "Sofiane"];
// hour-of-day activity: day shifts busy, night shift quiet
const HOUR_W = [1, 1, 1, 1, 1, 2, 6, 8, 9, 9, 9, 8, 6, 7, 8, 8, 7, 6, 5, 4, 3, 3, 2, 1];
const MONTH_FACTOR = { 5: 0.95, 6: 0.85, 7: 0.55, 8: 1, 9: 1.1, 10: 1.15 }; // Jun..Nov (Aug = summer dip)
const ROUTE_W = { "P-0001": 15, "P-0002": 20, "P-574": 20, "P-610": 15, "P-720": 20, "P-815": 10 };
const CLIENT_W = [["Client A", 45], ["Client B", 35], ["Client C", 20]];
const MACHINE_W = [
  ["Extruder E2", 18], ["Laminator L1", 16], ["Extruder E1", 10], ["Printer I2", 10], ["Laminator L2", 8],
  ["Printer I1", 8], ["Extruder E3", 7], ["Bag-maker S1", 7], ["Cutter F1", 6], ["Bag-maker S2", 5], ["Cutter F2", 5],
];
const DOWNTIME_MEAN = { 1: 70, 2: 90, 3: 150, 4: 60, 5: 50 }; // minutes per breakdown
const DEFECT_BY_ATELIER = {
  1: "Thickness out of tolerance", 2: "Print defect", 3: "Delamination", 4: "Seal defect", 5: "Wrong dimensions",
};

const userByRole = (role) => demoUsers.find((u) => u.role === role);
const who = (u) => ({ id: u.id, name: u.name, role: u.role, email: u.email });
const machineAtelier = (name) => Number(Object.keys(MACHINES).find((k) => MACHINES[k].includes(name)));

export function buildDemoData(now = Date.now()) {
  const rand = mulberry32(2026);
  const int = (a, b) => a + Math.floor(rand() * (b - a + 1));
  const pick = (list) => list[Math.floor(rand() * list.length)];
  const weighted = (pairs) => {
    const total = pairs.reduce((s, [, w]) => s + w, 0);
    let r = rand() * total;
    for (const [v, w] of pairs) if ((r -= w) <= 0) return v;
    return pairs[pairs.length - 1][0];
  };
  const hourOfDay = () => weighted(HOUR_W.map((w, h) => [h, w]));
  const dayStart = (daysBack) => {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - daysBack);
    return d;
  };
  // random working-hours timestamp, `daysBack` days ago at most, never in the last `minAgoH` hours
  const workTime = (maxDaysBack, minAgoH = 3) => {
    let t;
    do {
      t = dayStart(int(0, maxDaysBack)).getTime() + hourOfDay() * H + rand() * H;
    } while (t > now - minAgoH * H);
    return t;
  };

  let seq = 0;
  const code = (ref) => `${ref}-${String(++seq).padStart(3, "0")}`;
  const catalogByRef = Object.fromEntries(CATALOG.map((p) => [p.ref, p]));
  const stepsFor = (route, upTo, lastAt, weightKg, spread = 5) =>
    route.slice(0, upTo).map((a, k, arr) => ({
      atelier: a,
      machineName: ATELIER_MACHINES[a],
      operatorName: pick(OPERATORS),
      weightKg,
      at: new Date(lastAt - (arr.length - 1 - k) * H * (1.5 + rand() * spread)).toISOString(),
    }));

  /* ---------------- completed products: ~6 months of production ---------------- */
  const products = [];
  for (let d = 180; d >= 0; d--) {
    const day = dayStart(d);
    const weekend = day.getDay() === 5 || day.getDay() === 6;
    const factor = MONTH_FACTOR[day.getMonth()] ?? 1;
    const base = 3.4 * factor * (weekend ? 0.7 : 1);
    const n = Math.round(base * (0.6 + rand() * 0.8));

    for (let i = 0; i < n; i++) {
      const product = catalogByRef[weighted(Object.entries(ROUTE_W))];
      const weightKg = 5 * Math.round((150 + rand() * 450) / 5);
      let t = day.getTime() + hourOfDay() * H + rand() * H;
      if (t > now - 20 * MIN) t = now - (0.3 + rand() * 2) * H;
      const history = stepsFor(product.route, product.route.length, t, weightKg);
      const last = history[history.length - 1];
      products.push({
        productCode: code(product.ref),
        clientName: weighted(CLIENT_W),
        machineName: last.machineName,
        operatorName: last.operatorName,
        weightKg,
        status: "CONFORME",
        scannedAt: new Date(t).toISOString(),
        history,
      });
    }
  }
  products.sort((a, b) => b.scannedAt.localeCompare(a.scannedAt));

  /* ---------------- semi-fini: Atelier 3 is the bottleneck ---------------- */
  const semiFiniProducts = [];
  [
    { n: 3, count: 6, age: [8, 30] },
    { n: 2, count: 3, age: [2, 10] },
    { n: 4, count: 3, age: [3, 12] },
    { n: 5, count: 2, age: [1, 6] },
  ].forEach(({ n, count, age }) => {
    const options = CATALOG.filter((p) => p.route.indexOf(n) > 0);
    for (let i = 0; i < count; i++) {
      const product = pick(options);
      const weightKg = 5 * Math.round((150 + rand() * 450) / 5);
      const at = now - (age[0] + rand() * (age[1] - age[0])) * H;
      const history = stepsFor(product.route, product.route.indexOf(n), at, weightKg, 1.5);
      const last = history[history.length - 1];
      semiFiniProducts.push({
        productCode: code(product.ref),
        clientName: weighted(CLIENT_W),
        machineName: last.machineName,
        operatorName: last.operatorName,
        weightKg,
        route: product.route,
        nextAtelier: n,
        scannedAt: last.at,
        history,
      });
    }
  });

  /* ---------------- alerts ---------------- */
  function makeAlert({ typeId, at, preset = {}, by, ackMin = null, durMin = null, responder, targets, escalated = false }) {
    const type = TYPE_BY_ID[typeId];
    const values = { ...preset };
    type.fields.forEach((f) => {
      if (!values[f.key]) values[f.key] = pick(getOptions(f, values)).value;
    });
    const creator = typeof by === "string" ? userByRole(by) : by;
    const to = targets || resolveTargets(type, values, creator);
    const resp = userByRole(responder || to[0]) || creator;
    const ackAt = ackMin == null ? null : at + ackMin * MIN;
    const closedAt = durMin == null ? null : at + durMin * MIN;
    return {
      id: `${Math.round(at)}-${Math.floor(rand() * 36 ** 4).toString(36).padStart(4, "0")}`,
      typeId,
      title: type.label,
      values,
      details: type.fields.map((f) => ({ label: f.label, value: optionLabel(f, values) })),
      urgency: values.urgency || null,
      tracksDowntime: !!type.tracksDowntime,
      closeLabel: type.closeLabel || "Mark as resolved",
      targets: to,
      createdBy: who(creator),
      createdAt: Math.round(at),
      acknowledgedAt: ackAt && Math.round(ackAt),
      acknowledgedBy: ackAt ? who(resp) : null,
      closedAt: closedAt && Math.round(closedAt),
      closedBy: closedAt ? who(resp) : null,
      escalatedAt: escalated ? Math.round(at + 30 * MIN) : null,
    };
  }

  const alerts = [];
  const closedAlert = (typeId, preset, by, durRange = [20, 240]) => {
    const ackMin = rand() < 0.1 ? int(32, 50) : int(2, 20); // a few were late -> escalated to the DG
    const dur = int(durRange[0], durRange[1]) + ackMin;
    alerts.push(makeAlert({ typeId, at: workTime(178), preset, by, ackMin, durMin: dur, escalated: ackMin > 30 }));
  };

  // 48 machine breakdowns: Lamination (A3) loses the most time
  for (let i = 0; i < 48; i++) {
    const machine = weighted(MACHINE_W);
    const atelier = machineAtelier(machine);
    const dur = Math.round(DOWNTIME_MEAN[atelier] * (0.35 + rand() * 1.5));
    const ackMin = int(2, 14);
    alerts.push(makeAlert({
      typeId: "breakdown",
      at: workTime(178),
      preset: {
        atelier: String(atelier), machine,
        state: rand() < 0.7 ? "stopped" : "degraded",
        urgency: dur > 200 ? "very_urgent" : dur > 90 ? "urgent" : "normal",
      },
      by: `Atelier ${atelier}`,
      ackMin, durMin: ackMin + dur,
    }));
  }

  for (let i = 0; i < 16; i++) {
    const atelier = weighted([[1, 5], [2, 5], [3, 3], [4, 2], [5, 1]]);
    closedAlert("material", { atelier: String(atelier), material: DEFAULT_MATERIAL[atelier] }, `Atelier ${atelier}`, [60, 360]);
  }
  for (let i = 0; i < 9; i++) {
    const atelier = int(1, 5);
    closedAlert("staff", { atelier: String(atelier), team: rand() < 0.6 ? "Team C · Night" : undefined }, `Atelier ${atelier}`, [30, 180]);
  }
  for (let i = 0; i < 12; i++) {
    const atelier = weighted([[1, 3], [2, 3], [3, 4], [4, 2], [5, 1]]);
    closedAlert("scrap", { atelier: String(atelier) }, `Atelier ${atelier}`, [30, 200]);
  }
  for (let i = 0; i < 20; i++) {
    const atelier = weighted([[1, 10], [2, 35], [3, 25], [4, 15], [5, 15]]);
    closedAlert("quality", { atelier: String(atelier), defect: DEFECT_BY_ATELIER[atelier] }, `Atelier ${atelier}`, [30, 300]);
  }
  for (let i = 0; i < 7; i++) closedAlert("return", {}, "Commercial Manager", [120, 720]);
  for (let i = 0; i < 5; i++) closedAlert("dwell_nc", {}, "Logistics Manager", [60, 600]);
  for (let i = 0; i < 7; i++) closedAlert("dwell_semi", { atelier: String(weighted([[2, 2], [3, 6], [4, 2]])) }, "Logistics Manager", [60, 480]);

  // ---- happening right now
  const L1 = makeAlert({
    typeId: "breakdown", at: now - 47 * MIN, by: "Atelier 3", ackMin: 7,
    preset: { atelier: "3", machine: "Laminator L1", state: "stopped", urgency: "very_urgent", organ: "Heating system", anomaly: "Overheating", team: "Team A · Morning" },
  });
  const I2 = makeAlert({
    typeId: "breakdown", at: now - 12 * MIN, by: "Atelier 2",
    preset: { atelier: "2", machine: "Printer I2", state: "degraded", urgency: "urgent", organ: "Sensor", anomaly: "Sensor fault", team: "Team A · Morning" },
  });
  const stuck = makeAlert({
    typeId: "dwell_semi", at: now - 130 * MIN, by: "Logistics Manager", preset: { atelier: "3", delay: "Over 24 h" }, escalated: true,
  });
  const defect = makeAlert({
    typeId: "quality", at: now - 62 * MIN, by: "Atelier 2", ackMin: 22,
    preset: { atelier: "2", machine: "Printer I1", defect: "Print defect" },
  });
  const ink = makeAlert({
    typeId: "material", at: now - 25 * MIN, by: SYSTEM_USER, ackMin: 5, responder: "Atelier 2",
    targets: ["Atelier 2", "Production Manager", "Logistics Manager"],
    preset: { atelier: "2", material: "Ink", level: "Below critical threshold" },
  });
  // Printer I1 is the "about to fail" machine: it broke 3 times this month and keeps producing
  // print defects. Its risk score crosses the alert line, so the planner runs it slower.
  [[26, 70], [15, 55], [6, 85]].forEach(([daysAgo, dur]) => {
    const at = now - daysAgo * DAY - int(0, 5) * H;
    alerts.push(makeAlert({
      typeId: "breakdown", at, by: "Atelier 2", ackMin: 6, durMin: 6 + dur,
      preset: { atelier: "2", machine: "Printer I1", state: "degraded", urgency: "urgent", organ: "Sensor", anomaly: "Sensor fault", team: "Team B · Afternoon" },
    }));
  });
  [4, 11].forEach((daysAgo) => {
    alerts.push(makeAlert({
      typeId: "quality", at: now - daysAgo * DAY - int(0, 5) * H, by: "Atelier 2", ackMin: 10, durMin: 120,
      preset: { atelier: "2", machine: "Printer I1", defect: "Print defect" },
    }));
  });
  alerts.push(L1, I2, stuck, defect, ink);
  alerts.sort((a, b) => b.createdAt - a.createdAt);

  /* ---------------- raw material per atelier ---------------- */
  const steps = [...products, ...semiFiniProducts].flatMap((p) => p.history);
  const cfg = {
    1: { stockKg: 3400, capacityKg: 6000, minKg: 1200, ratio: 1.04 },
    2: { stockKg: 140, capacityKg: 1000, minKg: 150, ratio: 0.08 }, // ink: below its minimum
    3: { stockKg: 1750, capacityKg: 3000, minKg: 600, ratio: 0.35 },
    4: { stockKg: 900, capacityKg: 4000, minKg: 800, ratio: 1 },    // close to its minimum
    5: { stockKg: 2600, capacityKg: 4000, minKg: 700, ratio: 1 },
  };
  const material = {};
  [1, 2, 3, 4, 5].forEach((n) => {
    const mine = steps.filter((s) => s.atelier === n);
    const log = Array.from({ length: 6 }, (_, i) => ({
      t: now - (50 - i * 8) * MIN,
      kg: Math.round(250 * cfg[n].ratio * (0.8 + rand() * 0.4) * 10) / 10,
    }));
    material[n] = {
      ...defaultStock(n),
      ...cfg[n],
      productCount: mine.length,
      producedKg: mine.reduce((s, x) => s + x.weightKg, 0),
      log,
      depletionAt: estimateDepletion(cfg[n].stockKg, log, now),
      alertId: n === 2 ? ink.id : null,
      alertAt: n === 2 ? ink.createdAt : null,
      widened: n === 2,
    };
  });

  return { products, semiFiniProducts, alerts, material };
}

export function seedDemoData(now = Date.now()) {
  const d = buildDemoData(now);
  localStorage.setItem("merion_products", JSON.stringify(d.products));
  localStorage.setItem("merion_semi_fini", JSON.stringify(d.semiFiniProducts));
  localStorage.setItem("merion_alerts", JSON.stringify(d.alerts));
  localStorage.setItem("merion_material", JSON.stringify(d.material));
  localStorage.setItem("merion_orders", JSON.stringify(seedOrders(now)));
  localStorage.setItem(FLAG, VERSION);
}

// Runs once per browser, before the providers read localStorage
export function seedDemoDataOnce() {
  try {
    if (localStorage.getItem(FLAG) !== VERSION) seedDemoData();
  } catch {
    /* storage unavailable */
  }
}
