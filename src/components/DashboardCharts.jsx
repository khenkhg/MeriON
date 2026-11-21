import { useMemo, useState } from "react";
import { useBarcode } from "../context/BarcodeContext";
import { useAlerts } from "../context/AlertContext";
import { useMaterial } from "../context/MaterialContext";
import { useOrders } from "../context/OrderContext";
import { ATELIER_NAMES } from "../data/ateliers";
import {
  RANGES, ATELIER_COLORS, outputEvents, trendSeries, shareByAtelier, wipByAtelier, clientShare,
  downtimeByAtelier, breakdownsByMachine, alertsByType, fmtKg, fmtCount, fmtMinutes,
  readyEvents, readyMix, stockVsOrders, ordersByClient, departuresTimeline,
} from "../data/analytics";
import { BarChart, Donut, HBars } from "./charts";

const QUALITY_TYPES = ["quality", "scrap", "return", "dwell_nc"];

function Card({ eyebrow, title, note, wide, children }) {
  return (
    <section className={`chart-card${wide ? " wide" : ""}`}>
      <span className="eyebrow">{eyebrow}</span>
      <h3>{title}</h3>
      {children}
      {note && <p className="chart-note">{note}</p>}
    </section>
  );
}

function Segmented({ value, onChange, options }) {
  return (
    <div className="chart-seg" role="tablist">
      {options.map((o) => (
        <button key={o.id} type="button" className={value === o.id ? "active" : ""} onClick={() => onChange(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function DashboardCharts({ role, atelier }) {
  const { products, semiFiniProducts } = useBarcode();
  const { alerts, now } = useAlerts();
  const { getStock } = useMaterial();
  const { orders } = useOrders();

  const isCommercial = role === "Commercial Manager" && !atelier;
  const [range, setRange] = useState("7d");
  const [metric, setMetric] = useState("kg");

  const events = useMemo(() => outputEvents(products, semiFiniProducts), [products, semiFiniProducts]);
  const fmt = metric === "kg" ? fmtKg : fmtCount;
  const metricName = metric === "kg" ? "tonnage" : "products";

  // Commercial Manager: ready stock, open orders and clients (recomputed once a minute, not every second)
  const at = Math.floor(now / 60000) * 60000;
  const commercial = useMemo(() => {
    if (!isCommercial) return null;
    const ready = readyEvents(products);
    return {
      trend: trendSeries(ready, range, at, metric),
      mix: readyMix(ready, range, at, metric),
      coverage: stockVsOrders(products, orders),
      clients: ordersByClient(orders),
      departures: departuresTimeline(orders, at),
    };
  }, [isCommercial, products, orders, range, metric, at]);

  const commercialCharts = commercial
    ? {
        readyTrend: (
          <Card key="readyTrend" wide eyebrow="READY TO SHIP" title="Conforming output"
            note={`Each bar = ${metricName} that became ready to ship in that ${{ "24h": "hour", "7d": "day" }[range] || "month"}.`}>
            <BarChart data={commercial.trend} format={fmt} color="#3AAA35" />
          </Card>
        ),

        mix: (
          <Card key="mix" eyebrow="PRODUCT MIX" title="What we produced"
            note="Ready products by catalog item, in the selected period.">
            <Donut data={commercial.mix} format={fmt} centerLabel={metricName} />
          </Card>
        ),

        coverage: (() => {
          const rows = commercial.coverage;
          const max = Math.max(...rows.flatMap((r) => [r.stockKg, r.demandKg]), 1);
          return (
            <Card key="coverage" eyebrow="STOCK VS DEMAND" title="Ready stock against open orders"
              note="Bar = ready stock, tick = what open orders need. Amber means production is still required. Figures read stock / orders.">
              <HBars
                empty="No ready stock or open order yet."
                rows={rows.map((r) => ({
                  label: `${r.ref} · ${r.name}`,
                  value: r.stockKg, max,
                  marker: r.demandKg > 0 ? r.demandKg / max : null,
                  markerLabel: "Open orders",
                  color: r.stockKg >= r.demandKg ? "#3AAA35" : "#f59e0b",
                  display: `${fmtKg(r.stockKg)} / ${fmtKg(r.demandKg)}`,
                }))}
              />
            </Card>
          );
        })(),

        ordersByClient: (() => {
          const list = commercial.clients;
          const max = Math.max(...list.map((c) => c.kg), 1);
          return (
            <Card key="ordersByClient" eyebrow="DEMAND" title="Open orders by client"
              note="Quantity still to deliver. Figures read number of orders · quantity.">
              <HBars
                empty="No open orders."
                rows={list.map((c) => ({
                  label: c.client, value: c.kg, max, color: "#3b82f6",
                  display: `${c.count} · ${fmtKg(c.kg)}`,
                }))}
              />
            </Card>
          );
        })(),

        departures: (
          <Card key="departures" wide eyebrow="SHIPMENTS" title="Upcoming departures"
            note="Quantity leaving each day over the next 10 days. Late = open orders whose departure time has passed.">
            <BarChart data={commercial.departures} format={fmtKg} color="#3b82f6" />
          </Card>
        ),
      }
    : {};

  const charts = {
    trend: (
      <Card key="trend" wide eyebrow="PRODUCTION TREND" title={atelier ? `Atelier ${atelier} · ${ATELIER_NAMES[atelier]} output` : "Plant output"}
        note={`Each bar = ${metricName} processed by ${atelier ? "your atelier" : "the ateliers"} in that period.`}>
        <BarChart data={trendSeries(events, range, now, metric, atelier)} format={fmt} color={atelier ? ATELIER_COLORS[atelier] : "#3AAA35"} />
      </Card>
    ),

    share: (
      <Card key="share" eyebrow="WORKLOAD SPLIT" title="Share of work by atelier"
        note={atelier ? "Your atelier is highlighted." : "Work done by each atelier in the selected period."}>
        <Donut data={shareByAtelier(events, range, now, metric)} format={fmt} centerLabel={metricName} highlight={atelier ? atelier - 1 : null} />
      </Card>
    ),

    wip: (() => {
      const wip = wipByAtelier(semiFiniProducts);
      const max = Math.max(...wip.map((w) => w.kg), 1);
      return (
        <Card key="wip" eyebrow="BOTTLENECKS" title="Semi-fini waiting in front of each workshop"
          note="A long bar means products are piling up before that atelier.">
          <HBars
            empty="Nothing is waiting between workshops."
            rows={wip.map((w) => ({
              label: `Atelier ${w.atelier} · ${ATELIER_NAMES[w.atelier]}`,
              value: w.kg, max, color: ATELIER_COLORS[w.atelier],
              display: `${w.count} · ${fmtKg(w.kg)}`,
            }))}
          />
        </Card>
      );
    })(),

    stock: (
      <Card key="stock" eyebrow="RAW MATERIAL" title="Stock vs minimum threshold" note="The red tick is each atelier's minimum; bars turn red below it.">
        <HBars
          rows={[1, 2, 3, 4, 5].map((n) => {
            const s = getStock(n);
            const cap = Math.max(s.capacityKg, s.stockKg, 1);
            return {
              label: `Atelier ${n} · ${s.material}`,
              value: s.stockKg, max: cap, marker: s.minKg / cap,
              color: s.stockKg <= s.minKg ? "#D62828" : "#3AAA35",
              display: fmtKg(s.stockKg),
            };
          })}
        />
      </Card>
    ),

    downtime: (
      <Card key="downtime" eyebrow="MAINTENANCE" title="Machine downtime by atelier" note="Includes breakdowns still open.">
        <BarChart data={downtimeByAtelier(alerts, range, now)} format={fmtMinutes} color="#D62828" />
      </Card>
    ),

    machines: (
      <Card key="machines" eyebrow="MAINTENANCE" title="Most failing machines">
        <HBars
          empty="No breakdown in this period."
          rows={(() => {
            const list = breakdownsByMachine(alerts, range, now);
            const max = Math.max(...list.map((m) => m.count), 1);
            return list.map((m) => ({
              label: m.label, value: m.count, max, color: "#f59e0b",
              display: `${m.count} · ${fmtMinutes(m.minutes)}`,
            }));
          })()}
        />
      </Card>
    ),

    types: (() => {
      const list = alertsByType(alerts, range, now);
      const max = Math.max(...list.map((a) => a.count), 1);
      return (
        <Card key="types" eyebrow="ALERTS" title="Alerts by type">
          <HBars empty="No alert in this period." rows={list.map((a) => ({ label: a.title ?? a.label, value: a.count, max, color: "#3b82f6", display: a.count }))} />
        </Card>
      );
    })(),

    quality: (() => {
      const list = alertsByType(alerts, range, now, QUALITY_TYPES);
      const max = Math.max(...list.map((a) => a.count), 1);
      return (
        <Card key="quality" eyebrow="QUALITY" title="Quality-related alerts">
          <HBars empty="No quality alert in this period." rows={list.map((a) => ({ label: a.label, value: a.count, max, color: "#f43f5e", display: a.count }))} />
        </Card>
      );
    })(),

    clients: (
      <Card key="clients" eyebrow="CLIENTS" title="Tonnage share by client" note="All ready stock, whatever the selected period.">
        <Donut data={clientShare(products)} format={fmtKg} centerLabel="ready" />
      </Card>
    ),

    ...commercialCharts,
  };

  const byRole = {
    DG: ["trend", "share", "downtime", "types", "wip", "stock"],
    "Production Manager": ["trend", "share", "wip", "stock"],
    "Maintenance Manager": ["downtime", "machines"],
    "Logistics Manager": ["stock", "wip"],
    "Quality Manager": ["quality"],
    "Commercial Manager": ["readyTrend", "clients", "mix", "coverage", "ordersByClient", "departures"],
  };
  const keys = atelier ? ["trend", "share"] : byRole[role];
  if (!keys) return null;

  // charts that show the situation right now ignore the period selector
  const SNAPSHOT = ["stock", "wip", "clients", "coverage", "ordersByClient", "departures"];
  const timed = keys.some((k) => !SNAPSHOT.includes(k));
  const hasMetric = keys.some((k) => ["trend", "share", "readyTrend", "mix"].includes(k));

  return (
    <section className="chart-section">
      <div className="chart-toolbar">
        <div className="chart-controls">
          {hasMetric && (
            <Segmented value={metric} onChange={setMetric} options={[{ id: "kg", label: "Tonnage" }, { id: "count", label: "Products" }]} />
          )}
          {timed && <Segmented value={range} onChange={setRange} options={RANGES} />}
        </div>
      </div>

      <div className="chart-grid-layout">{keys.map((k) => charts[k])}</div>
    </section>
  );
}
