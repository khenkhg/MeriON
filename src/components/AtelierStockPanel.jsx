import { useState } from "react";
import { Boxes, PackageCheck, BellRing, Timer, Plus, AlertTriangle, OctagonX } from "lucide-react";
import { useAlerts } from "../context/AlertContext";
import { useMaterial } from "../context/MaterialContext";
import { formatDuration } from "../data/alerts";
import { MATERIAL_OPTIONS, OTHERS_DELAY_SECONDS, consumptionRate } from "../data/material";

export default function AtelierStockPanel({ atelier }) {
  const { now } = useAlerts();
  const { getStock, addStock, updateSettings } = useMaterial();
  const s = getStock(atelier);

  const [refill, setRefill] = useState("");
  const [minDraft, setMinDraft] = useState(null);

  const low = s.stockKg <= s.minKg;
  const empty = s.stockKg <= 0;
  const pct = Math.min(100, Math.round((s.stockKg / Math.max(s.capacityKg, s.stockKg, 1)) * 100));
  const minPct = Math.min(100, Math.round((s.minKg / Math.max(s.capacityKg, 1)) * 100));
  const rateKgH = (consumptionRate(s.log, now) || 0) * 3600000;
  const remainingMs = s.depletionAt ? Math.max(0, s.depletionAt - now) : null;

  const commitMin = () => {
    const v = Number(minDraft);
    if (minDraft !== null && Number.isFinite(v) && v >= 0) updateSettings(atelier, { minKg: v });
    setMinDraft(null);
  };

  const submitRefill = (e) => {
    e.preventDefault();
    const v = Number(refill);
    if (!Number.isFinite(v) || v <= 0) return;
    addStock(atelier, v);
    setRefill("");
  };

  return (
    <div className={`stock-panel ${empty ? "is-empty" : low ? "is-low" : ""}`}>
      <div className="stock-kpis">
        <div className="stock-kpi">
          <Boxes size={20} />
          <span>Raw material at the atelier</span>
          <strong>{s.stockKg.toLocaleString()} kg</strong>
          <small>{s.material}</small>
        </div>
        <div className="stock-kpi">
          <PackageCheck size={20} />
          <span>Products made</span>
          <strong>{s.productCount.toLocaleString()}</strong>
          <small>{s.producedKg.toLocaleString()} kg produced</small>
        </div>
      </div>

      <div className="stock-bar" aria-label={`Stock level ${pct}%`}>
        <div className="stock-bar-fill" style={{ width: `${pct}%` }} />
        <span className="stock-bar-min" style={{ left: `${minPct}%` }} title="Minimum threshold" />
      </div>

      {empty ? (
        <div className="stock-countdown danger">
          <OctagonX size={22} />
          <div>
            <strong>Production stopped: no raw material left</strong>
            <small>Add the delivered quantity below to restart.</small>
          </div>
        </div>
      ) : low ? (
        <div className="stock-countdown danger">
          <Timer size={22} />
          <div>
            <span>Time before material runs out</span>
            {remainingMs !== null ? (
              <>
                <strong className="stock-timer">{formatDuration(remainingMs)}</strong>
                <small>
                  Based on your scans: about {Math.round(rateKgH).toLocaleString()} kg/h of material
                </small>
              </>
            ) : (
              <small>Estimating… needs at least 2 scans to measure your pace.</small>
            )}
          </div>
        </div>
      ) : (
        <div className="stock-countdown">
          <AlertTriangle size={20} />
          <small>
            Shortage alert (and the run-out countdown) starts when stock reaches {s.minKg.toLocaleString()} kg.
          </small>
        </div>
      )}

      {s.alertId && (
        <p className="stock-alert-note">
          <BellRing size={14} />
          Shortage alert sent to the atelier manager
          {s.widened
            ? ", then to Production and Logistics."
            : `; Production and Logistics are notified after ${OTHERS_DELAY_SECONDS} s.`}
        </p>
      )}

      <div className="stock-controls">
        <label>
          <span>Minimum threshold (kg)</span>
          <input
            type="number"
            min="0"
            value={minDraft ?? s.minKg}
            onChange={(e) => setMinDraft(e.target.value)}
            onBlur={commitMin}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          />
        </label>

        <label>
          <span>Material</span>
          <select value={s.material} onChange={(e) => updateSettings(atelier, { material: e.target.value })}>
            {MATERIAL_OPTIONS.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </label>

        <label>
          <span>kg used per kg of product</span>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={s.ratio}
            onChange={(e) => Number(e.target.value) > 0 && updateSettings(atelier, { ratio: Number(e.target.value) })}
          />
        </label>

        <form onSubmit={submitRefill}>
          <label>
            <span>Material received (kg)</span>
            <input type="number" min="1" value={refill} onChange={(e) => setRefill(e.target.value)} placeholder="e.g. 2000" />
          </label>
          <button className="btn-secondary" disabled={!refill}>
            <Plus size={15} /> Add stock
          </button>
        </form>
      </div>
    </div>
  );
}
