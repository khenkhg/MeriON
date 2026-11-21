// Shared atelier helpers
export const ATELIER_ROLES = [1, 2, 3, 4, 5].map((n) => `Atelier ${n}`);

export const ATELIER_NAMES = {
  1: "Extrusion",
  2: "Impression",
  3: "Lamination",
  4: "Sacherie",
  5: "Finition & Découpe",
};

export const ATELIER_MACHINES = {
  1: "Extrusion E1",
  2: "Printing I2",
  3: "Lamination L1",
  4: "Sacherie S1",
  5: "Finition F1",
};

// "Atelier 3" -> 3, anything else -> null
export function getAtelierNumber(role) {
  const match = /^Atelier ([1-5])$/.exec(role || "");
  return match ? Number(match[1]) : null;
}
