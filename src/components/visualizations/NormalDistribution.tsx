"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { generateNormalCurve, normalPDF } from "./stats-utils";
import { CHART_COLORS, NormalDistributionProps } from "./types";

export default function NormalDistribution({
  mean = 0,
  stdDev = 1,
  showArea = false,
  areaFrom,
  areaTo,
  showMean = true,
  showStdDevLines = false,
  width,
  height = 250,
  title,
  className = "",
}: NormalDistributionProps) {
  const curveData = generateNormalCurve(mean, stdDev, 150);

  // Add shaded area data if specified
  const dataWithArea = curveData.map((point) => {
    const inArea =
      showArea &&
      areaFrom !== undefined &&
      areaTo !== undefined &&
      point.x >= areaFrom &&
      point.x <= areaTo;
    return {
      ...point,
      areaY: inArea ? point.y : 0,
    };
  });

  return (
    <div className={`bg-white rounded-lg p-4 ${className}`}>
      {title && (
        <h4 className="text-sm font-medium text-stone-700 mb-2">{title}</h4>
      )}
      <ResponsiveContainer width={width || "100%"} height={height}>
        <AreaChart data={dataWithArea} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
          <XAxis
            dataKey="x"
            type="number"
            domain={["dataMin", "dataMax"]}
            tick={{ fontSize: 11 }}
            stroke={CHART_COLORS.text}
          />
          <YAxis
            tick={{ fontSize: 11 }}
            stroke={CHART_COLORS.text}
            tickFormatter={(v) => v.toFixed(2)}
          />
          <Tooltip
            formatter={(value) => [typeof value === 'number' ? value.toFixed(4) : '0', "Density"]}
            labelFormatter={(label) => `x = ${label}`}
          />

          {/* Shaded area under curve */}
          {showArea && (
            <Area
              type="monotone"
              dataKey="areaY"
              stroke="none"
              fill={CHART_COLORS.primary}
              fillOpacity={0.4}
            />
          )}

          {/* Main curve */}
          <Area
            type="monotone"
            dataKey="y"
            stroke={CHART_COLORS.primary}
            strokeWidth={2}
            fill="none"
          />

          {/* Mean line */}
          {showMean && (
            <ReferenceLine
              x={mean}
              stroke={CHART_COLORS.secondary}
              strokeWidth={2}
              strokeDasharray="5 5"
              label={{
                value: `μ = ${mean}`,
                position: "top",
                fill: CHART_COLORS.secondary,
                fontSize: 11,
              }}
            />
          )}

          {/* Standard deviation lines */}
          {showStdDevLines && (
            <>
              <ReferenceLine
                x={mean - stdDev}
                stroke={CHART_COLORS.muted}
                strokeDasharray="3 3"
                label={{ value: "-1σ", position: "bottom", fontSize: 10 }}
              />
              <ReferenceLine
                x={mean + stdDev}
                stroke={CHART_COLORS.muted}
                strokeDasharray="3 3"
                label={{ value: "+1σ", position: "bottom", fontSize: 10 }}
              />
              <ReferenceLine
                x={mean - 2 * stdDev}
                stroke={CHART_COLORS.muted}
                strokeDasharray="3 3"
                label={{ value: "-2σ", position: "bottom", fontSize: 10 }}
              />
              <ReferenceLine
                x={mean + 2 * stdDev}
                stroke={CHART_COLORS.muted}
                strokeDasharray="3 3"
                label={{ value: "+2σ", position: "bottom", fontSize: 10 }}
              />
            </>
          )}
        </AreaChart>
      </ResponsiveContainer>

      {/* Legend/Info */}
      <div className="flex flex-wrap gap-4 mt-2 text-xs text-stone-500">
        <span>μ = {mean}</span>
        <span>σ = {stdDev}</span>
        {showArea && areaFrom !== undefined && areaTo !== undefined && (
          <span className="text-teal-600">
            P({areaFrom} ≤ X ≤ {areaTo}) ≈{" "}
            {calculateAreaProbability(mean, stdDev, areaFrom, areaTo).toFixed(4)}
          </span>
        )}
      </div>
    </div>
  );
}

// Approximate area under normal curve using numerical integration
function calculateAreaProbability(
  mean: number,
  stdDev: number,
  from: number,
  to: number
): number {
  const steps = 1000;
  const stepSize = (to - from) / steps;
  let area = 0;

  for (let i = 0; i < steps; i++) {
    const x = from + i * stepSize;
    area += normalPDF(x, mean, stdDev) * stepSize;
  }

  return area;
}
