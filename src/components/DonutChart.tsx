import "../styles/donut-chart.css";

export type DonutChartItem = {
  label: string;
  value: number;
  colorClass?: string;
};

type DonutChartProps = {
  items: DonutChartItem[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string | number;
};

const DEFAULT_COLOR_CLASSES = [
  "donut-chart__segment--blue",
  "donut-chart__segment--green",
  "donut-chart__segment--amber",
  "donut-chart__segment--rose",
  "donut-chart__segment--violet",
  "donut-chart__segment--slate",
];

function formatPercentage(value: number, total: number): string {
  if (total <= 0) {
    return "0%";
  }

  const percentage = (value / total) * 100;
  return `${percentage >= 10 ? percentage.toFixed(0) : percentage.toFixed(1)}%`;
}

export default function DonutChart({
  items,
  size = 180,
  thickness = 24,
  centerLabel,
  centerValue,
}: DonutChartProps) {
  const visibleItems = items.filter((item) => item.value > 0);
  const total = visibleItems.reduce((sum, item) => sum + item.value, 0);
  const radius = Math.max(1, (size - thickness) / 2);
  const circumference = 2 * Math.PI * radius;
  const segments = visibleItems.map((item, index) => ({
    item,
    offsetValue: visibleItems
      .slice(0, index)
      .reduce((sum, previousItem) => sum + previousItem.value, 0),
  }));

  return (
    <div className="donut-chart">
      <div className="donut-chart__visual" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          role="img"
          aria-label={visibleItems
            .map((item) => `${item.label}: ${item.value}, ${formatPercentage(item.value, total)}`)
            .join(". ")}
        >
          <circle
            className="donut-chart__track"
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={thickness}
          />
          {segments.map(({ item, offsetValue }, index) => {
            const segmentLength = (item.value / total) * circumference;
            const dashOffset = -(offsetValue / total) * circumference;

            return (
              <circle
                key={`${item.label}-${index}`}
                className={`donut-chart__segment ${
                  item.colorClass ??
                  DEFAULT_COLOR_CLASSES[index % DEFAULT_COLOR_CLASSES.length]
                }`}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                strokeWidth={thickness}
                strokeDasharray={`${segmentLength} ${circumference - segmentLength}`}
                strokeDashoffset={dashOffset}
                strokeLinecap="butt"
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
              >
                <title>
                  {item.label}: {item.value} ({formatPercentage(item.value, total)})
                </title>
              </circle>
            );
          })}
        </svg>
        <div className="donut-chart__center" aria-hidden="true">
          <strong>{centerValue ?? total}</strong>
          {centerLabel ? <span>{centerLabel}</span> : null}
        </div>
      </div>

      <div className="donut-chart__legend">
        {visibleItems.length ? (
          visibleItems.map((item, index) => (
            <div className="donut-chart__legend-item" key={`${item.label}-${index}`}>
              <span
                className={`donut-chart__legend-color ${
                  item.colorClass ??
                  DEFAULT_COLOR_CLASSES[index % DEFAULT_COLOR_CLASSES.length]
                }`}
                aria-hidden="true"
              />
              <span>{item.label}</span>
              <strong>
                {item.value} · {formatPercentage(item.value, total)}
              </strong>
            </div>
          ))
        ) : (
          <p className="donut-chart__empty">Sin datos</p>
        )}
      </div>
    </div>
  );
}
