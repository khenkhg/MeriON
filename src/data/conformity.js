import { useCallback, useEffect, useMemo, useState } from "react";

/* =========================================================
   CONFORMITY STORE (demo data, saved in localStorage)

   Every product is conforme when it leaves Atelier 1. A
   "declaration" is a quantity of a lot that the Quality
   Manager later labelled non conforme, either:
     - during production  -> stage 1..5   (removed from the stock count)
     - after delivery     -> stage "client" (already at the client)
   ========================================================= */

// Roles allowed to open the Quality page (used by the route in App.jsx)
export const QUALITY_ROLES = ["Quality Manager"];

export const STAGES = [
  { id: 1, label: "Atelier 1 - Extrusion" },
  { id: 2, label: "Atelier 2 - Impression" },
  { id: 3, label: "Atelier 3 - Lamination" },
  { id: 4, label: "Atelier 4 - Sacherie" },
  { id: 5, label: "Atelier 5 - Finition" },
  { id: "client", label: "After delivery (at the client)" },
];

export const stageLabel = (id) =>
  STAGES.find((s) => String(s.id) === String(id))?.label ?? String(id);

export const CLIENTS = [
  "Client A",
  "Client B",
  "Client C",
  "Client D",
];

// Lots: `produced` = quantity declared conforme at the first atelier,
// `delivered` = quantity already shipped to clients.
const SEED_LOTS = [
  { id: "LOT-2611-A", product: "Stretch film 500mm", produced: 5000, delivered: 3200 },
  { id: "LOT-2611-B", product: "Printed bag 30L", produced: 12000, delivered: 8000 },
  { id: "LOT-2611-C", product: "Laminated pouch 1kg", produced: 7500, delivered: 4100 },
  { id: "LOT-2611-D", product: "Zip sachet small", produced: 20000, delivered: 15500 },
];

const hoursAgo = (h) => new Date(Date.now() - h * 3600 * 1000).toISOString();

const SEED_DECLARATIONS = [
  { id: "d1", lotId: "LOT-2611-A", stage: 2, qty: 120, reason: "Unknown", client: "", date: hoursAgo(70) },
  { id: "d2", lotId: "LOT-2611-B", stage: 3, qty: 340, reason: "Unknown", client: "", date: hoursAgo(52) },
  { id: "d3", lotId: "LOT-2611-C", stage: 4, qty: 85, reason: "Unknown", client: "", date: hoursAgo(30) },
  { id: "d4", lotId: "LOT-2611-B", stage: "client", qty: 60, reason: "Unknown", client: "Client B", date: hoursAgo(20) },
  { id: "d5", lotId: "LOT-2611-D", stage: "client", qty: 150, reason: "Unknown", client: "Client A", date: hoursAgo(6) },
];

const STORAGE_KEY = "merion.conformity.v1";

const load = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return SEED_DECLARATIONS;
};

const isClientStage = (d) => String(d.stage) === "client";

export function useConformity() {
  const [declarations, setDeclarations] = useState(load);
  const lots = SEED_LOTS;

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(declarations));
    } catch {
      /* ignore */
    }
  }, [declarations]);

  // Per-lot figures
  const lotStats = useMemo(
    () =>
      lots.map((lot) => {
        const mine = declarations.filter((d) => d.lotId === lot.id);
        const ncProduction = mine
          .filter((d) => !isClientStage(d))
          .reduce((s, d) => s + d.qty, 0);
        const ncClient = mine
          .filter(isClientStage)
          .reduce((s, d) => s + d.qty, 0);
        const available = lot.produced - lot.delivered - ncProduction;
        return {
          ...lot,
          ncProduction,
          ncClient,
          available,
          // most that can still be declared in each situation
          maxProduction: Math.max(0, available),
          maxClient: Math.max(0, lot.delivered - ncClient),
          ncRate: lot.produced
            ? ((ncProduction + ncClient) / lot.produced) * 100
            : 0,
        };
      }),
    [lots, declarations]
  );

  const totals = useMemo(() => {
    const t = lotStats.reduce(
      (acc, l) => ({
        produced: acc.produced + l.produced,
        delivered: acc.delivered + l.delivered,
        ncProduction: acc.ncProduction + l.ncProduction,
        ncClient: acc.ncClient + l.ncClient,
        available: acc.available + l.available,
      }),
      { produced: 0, delivered: 0, ncProduction: 0, ncClient: 0, available: 0 }
    );
    return t;
  }, [lotStats]);

  const byStage = useMemo(
    () =>
      STAGES.map((s) => ({
        ...s,
        qty: declarations
          .filter((d) => String(d.stage) === String(s.id))
          .reduce((sum, d) => sum + d.qty, 0),
      })),
    [declarations]
  );

  const declare = useCallback(
    ({ lotId, stage, qty, reason, client }) => {
      const lot = lotStats.find((l) => l.id === lotId);
      if (!lot) return { ok: false, error: "Select a lot." };

      const n = Math.floor(Number(qty));
      if (!n || n < 1) return { ok: false, error: "Enter a quantity of at least 1." };

      const atClient = String(stage) === "client";
      const max = atClient ? lot.maxClient : lot.maxProduction;
      if (n > max) {
        return {
          ok: false,
          error: atClient
            ? `Only ${max} units of this lot were delivered and are still counted as conforme at clients.`
            : `Only ${max} conforme units of this lot are still in production or in stock.`,
        };
      }
      if (atClient && !client) return { ok: false, error: "Select the client." };

      setDeclarations((prev) => [
        {
          id: `d${Date.now()}`,
          lotId,
          stage: atClient ? "client" : Number(stage),
          qty: n,
          reason: reason.trim() || "Unknown",
          client: atClient ? client : "",
          date: new Date().toISOString(),
        },
        ...prev,
      ]);
      return { ok: true };
    },
    [lotStats]
  );

  // Undo a declaration (e.g. declared by mistake): units become conforme again
  const cancel = useCallback((id) => {
    setDeclarations((prev) => prev.filter((d) => d.id !== id));
  }, []);

  return { lots: lotStats, declarations, totals, byStage, declare, cancel };
}
