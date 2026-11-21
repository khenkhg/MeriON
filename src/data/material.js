// Raw-material tracking per atelier: constants + the consumption-rate model.

// Sender of the automatic shortage alerts
export const SYSTEM_USER = {
  id: "system",
  name: "Stock monitor (auto)",
  role: "System",
  email: "system@merion.auto",
};

// Must match the options of the "material" alert type in data/alerts.js
export const MATERIAL_OPTIONS = [
  "Polyethylene granules", "Masterbatch", "Ink", "Solvent",
  "Adhesive", "Aluminium foil", "OPP film", "Semi-finished film",
];

export const DEFAULT_MATERIAL = {
  1: "Polyethylene granules",
  2: "Ink",
  3: "Adhesive",
  4: "Semi-finished film",
  5: "Semi-finished film",
};

// Roles that hear about the shortage AFTER the atelier itself
export const OTHER_RECIPIENTS = ["Production Manager", "Logistics Manager"];
// How long the atelier manager has alone before the others are notified
export const OTHERS_DELAY_SECONDS = 60; // DEMO value: use e.g. 15 * 60 in production

// Consumption-rate window (DEMO values: use 10 min / 60 min in production)
export const RATE_MIN_WINDOW_MS = 2 * 60 * 1000;
export const RATE_MAX_WINDOW_MS = 60 * 60 * 1000;

export const defaultStock = (atelier) => ({
  material: DEFAULT_MATERIAL[atelier],
  stockKg: 5000,       // raw material currently at the atelier
  capacityKg: 5000,    // only used to draw the level bar
  minKg: 1000,         // threshold set by the atelier responsible
  ratio: 1,            // kg of raw material used per kg of product made
  productCount: 0,
  producedKg: 0,
  log: [],             // recent consumption events: { t, kg }
  depletionAt: null,   // timestamp at which the stock is predicted to hit 0
  alertId: null,
  alertAt: null,
  widened: false,      // true once the other roles were notified
});

/**
 * Average raw-material consumption in kg/ms, from the scans of the last hour.
 * Needs 2+ scans. The first scan only marks the start of the window.
 */
export function consumptionRate(log, now = Date.now()) {
  const recent = log.filter((e) => now - e.t <= RATE_MAX_WINDOW_MS);
  if (recent.length < 2) return null;
  const windowMs = Math.min(
    RATE_MAX_WINDOW_MS,
    Math.max(RATE_MIN_WINDOW_MS, now - recent[0].t)
  );
  const kg = recent.slice(1).reduce((s, e) => s + e.kg, 0);
  return kg > 0 ? kg / windowMs : null;
}

// Timestamp when the stock reaches 0 at the current pace (null = not enough data)
export function estimateDepletion(stockKg, log, now = Date.now()) {
  if (stockKg <= 0) return now;
  const rate = consumptionRate(log, now);
  return rate ? now + stockKg / rate : null;
}
