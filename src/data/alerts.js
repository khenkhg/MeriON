import { ATELIER_ROLES, ATELIER_NAMES } from "./ateliers";

// Everyone who can send / receive alerts
export const ALERT_ROLES = [
  "DG",
  "Production Manager",
  "Quality Manager",
  "HR Manager",
  "Commercial Manager",
  "Maintenance Manager",
  "Logistics Manager",
  ...ATELIER_ROLES,
];

// Unacknowledged alerts escalate to the plant director
export const ESCALATION_TARGET = "DG";
export const DEFAULT_ESCALATION_SECONDS = 30 * 60;
export const ESCALATION_OPTIONS = [
  { label: "30 min", seconds: 30 * 60 },
  { label: "2 min (demo)", seconds: 2 * 60 },
  { label: "30 sec (demo)", seconds: 30 },
];

export const URGENCY_LABELS = {
  normal: "Normal",
  urgent: "Urgent",
  very_urgent: "Very urgent",
};

export const MACHINES = {
  1: ["Extruder E1", "Extruder E2", "Extruder E3"],
  2: ["Printer I1", "Printer I2"],
  3: ["Laminator L1", "Laminator L2"],
  4: ["Bag-maker S1", "Bag-maker S2"],
  5: ["Cutter F1", "Cutter F2"],
};

const DELAYS = ["Over 24 h", "Over 48 h", "Over 72 h"];

const workshop = (label = "Workshop") => ({
  key: "atelier",
  label,
  options: [1, 2, 3, 4, 5].map((n) => ({
    value: String(n),
    label: `Atelier ${n} · ${ATELIER_NAMES[n]}`,
  })),
});

const team = {
  key: "team",
  label: "Team",
  options: ["Team A · Morning", "Team B · Afternoon", "Team C · Night"],
};

const machine = {
  key: "machine",
  label: "Machine",
  needs: "atelier",
  options: (values) => MACHINES[values.atelier] || [],
};

// "targets": roles notified. "ATELIER" = the workshop selected in the form.
export const ALERT_TYPES = [
  {
    id: "breakdown",
    label: "Machine breakdown",
    description: "Intervention request (DI). Downtime timer starts immediately.",
    targets: ["Maintenance Manager"],
    tracksDowntime: true,
    closeLabel: "Machine restarted",
    fields: [
      workshop(),
      team,
      machine,
      {
        key: "organ",
        label: "Failing part",
        options: ["Motor", "Roller", "Heating system", "Sensor", "Blade / cutter", "Pneumatic system", "Electrical panel"],
      },
      {
        key: "anomaly",
        label: "Anomaly",
        options: ["Overheating", "Abnormal noise", "Film jam", "Motor failure", "Sensor fault", "Pressure loss", "Other"],
      },
      {
        key: "state",
        label: "Machine state",
        options: [
          { value: "stopped", label: "Stopped" },
          { value: "degraded", label: "Running (degraded)" },
        ],
      },
      {
        key: "urgency",
        label: "Urgency",
        options: Object.entries(URGENCY_LABELS).map(([value, label]) => ({ value, label })),
      },
    ],
  },
  {
    id: "material",
    label: "Raw material shortage",
    description: "Preventive alert before stock runs out, to avoid stopping the line.",
    targets: ["Production Manager", "Logistics Manager"],
    closeLabel: "Line resupplied",
    fields: [
      workshop(),
      {
        key: "material",
        label: "Material",
        options: ["Polyethylene granules", "Masterbatch", "Ink", "Solvent", "Adhesive", "Aluminium foil", "OPP film", "Semi-finished film"],
      },
      { key: "level", label: "Stock level", options: ["Below critical threshold", "Almost empty"] },
    ],
  },
  {
    id: "staff",
    label: "Staff shortage on line",
    description: "Critical on the night shift: a 3-operator machine cannot run with 2.",
    targets: ["HR Manager", "ATELIER"],
    closeLabel: "Staff reassigned",
    fields: [
      workshop(),
      team,
      machine,
      { key: "missing", label: "Missing", options: ["1 operator", "2 operators", "3 operators"] },
    ],
  },
  {
    id: "scrap",
    label: "Scrap / output rate threshold exceeded",
    description: "Scrap rate or OEE (TRS) crossed the critical threshold on a line.",
    targets: ["Production Manager", "Quality Manager"],
    closeLabel: "Back under threshold",
    fields: [
      workshop(),
      machine,
      {
        key: "indicator",
        label: "Indicator",
        options: ["Scrap rate above threshold", "OEE (TRS) drop", "Output rate drop"],
      },
    ],
  },
  {
    id: "quality",
    label: "Quality defect",
    description: "A quality defect was found on a production line.",
    targets: ["Quality Manager", "Production Manager"],
    closeLabel: "Defect handled",
    fields: [
      workshop(),
      machine,
      {
        key: "defect",
        label: "Defect",
        options: ["Print defect", "Delamination", "Seal defect", "Thickness out of tolerance", "Wrong dimensions", "Colour mismatch"],
      },
    ],
  },
  {
    id: "return",
    label: "Non-conforming product returned",
    description: "Returned product entered into stock, for analysis and handling.",
    targets: ["Production Manager", "Quality Manager"],
    closeLabel: "Return handled",
    fields: [
      { key: "client", label: "Client", options: ["Client A", "Client B", "Client C"] },
      {
        key: "reason",
        label: "Reason",
        options: ["Print defect", "Seal defect", "Thickness", "Dimensions", "Damaged packaging"],
      },
    ],
  },
  {
    id: "dwell_nc",
    label: "Excessive stay: non-conforming",
    description: "Non-conforming products waiting beyond the maximum allowed time.",
    targets: ["Quality Manager", "Logistics Manager"],
    closeLabel: "Stock cleared",
    fields: [
      { key: "zone", label: "Stock zone", options: ["Unit 1 · Oued Ghir", "Unit 2 · Oued Ghir"] },
      { key: "delay", label: "Waiting time", options: DELAYS },
    ],
  },
  {
    id: "dwell_semi",
    label: "Excessive stay: semi-finished",
    description: "Semi-finished products waiting too long between workshops.",
    targets: ["Production Manager", "DG"],
    closeLabel: "Products processed",
    fields: [workshop("Waiting at"), { key: "delay", label: "Waiting time", options: DELAYS }],
  },
];

