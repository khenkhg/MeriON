// Product catalog + availability / lead-time model used by the Commercial order checker.
// All numbers below are DEMO ASSUMPTIONS: adjust them to Meriplast's real capacities.

export const CATALOG = [
  { ref: "P-0001", name: "Plain extruded film", route: [1] },
  { ref: "P-0002", name: "Printed film", route: [1, 2] },
  { ref: "P-574", name: "Laminated pouch film", route: [1, 2, 4] },
  { ref: "P-610", name: "Printed laminated roll", route: [1, 2, 3] },
  { ref: "P-720", name: "Finished printed sachet", route: [1, 2, 3, 4, 5] },
  { ref: "P-815", name: "Laminated bag (bought-in film)", route: [3, 4, 5] },
];

// Throughput of each workshop, in kg per hour
export const WORKSHOP_RATE_KG_H = { 1: 400, 2: 300, 3: 350, 4: 450, 5: 500 };

export const SETUP_HOURS = 1;            // machine setup when starting a new production
export const STAGE_LAG_HOURS = 0.5;      // hand-off time between two workshops
export const BREAKDOWN_PENALTY_HOURS = 2; // extra delay per workshop with a machine down

// "P-574-07" -> "P-574"  |  "P-0001" -> "P-0001"
export const productRef = (code) => {
  const m = /^(P-\d+)/.exec(code || "");
  return m ? m[1] : code;
};

const routeHours = (kg, route, down) => {
  const bottleneck = Math.min(...route.map((w) => WORKSHOP_RATE_KG_H[w]));
  return (
    kg / bottleneck +
    (route.length - 1) * STAGE_LAG_HOURS +
    route.filter((w) => down.has(w)).length * BREAKDOWN_PENALTY_HOURS
  );
};

/**
 * status: "available" | "partial" | "unavailable"
 * Uses completed stock first, then products already in production, then a fresh run.
 */
export function estimateOrder({ product, quantityKg, products, semiFiniProducts, downWorkshops }) {
  const stock = products
    .filter((p) => productRef(p.productCode) === product.ref)
    .reduce((s, p) => s + p.weightKg, 0);

  const missing = Math.max(0, quantityKg - stock);
  const blocked = product.route.filter((w) => downWorkshops.has(w));

  if (missing === 0) {
    return { status: "available", stock, missing: 0, etaHours: 0, wipUsed: 0, blocked: [] };
  }

  let need = missing;
  let wipUsed = 0;
  let wipHours = 0;

  const lots = semiFiniProducts
    .filter((p) => productRef(p.productCode) === product.ref)
    .map((p) => ({ ...p, remaining: p.route.slice(p.route.indexOf(p.nextAtelier)) }))
    .sort((a, b) => a.remaining.length - b.remaining.length);

  for (const lot of lots) {
    if (need <= 0) break;
    const take = Math.min(lot.weightKg, need);
    wipHours = Math.max(wipHours, routeHours(take, lot.remaining, downWorkshops));
    wipUsed += take;
    need -= take;
  }

  const newHours = need > 0 ? SETUP_HOURS + routeHours(need, product.route, downWorkshops) : 0;

  return {
    status: stock > 0 ? "partial" : "unavailable",
    stock,
    missing,
    etaHours: Math.max(wipHours, newHours),
    wipUsed,
    blocked,
  };
}

export function formatEta(hours) {
  const totalMin = Math.max(1, Math.round(hours * 60));
  const d = Math.floor(totalMin / 1440);
  const h = Math.floor((totalMin % 1440) / 60);
  const m = totalMin % 60;
  if (d > 0) return `${d} d ${h} h`;
  if (h > 0) return m ? `${h} h ${m} min` : `${h} h`;
  return `${m} min`;
}
