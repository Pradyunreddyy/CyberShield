import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { titleCase } from "../utils/formatters";
import { useReducedMotion } from "../hooks/useReducedMotion";

// One source of truth for chart styling. SVG needs literal colors, so these
// mirror tailwind.config.js (keep them in sync when tokens change).
export const SEVERITY_COLORS = { critical: "#FF6C78", high: "#FF9F43", medium: "#F0C93D", low: "#9AA7BF" };
export const STATUS_COLORS = { open: "#398BFF", investigating: "#F0C93D", contained: "#FF9F43", resolved: "#2ED573", closed: "#94A2BE" };
export const ACCENT = "#398BFF"; // Electric Blue
export const VIOLET = "#9875FF"; // Violet
const FALLBACK = "#94A2BE";

export const axisProps = { tick: { fontSize: 11, fill: "#94A2BE" }, axisLine: false, tickLine: false };
export const gridProps = { stroke: "rgba(152,176,230,0.1)", strokeDasharray: "3 3" };
export const barCursor = { fill: "rgba(152,176,230,0.07)" };
export const lineCursor = { stroke: "rgba(152,176,230,0.35)", strokeWidth: 1 };

// Recharts animates in JS, so reduced-motion has to be applied here.
export function useChartMotion() {
  const reduce = useReducedMotion();
  return { isAnimationActive: !reduce, animationDuration: 600, animationEasing: "ease-out" };
}

export const colorFor = (map, key) => map[key] || FALLBACK;