export const TYPE_BY_ID = Object.fromEntries(ALERT_TYPES.map((t) => [t.id, t]));

// ---- helpers

const normalize = (o) => (typeof o === "string" ? { value: o, label: o } : o);

export function getOptions(field, values) {
  const raw = typeof field.options === "function" ? field.options(values) : field.options;
  return raw.map(normalize);
}

export function optionLabel(field, values) {
  const found = getOptions(field, values).find((o) => o.value === values[field.key]);
  return found ? found.label : "";
}

// Roles notified by an alert (the sender is left out unless they are the only target)
export function resolveTargets(type, values, user) {
  const all = [
    ...new Set(type.targets.map((t) => (t === "ATELIER" ? `Atelier ${values.atelier}` : t))),
  ];
  const others = user ? all.filter((r) => r !== user.role) : all;
  return others.length ? others : all;
}

export function formatDuration(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}


// Alerts a given user can see: addressed to their role, or escalated (for the DG)
export function alertsForUser(alerts, user) {
  return alerts.filter(
    (a) =>
      a.targets.includes(user.role) ||
      (user.role === ESCALATION_TARGET && a.escalatedAt)
  );
}

// Machine states derived from open breakdown alerts
export function machineStatuses(alerts) {
  const open = alerts.filter((a) => a.typeId === "breakdown" && !a.closedAt && a.values);
  const list = [];
  Object.entries(MACHINES).forEach(([n, names]) => {
    names.forEach((name) => {
      const alert = open.find((a) => a.values.atelier === n && a.values.machine === name);
      list.push({
        atelier: Number(n),
        name,
        alert: alert || null,
        status: !alert ? "running" : alert.values.state === "degraded" ? "degraded" : "down",
      });
    });
  });
  return list;
}

// Average repair time (minutes) over closed breakdowns
export function mttrMinutes(alerts) {
  const done = alerts.filter((a) => a.typeId === "breakdown" && a.closedAt);
  if (!done.length) return null;
  const total = done.reduce((s, a) => s + (a.closedAt - a.createdAt), 0);
  return Math.max(1, Math.round(total / done.length / 60000));
}
