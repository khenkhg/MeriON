// Customer orders: who can see / create them + the demo seed.
// An order stores an absolute departure time; the planner converts it to "minutes from now".

export const ORDER_ROLES = ["Commercial Manager", "Production Manager"];
export const hasOrders = (role) => ORDER_ROLES.includes(role);
export const canCreateOrders = (role) => role === "Commercial Manager";

export const CLIENTS = ["Client A", "Client B", "Client C"];

const H = 3600000;

// DEMO seed: listed in ARRIVAL order on purpose. The specs alternate (600/800 mm, PEBD/PEHD)
// and the most urgent orders (ORD-104, ORD-107) arrive late, so first-come-first-served misses
// deadlines and wastes changeovers, while the AI plan reorders them.
const SEED = [
  ["ORD-101", "Client B", "P-574", 2500, 33],
  ["ORD-102", "Client C", "P-0002", 2000, 28],
  ["ORD-103", "Client A", "P-610", 1000, 37],
  ["ORD-104", "Client B", "P-610", 1000, 21],
  ["ORD-105", "Client C", "P-815", 2500, 29],
  ["ORD-106", "Client B", "P-574", 1000, 30],
  ["ORD-107", "Client C", "P-815", 1000, 24],
];

export const seedOrders = (now = Date.now()) =>
  SEED.map(([id, client, ref, kg, hours], i) => ({
    id,
    client,
    ref,
    kg,
    departureAt: now + hours * H,
    createdAt: now - (SEED.length - i) * 20 * 60000,
    createdBy: { name: "Commercial Manager", role: "Commercial Manager" },
  }));

// "ORD-107" -> "ORD-108"
export const nextOrderId = (orders) => {
  const max = orders.reduce((m, o) => Math.max(m, Number(/(\d+)$/.exec(o.id)?.[1]) || 0), 100);
  return `ORD-${max + 1}`;
};
