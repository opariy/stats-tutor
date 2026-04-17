"use client";

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  Line,
  ComposedChart,
  Legend,
} from "recharts";
import { linearRegression, correlation, formatNumber } from "./stats-utils";
import { CHART_COLORS, ScatterPlotProps } from "./types";

export default function ScatterPlot({
  data,
  showRegressionLine = false,
  showCorrelation = true,
  xLabel,
  yLabel,
  width,
  height = 300,
  title,
  className = "",
}: ScatterPlotProps) {
  const regression = linearRegression(data);
  const r = correlation(data);

  // Calculate regression line points
  const xValues = data.map((p) => p.x);
  const minX = Math.min(...xValues);
  const maxX = Math.max(...xValues);
  const regressionLineData = [
    { x: minX, regY: regression.slope * minX + regression.intercept },
    { x: maxX, regY: regression.slope * maxX + regression.intercept },
  ];

  // Merge data for composed chart
  const combinedData = data.map((point) => ({
    ...point,
    regY: regression.slope * point.x + regression.intercept,
  }));

  return (
    <div className={`bg-white rounded-lg p-4 ${className}`}>
      {title && (
        <h4 className="text-sm font-medium text-stone-700 mb-2">{title}</h4>
      )}
      <ResponsiveContainer width={width || "100%"} height={height}>
        <ComposedChart
          data={combinedData}
          margin={{ top: 10, right: 20, left: 10, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
          <XAxis
            dataKey="x"
            type="number"
            domain={["dataMin - 1", "dataMax + 1"]}
            tick={{ fontSize: 11 }}
            stroke={CHART_COLORS.text}
            label={xLabel ? { value: xLabel, position: "bottom", offset: 0 } : undefined}
          />
          <YAxis
            type="number"
            domain={["dataMin - 1", "dataMax + 1"]}
            tick={{ fontSize: 11 }}
            stroke={CHART_COLORS.text}
            label={yLabel ? { value: yLabel, angle: -90, position: "insideLeft" } : undefined}
          />
          <Tooltip
            formatter={(value, name) => [
              formatNumber(typeof value === 'number' ? value : 0),
              name === "y" ? "Value" : "Predicted",
            ]}
            labelFormatter={(label) => `x = ${label}`}
          />

          {/* Scatter points */}
          <Scatter
            dataKey="y"
            fill={CHART_COLORS.primary}
            stroke={CHART_COLORS.primary}
            strokeWidth={1}
          />

          {/* Regression line */}
          {showRegressionLine && (
            <Line
              dataKey="regY"
              stroke={CHART_COLORS.secondary}
              strokeWidth={2}
              dot={false}
              activeDot={false}
              legendType="none"
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>

      {/* Statistics */}
      <div className="flex flex-wrap gap-4 mt-2 text-xs text-stone-500">
        <span>n = {data.length}</span>
        {showCorrelation && (
          <span className={r > 0 ? "text-teal-600" : "text-orange-600"}>
            r = {formatNumber(r, 4)}
          </span>
        )}
        {showRegressionLine && (
          <>
            <span>
              ŷ = {formatNumber(regression.slope, 3)}x{" "}
              {regression.intercept >= 0 ? "+" : ""}{" "}
              {formatNumber(regression.intercept, 3)}
            </span>
            <span>R² = {formatNumber(regression.rSquared, 4)}</span>
          </>
        )}
      </div>

      {/* Correlation strength indicator */}
      {showCorrelation && (
        <div className="mt-2">
          <CorrelationStrength r={r} />
        </div>
      )}
    </div>
  );
}

function CorrelationStrength({ r }: { r: number }) {
  const absR = Math.abs(r);
  let strength: string;
  let color: string;

  if (absR >= 0.9) {
    strength = "Very strong";
    color = "bg-teal-500";
  } else if (absR >= 0.7) {
    strength = "Strong";
    color = "bg-teal-400";
  } else if (absR >= 0.5) {
    strength = "Moderate";
    color = "bg-amber-400";
  } else if (absR >= 0.3) {
    strength = "Weak";
    color = "bg-orange-400";
  } else {
    strength = "Very weak / None";
    color = "bg-stone-300";
  }

  const direction = r >= 0 ? "positive" : "negative";

  return (
    <div className="flex items-center gap-2 text-xs">
      <div className={`w-3 h-3 rounded-full ${color}`} />
      <span className="text-stone-600">
        {strength} {direction} correlation
      </span>
    </div>
  );
}
