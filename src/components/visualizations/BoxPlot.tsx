"use client";

import { ResponsiveContainer } from "recharts";
import { quartiles, outlierBounds, findOutliers, mean, formatNumber } from "./stats-utils";
import { CHART_COLORS, BoxPlotProps } from "./types";

interface BoxData {
  name: string;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  outliers: number[];
  mean: number;
}

export default function BoxPlot({
  data,
  showOutliers = true,
  horizontal = false,
  width,
  height = 200,
  title,
  className = "",
}: BoxPlotProps) {
  // Normalize data to array of named datasets
  const datasets: BoxData[] = Array.isArray(data) && typeof data[0] === "number"
    ? [processDataset("Data", data as number[])]
    : (data as Array<{ name: string; values: number[] }>).map((d) =>
        processDataset(d.name, d.values)
      );

  const boxHeight = horizontal ? 40 : undefined;
  const boxWidth = horizontal ? undefined : 60;

  return (
    <div className={`bg-white rounded-lg p-4 ${className}`}>
      {title && (
        <h4 className="text-sm font-medium text-stone-700 mb-3">{title}</h4>
      )}

      <div
        className={`flex ${horizontal ? "flex-col gap-4" : "flex-row gap-6 justify-center"}`}
        style={{ minHeight: height }}
      >
        {datasets.map((box, index) => (
          <SingleBoxPlot
            key={index}
            data={box}
            horizontal={horizontal}
            showOutliers={showOutliers}
            boxWidth={boxWidth}
            boxHeight={boxHeight}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-4 text-xs text-stone-500 justify-center">
        {datasets.map((box, i) => (
          <div key={i} className="flex items-center gap-1">
            <span className="font-medium">{box.name}:</span>
            <span>Med={formatNumber(box.median)}</span>
            <span>IQR={formatNumber(box.q3 - box.q1)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function processDataset(name: string, values: number[]): BoxData {
  const sorted = [...values].sort((a, b) => a - b);
  const q = quartiles(values);
  const bounds = outlierBounds(values);
  const outliers = findOutliers(values);

  // Whiskers extend to most extreme non-outlier values
  const nonOutliers = sorted.filter((v) => v >= bounds.lower && v <= bounds.upper);

  return {
    name,
    min: nonOutliers.length > 0 ? Math.min(...nonOutliers) : sorted[0],
    q1: q.q1,
    median: q.q2,
    q3: q.q3,
    max: nonOutliers.length > 0 ? Math.max(...nonOutliers) : sorted[sorted.length - 1],
    outliers,
    mean: mean(values),
  };
}

function SingleBoxPlot({
  data,
  horizontal,
  showOutliers,
  boxWidth = 60,
  boxHeight = 40,
}: {
  data: BoxData;
  horizontal: boolean;
  showOutliers: boolean;
  boxWidth?: number;
  boxHeight?: number;
}) {
  // Calculate scale
  const allValues = [data.min, data.max, ...data.outliers];
  const dataMin = Math.min(...allValues);
  const dataMax = Math.max(...allValues);
  const range = dataMax - dataMin || 1;
  const padding = range * 0.1;
  const scaleMin = dataMin - padding;
  const scaleMax = dataMax + padding;
  const scaleRange = scaleMax - scaleMin;

  const scale = (val: number) => ((val - scaleMin) / scaleRange) * 100;

  if (horizontal) {
    const y = boxHeight / 2;
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-stone-600 w-16 text-right">{data.name}</span>
        <svg width="100%" height={boxHeight} className="flex-1">
          {/* Whisker line */}
          <line
            x1={`${scale(data.min)}%`}
            y1={y}
            x2={`${scale(data.max)}%`}
            y2={y}
            stroke={CHART_COLORS.text}
            strokeWidth={1}
          />

          {/* Min whisker cap */}
          <line
            x1={`${scale(data.min)}%`}
            y1={y - 8}
            x2={`${scale(data.min)}%`}
            y2={y + 8}
            stroke={CHART_COLORS.text}
            strokeWidth={1}
          />

          {/* Max whisker cap */}
          <line
            x1={`${scale(data.max)}%`}
            y1={y - 8}
            x2={`${scale(data.max)}%`}
            y2={y + 8}
            stroke={CHART_COLORS.text}
            strokeWidth={1}
          />

          {/* Box */}
          <rect
            x={`${scale(data.q1)}%`}
            y={y - 12}
            width={`${scale(data.q3) - scale(data.q1)}%`}
            height={24}
            fill={CHART_COLORS.primary}
            fillOpacity={0.3}
            stroke={CHART_COLORS.primary}
            strokeWidth={2}
          />

          {/* Median line */}
          <line
            x1={`${scale(data.median)}%`}
            y1={y - 12}
            x2={`${scale(data.median)}%`}
            y2={y + 12}
            stroke={CHART_COLORS.secondary}
            strokeWidth={2}
          />

          {/* Mean dot */}
          <circle
            cx={`${scale(data.mean)}%`}
            cy={y}
            r={4}
            fill={CHART_COLORS.tertiary}
          />

          {/* Outliers */}
          {showOutliers && data.outliers.map((outlier, i) => (
            <circle
              key={i}
              cx={`${scale(outlier)}%`}
              cy={y}
              r={3}
              fill="none"
              stroke={CHART_COLORS.error}
              strokeWidth={1.5}
            />
          ))}
        </svg>
      </div>
    );
  }

  // Vertical box plot
  const chartHeight = 180;
  const scaleY = (val: number) => chartHeight - ((val - scaleMin) / scaleRange) * chartHeight;
  const x = boxWidth / 2;

  return (
    <div className="flex flex-col items-center">
      <svg width={boxWidth} height={chartHeight}>
        {/* Whisker line */}
        <line
          x1={x}
          y1={scaleY(data.min)}
          x2={x}
          y2={scaleY(data.max)}
          stroke={CHART_COLORS.text}
          strokeWidth={1}
        />

        {/* Min whisker cap */}
        <line
          x1={x - 10}
          y1={scaleY(data.min)}
          x2={x + 10}
          y2={scaleY(data.min)}
          stroke={CHART_COLORS.text}
          strokeWidth={1}
        />

        {/* Max whisker cap */}
        <line
          x1={x - 10}
          y1={scaleY(data.max)}
          x2={x + 10}
          y2={scaleY(data.max)}
          stroke={CHART_COLORS.text}
          strokeWidth={1}
        />

        {/* Box */}
        <rect
          x={x - 20}
          y={scaleY(data.q3)}
          width={40}
          height={scaleY(data.q1) - scaleY(data.q3)}
          fill={CHART_COLORS.primary}
          fillOpacity={0.3}
          stroke={CHART_COLORS.primary}
          strokeWidth={2}
        />

        {/* Median line */}
        <line
          x1={x - 20}
          y1={scaleY(data.median)}
          x2={x + 20}
          y2={scaleY(data.median)}
          stroke={CHART_COLORS.secondary}
          strokeWidth={2}
        />

        {/* Mean dot */}
        <circle
          cx={x}
          cy={scaleY(data.mean)}
          r={4}
          fill={CHART_COLORS.tertiary}
        />

        {/* Outliers */}
        {showOutliers && data.outliers.map((outlier, i) => (
          <circle
            key={i}
            cx={x}
            cy={scaleY(outlier)}
            r={3}
            fill="none"
            stroke={CHART_COLORS.error}
            strokeWidth={1.5}
          />
        ))}
      </svg>
      <span className="text-xs text-stone-600 mt-1">{data.name}</span>
    </div>
  );
}
