// Dependency-free SVG/CSS chart primitives (no chart library needed).

const niceMax = (max) => {
  if (max <= 0) return 1;
  const pow = 10 ** Math.floor(Math.log10(max));
  const n = max / pow;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow;
};

export const ChartEmpty = ({ children = "No data in this period yet." }) => (
  <p className="chart-empty">{children}</p>
);

/** Vertical bars. data = [{ label, value }] */
export function BarChart({ data, format = (v) => v, color = "#3AAA35" }) {
  const max = Math.max(...data.map((d) => d.value), 0);
  if (max === 0) return <ChartEmpty />;

  const W = 600, H = 230, L = 52, R = 8, T = 16, B = 28;
  const top = niceMax(max);
  const innerW = W - L - R, innerH = H - T - B;
  const slot = innerW / data.length;
  const barW = Math.min(44, slot * 0.62);
  const y = (v) => T + innerH - (v / top) * innerH;
  const labelEvery = Math.ceil(data.length / 12);

  return (
    <svg className="chart-svg" viewBox={`0 0 ${W} ${H}`} role="img">
      {[0, 1, 2, 3, 4].map((i) => {
        const v = (top / 4) * i;
        return (
          <g key={i}>
            <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} className="chart-grid" />
            <text x={L - 8} y={y(v) + 4} textAnchor="end" className="chart-axis">{format(v)}</text>
          </g>
        );
      })}
      {data.map((d, i) => {
        const x = L + slot * i + (slot - barW) / 2;
        const h = (d.value / top) * innerH;
        return (
          <g key={i}>
            <rect x={x} y={y(d.value)} width={barW} height={Math.max(h, d.value > 0 ? 2 : 0)} rx="4" fill={color}>
              <title>{`${d.label}: ${format(d.value)}`}</title>
            </rect>
            {data.length <= 8 && d.value > 0 && (
              <text x={x + barW / 2} y={y(d.value) - 5} textAnchor="middle" className="chart-value">{format(d.value)}</text>
            )}
            {i % labelEvery === 0 && (
              <text x={x + barW / 2} y={H - 8} textAnchor="middle" className="chart-axis">{d.label}</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/** Ring chart + legend. data = [{ label, value, color }]; highlight = index to emphasise */
export function Donut({ data, format = (v) => v, centerLabel = "Total", highlight = null }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <ChartEmpty />;

  const R = 64, C = 2 * Math.PI * R;
  let acc = 0;

  return (
    <div className="donut-wrap">
      <svg className="donut-svg" viewBox="0 0 180 180" role="img">
        <circle cx="90" cy="90" r={R} className="donut-track" />
        {data.map((d, i) => {
          const len = (d.value / total) * C;
          const el = (
            <circle
              key={i}
              cx="90" cy="90" r={R}
              fill="none"
              stroke={d.color}
              strokeWidth="26"
              strokeDasharray={`${Math.max(len - 1.5, 0)} ${C - Math.max(len - 1.5, 0)}`}
              strokeDashoffset={-acc}
              transform="rotate(-90 90 90)"
              opacity={highlight === null || highlight === i ? 1 : 0.3}
            >
              <title>{`${d.label}: ${format(d.value)} (${Math.round((d.value / total) * 100)}%)`}</title>
            </circle>
          );
          acc += len;
          return el;
        })}
        <text x="90" y="86" textAnchor="middle" className="donut-total">{format(total)}</text>
        <text x="90" y="104" textAnchor="middle" className="chart-axis">{centerLabel}</text>
      </svg>

      <ul className="donut-legend">
        {data.map((d, i) => (
          <li key={d.label} className={highlight === i ? "is-me" : ""}>
            <i style={{ background: d.color }} />
            <span>{d.label}</span>
            <strong>{Math.round((d.value / total) * 100)}%</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Horizontal bars. rows = [{ label, value, max, display, color, marker }] (marker = 0..1 position of a limit line) */
export function HBars({ rows, empty }) {
  if (rows.length === 0 || rows.every((r) => !r.value)) return <ChartEmpty>{empty}</ChartEmpty>;
  return (
    <ul className="hbars">
      {rows.map((r) => (
        <li key={r.label}>
          <span className="hbars-label">{r.label}</span>
          <div className="hbars-track">
            <div className="hbars-fill" style={{ width: `${Math.min(100, (r.value / (r.max || 1)) * 100)}%`, background: r.color }} />
            {r.marker != null && <i className="hbars-marker" style={{ left: `${Math.min(100, r.marker * 100)}%` }} title="Minimum threshold" />}
          </div>
          <strong className="hbars-value">{r.display}</strong>
        </li>
      ))}
    </ul>
  );
}
