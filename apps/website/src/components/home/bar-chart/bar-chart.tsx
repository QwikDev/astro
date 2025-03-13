import { component$, useStylesScoped$ } from "@qwik.dev/core";
import styles from "./bar-chart.css?inline";

interface BarChartProps {
  data: { label: string; value: number }[];
  width?: number;
  height?: number;
}

export const BarChart = component$((props: BarChartProps) => {
  const { data, width = 600, height = 400 } = props;
  useStylesScoped$(styles);

  // Calculate dimensions
  const padding = 40;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const maxValue = Math.max(...data.map((d) => d.value));
  const barWidth = chartWidth / data.length;

  // Generate grid lines
  const gridLines = Array.from({ length: 5 }, (_, i) => {
    const y = height - padding - chartHeight * (i / 4);
    const value = Math.round((maxValue * i) / 4);
    return { y, value };
  });

  return (
    <svg width={width} height={height}>
      <title>Bar Chart</title>
      {/* Background */}
      <rect width={width} height={height} fill="var(--off-black)" />

      {/* Grid lines */}
      {gridLines.map(({ y, value }) => (
        <g key={y}>
          <line
            x1={padding}
            y1={y}
            x2={width - padding}
            y2={y}
            stroke="var(--neutral-800)"
            stroke-width="1"
          />
          <text
            x={padding - 10}
            y={y}
            text-anchor="end"
            alignment-baseline="middle"
            fill="var(--neutral-400)"
            font-size="var(--step--2)"
          >
            {value}
          </text>
        </g>
      ))}

      {/* Bars */}
      {data.map((item, index) => {
        const barHeight = (item.value / maxValue) * chartHeight;
        const x = padding + index * barWidth;
        const y = height - padding - barHeight;

        return (
          <g key={item.label}>
            {/* Bar */}
            <rect
              class="bar-chart-bar"
              x={x + barWidth * 0.1}
              y={y}
              width={barWidth * 0.8}
              height={barHeight}
              fill="var(--purple-400)"
              opacity="0.9"
            />

            {/* Label */}
            <text
              x={x + barWidth / 2}
              y={height - padding + 20}
              text-anchor="middle"
              fill="var(--purple-100)"
              font-size="var(--step--2)"
            >
              {item.label}
            </text>

            {/* Value */}
            <text
              x={x + barWidth / 2}
              y={y - 8}
              text-anchor="middle"
              fill="var(--purple-200)"
              font-size="var(--step--2)"
            >
              {item.value}
            </text>
          </g>
        );
      })}
    </svg>
  );
});