// The single tooltip for every chart. Light text on an opaque raised surface
// (about 14:1), with a colour swatch so series stay identifiable.
//  - categorical charts (pie / bars keyed by `label`): one row per category
//  - time series: the date is the heading and `seriesName` names the value
export function ChartTooltip({ active, payload, label, labelFormatter, colors, total, seriesName }) {
  if (!active || !payload || payload.length === 0) return null;
  const categorical = payload[0].payload?.label != null;
  const heading = !categorical && label != null && label !== "" ? (labelFormatter ? labelFormatter(label) : label) : null;

  return (
    <div className="glass-strong min-w-[8.5rem] rounded-md px-3 py-2 text-xs">
      {heading && <div className="mb-1.5 font-medium text-ink">{heading}</div>}
      <ul className="space-y-1">
        {payload.map((entry, i) => {
          const key = categorical ? entry.payload.label : entry.dataKey;
          const name = categorical
            ? titleCase(String(entry.payload.label))
            : seriesName || titleCase(String(entry.name ?? entry.dataKey ?? "Value"));
          const swatch = (categorical && colors && colors[entry.payload.label]) || entry.payload?.fill || entry.color || FALLBACK;
          const pct = total ? ` (${Math.round((entry.value / total) * 100)}%)` : "";
          return (
            <li key={`${key}-${i}`} className="flex items-center justify-between gap-5 text-ink">
              <span className="flex items-center gap-2">
                <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-sm" style={{ background: swatch }} />
                {name}
              </span>
              <span className="tnum font-mono font-medium text-ink">
                {entry.value}
                <span className="text-ink-muted">{pct}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// Charts are SVG: invisible to assistive tech. The visual is hidden from it and
// replaced with a plain-language summary built from the same data.
export function ChartFrame({ summary, children, className = "" }) {
  return (
    <figure className={className}>
      <div aria-hidden="true">{children}</div>
      <figcaption className="sr-only">{summary}</figcaption>
    </figure>
  );
}

export function summarize(title, rows, fmt = (r) => titleCase(String(r.label))) {
  if (!rows || rows.length === 0) return `${title}: no data.`;
  return `${title}: ${rows.map((r) => `${fmt(r)} ${r.count}`).join(", ")}.`;
}

// Donut with the total in the middle and a legend that carries the numbers, so
// nothing depends on hovering.
export function DonutChart({ data, colors, centerLabel = "Total", summaryTitle }) {
  const motion = useChartMotion();
  const total = data.reduce((sum, d) => sum + d.count, 0);

  if (total === 0) {
    return <p className="py-10 text-center text-sm text-ink-muted">No data to chart yet.</p>;
  }

  return (
    <ChartFrameWithLegend
      summary={summarize(summaryTitle || "Distribution", data)}
      chart={
        <div className="relative h-44">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart accessibilityLayer={false}>
              <Pie
                data={data}
                dataKey="count"
                nameKey="label"
                rootTabIndex={-1}
                innerRadius={52}
                outerRadius={78}
                paddingAngle={2}
                stroke="none"
                {...motion}
              >
                {data.map((entry) => (
                  <Cell key={entry.label} fill={colorFor(colors, entry.label)} />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip colors={colors} total={total} />} wrapperStyle={{ outline: "none", zIndex: 20 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="tnum font-mono text-2xl font-semibold text-ink">{total}</span>
            <span className="text-xs text-ink-muted">{centerLabel}</span>
          </div>
        </div>
      }
      legend={
        <ul className="mt-3 space-y-1.5">
          {data.map((d) => (
            <li key={d.label} className="flex items-center justify-between gap-3 text-sm">
              <span className="flex items-center gap-2 text-ink-muted">
                <span aria-hidden="true" className="h-2.5 w-2.5 rounded-sm" style={{ background: colorFor(colors, d.label) }} />
                {titleCase(String(d.label))}
              </span>
              <span className="tnum font-mono text-ink">
                {d.count}
                <span className="ml-2 text-xs text-ink-muted">{Math.round((d.count / total) * 100)}%</span>
              </span>
            </li>
          ))}
        </ul>
      }
    />
  );
}

// Legend stays readable by assistive tech; only the SVG is hidden from it.
function ChartFrameWithLegend({ summary, chart, legend }) {
  return (
    <div>
      <ChartFrame summary={summary}>{chart}</ChartFrame>
      {legend}
    </div>
  );
}

export const shortDate = (iso) => {
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const VALUE_LABEL = { fill: "#E8EDF8", fontSize: 11, fontFamily: "JetBrains Mono, monospace" };

// Counts per day. Linear (not smoothed): a smoothed curve implies values
// between days that do not exist.
export function TimeSeriesChart({ data, color = ACCENT, colorEnd, seriesName = "Count", height = 232, gradientId = "ts-gradient" }) {
  const motion = useChartMotion();
  return (
    <ChartFrame summary={summarize(`${seriesName} per day`, data.map((r) => ({ label: shortDate(r.date), count: r.count })), (r) => r.label)}>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart accessibilityLayer={false} data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.28} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
            <linearGradient id={`${gradientId}-stroke`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={color} />
              <stop offset="100%" stopColor={colorEnd || color} />
            </linearGradient>
          </defs>
          <CartesianGrid {...gridProps} vertical={false} />
          <XAxis dataKey="date" {...axisProps} tickFormatter={shortDate} interval="preserveStartEnd" minTickGap={28} />
          <YAxis {...axisProps} allowDecimals={false} width={40} />
          <Tooltip cursor={lineCursor} content={<ChartTooltip seriesName={seriesName} labelFormatter={shortDate} />} wrapperStyle={{ outline: "none", zIndex: 20 }} />
          <Area
            type="linear"
            dataKey="count"
            stroke={`url(#${gradientId}-stroke)`}
            fill={`url(#${gradientId})`}
            strokeWidth={2}
            activeDot={{ r: 4.5, stroke: "#111C32", strokeWidth: 2, fill: colorEnd || color }}
            {...motion}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

// Ranked categories, one bar each, with the value printed at the bar end.
export function HorizontalBarChart({ data, summaryTitle, color = ACCENT }) {
  const motion = useChartMotion();
  return (
    <ChartFrame summary={summarize(summaryTitle, data)}>
      <ResponsiveContainer width="100%" height={Math.max(180, data.length * 34 + 16)}>
        <BarChart accessibilityLayer={false} data={data} layout="vertical" margin={{ top: 0, right: 28, left: 0, bottom: 0 }}>
          <CartesianGrid {...gridProps} horizontal={false} />
          <XAxis type="number" hide allowDecimals={false} />
          <YAxis type="category" dataKey="label" width={132} {...axisProps} tickFormatter={(v) => titleCase(v)} />
          <Tooltip cursor={barCursor} content={<ChartTooltip />} wrapperStyle={{ outline: "none", zIndex: 20 }} />
          <Bar dataKey="count" fill={color} radius={[0, 3, 3, 0]} barSize={16} {...motion}>
            <LabelList dataKey="count" position="right" {...VALUE_LABEL} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

// Few categories with meaningful colours (e.g. status), values on top.
export function ColumnChart({ data, colors, summaryTitle, height = 232 }) {
  const motion = useChartMotion();
  return (
    <ChartFrame summary={summarize(summaryTitle, data)}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart accessibilityLayer={false} data={data} margin={{ top: 20, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid {...gridProps} vertical={false} />
          <XAxis dataKey="label" {...axisProps} tickFormatter={(v) => titleCase(v)} />
          <YAxis {...axisProps} allowDecimals={false} width={40} />
          <Tooltip cursor={barCursor} content={<ChartTooltip colors={colors} />} wrapperStyle={{ outline: "none", zIndex: 20 }} />
          <Bar dataKey="count" radius={[3, 3, 0, 0]} maxBarSize={56} {...motion}>
            {data.map((entry) => (
              <Cell key={entry.label} fill={colorFor(colors, entry.label)} />
            ))}
            <LabelList dataKey="count" position="top" {...VALUE_LABEL} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
