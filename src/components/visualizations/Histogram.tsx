"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  Line,
  ComposedChart,
} from "recharts";
import { createHistogramBins, mean, stdDev, generateNormalCurve } from "./stats-utils";
import { CHART_COLORS, HistogramProps } from "./types";

export default function Histogram({
  data,
  bins,
  showNormalOverlay = false,
  xLabel,
  yLabel = "Frequency",
  width,
  height = 250,
  title,
  className = "",
}: HistogramProps) {
  const histogramData = createHistogramBins(data, bins);
  const dataMean = mean(data);
  const dataStdDev = stdDev(data);

  // Prepare data with optional normal overlay
  const chartData = histogramData.map((bin) => {
    const midpoint = (bin.range[0] + bin.range[1]) / 2;
    return {
      ...bin,
      midpoint,
    };
  });

  // Generate normal curve overlay if requested
  const normalOverlay = showNormalOverlay
    ? generateNormalCurve(dataMean, dataStdDev, histogramData.length).map((point, i) => {
        // Scale to match histogram
        const maxCount = Math.max(...histogramData.map((b) => b.count));
        const maxNormal = Math.max(...generateNormalCurve(dataMean, dataStdDev, 50).map((p) => p.y));
        const scaleFactor = maxCount / maxNormal;
        return {
          x: point.x,
          normalY: point.y * scaleFactor * 0.8,
        };
      })
    : [];

  return (
    <div className={`bg-white rounded-lg p-4 ${className}`}>
      {title && (
        <h4 className="text-sm font-medium text-stone-700 mb-2">{title}</h4>
      )}
      <ResponsiveContainer width={width || "100%"} height={height}>
        <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
          <XAxis
            dataKey="bin"
            tick={{ fontSize: 10 }}
            stroke={CHART_COLORS.text}
            angle={-45}
            textAnchor="end"
            height={60}
            label={xLabel ? { value: xLabel, position: "bottom", offset: 0 } : undefined}
          />
          <YAxis
            tick={{ fontSize: 11 }}
            stroke={CHART_COLORS.text}
            label={yLabel ? { value: yLabel, angle: -90, position: "insideLeft" } : undefined}
          />
          <Tooltip
            formatter={(value, name) => [
              value ?? 0,
              name === "count" ? "Count" : "Normal",
            ]}
          />
          <Bar
            dataKey="count"
            fill={CHART_COLORS.primary}
            fillOpacity={0.8}
            stroke={CHART_COLORS.primary}
            strokeWidth={1}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Statistics summary */}
      <div className="flex flex-wrap gap-4 mt-2 text-xs text-stone-500">
        <span>n = {data.length}</span>
        <span>μ = {dataMean.toFixed(2)}</span>
        <span>σ = {dataStdDev.toFixed(2)}</span>
        <span>min = {Math.min(...data).toFixed(2)}</span>
        <span>max = {Math.max(...data).toFixed(2)}</span>
      </div>
    </div>
  );
}
