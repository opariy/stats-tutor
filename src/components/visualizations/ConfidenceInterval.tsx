"use client";

import { ResponsiveContainer } from "recharts";
import { generateNormalCurve, normalPDF, formatNumber } from "./stats-utils";
import { CHART_COLORS, ConfidenceIntervalProps } from "./types";

export default function ConfidenceInterval({
  mean,
  marginOfError,
  confidenceLevel = 0.95,
  sampleSize,
  showDistribution = true,
  width,
  height = 200,
  title,
  className = "",
}: ConfidenceIntervalProps) {
  const lower = mean - marginOfError;
  const upper = mean + marginOfError;

  // Estimate std dev from margin of error (assuming normal dist with z=1.96 for 95%)
  const zScores: Record<number, number> = { 0.9: 1.645, 0.95: 1.96, 0.99: 2.576 };
  const z = zScores[confidenceLevel] || 1.96;
  const estimatedSE = marginOfError / z;

  return (
    <div className={`bg-white rounded-lg p-4 ${className}`}>
      {title && (
        <h4 className="text-sm font-medium text-stone-700 mb-3">{title}</h4>
      )}

      {/* Visual CI representation */}
      <div className="relative" style={{ height: showDistribution ? height : 80 }}>
        {showDistribution && (
          <DistributionCurve
            mean={mean}
            se={estimatedSE}
            lower={lower}
            upper={upper}
            height={height - 50}
          />
        )}

        {/* CI Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-12 px-4">
          <CIBar mean={mean} lower={lower} upper={upper} />
        </div>
      </div>

      {/* Statistics */}
      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-center gap-2 text-sm">
          <span className="text-stone-500">{(confidenceLevel * 100).toFixed(0)}% CI:</span>
          <span className="font-mono font-medium text-teal-700">
            [{formatNumber(lower)} , {formatNumber(upper)}]
          </span>
        </div>

        <div className="flex flex-wrap justify-center gap-4 text-xs text-stone-500">
          <span>Point estimate: {formatNumber(mean)}</span>
          <span>Margin of error: ±{formatNumber(marginOfError)}</span>
          {sampleSize && <span>n = {sampleSize}</span>}
          <span>SE ≈ {formatNumber(estimatedSE)}</span>
        </div>

        {/* Interpretation */}
        <p className="text-xs text-stone-500 text-center mt-2 italic">
          We are {(confidenceLevel * 100).toFixed(0)}% confident the true population parameter
          lies between {formatNumber(lower)} and {formatNumber(upper)}.
        </p>
      </div>
    </div>
  );
}

function DistributionCurve({
  mean,
  se,
  lower,
  upper,
  height,
}: {
  mean: number;
  se: number;
  lower: number;
  upper: number;
  height: number;
}) {
  const points = 100;
  const xMin = mean - 4 * se;
  const xMax = mean + 4 * se;
  const range = xMax - xMin;

  // Generate curve points
  const curvePoints: Array<{ x: number; y: number }> = [];
  let maxY = 0;

  for (let i = 0; i <= points; i++) {
    const x = xMin + (i / points) * range;
    const y = normalPDF(x, mean, se);
    maxY = Math.max(maxY, y);
    curvePoints.push({ x, y });
  }

  // Scale to SVG coordinates
  const scaleX = (x: number) => ((x - xMin) / range) * 100;
  const scaleY = (y: number) => height - (y / maxY) * (height - 20);

  // Create path
  const pathD = curvePoints
    .map((p, i) => `${i === 0 ? "M" : "L"} ${scaleX(p.x)} ${scaleY(p.y)}`)
    .join(" ");

  // Create filled area path for CI region
  const ciPoints = curvePoints.filter((p) => p.x >= lower && p.x <= upper);
  const areaPath =
    `M ${scaleX(lower)} ${height} ` +
    ciPoints.map((p) => `L ${scaleX(p.x)} ${scaleY(p.y)}`).join(" ") +
    ` L ${scaleX(upper)} ${height} Z`;

  return (
    <svg width="100%" height={height} className="overflow-visible">
      {/* Shaded CI area */}
      <path d={areaPath} fill={CHART_COLORS.primary} fillOpacity={0.3} />

      {/* Curve */}
      <path d={pathD} fill="none" stroke={CHART_COLORS.primary} strokeWidth={2} />

      {/* Mean line */}
      <line
        x1={`${scaleX(mean)}%`}
        y1={0}
        x2={`${scaleX(mean)}%`}
        y2={height}
        stroke={CHART_COLORS.secondary}
        strokeWidth={2}
        strokeDasharray="4 4"
      />

      {/* CI bounds */}
      <line
        x1={`${scaleX(lower)}%`}
        y1={0}
        x2={`${scaleX(lower)}%`}
        y2={height}
        stroke={CHART_COLORS.primary}
        strokeWidth={1}
        strokeDasharray="2 2"
      />
      <line
        x1={`${scaleX(upper)}%`}
        y1={0}
        x2={`${scaleX(upper)}%`}
        y2={height}
        stroke={CHART_COLORS.primary}
        strokeWidth={1}
        strokeDasharray="2 2"
      />
    </svg>
  );
}

function CIBar({
  mean,
  lower,
  upper,
}: {
  mean: number;
  lower: number;
  upper: number;
}) {
  const range = upper - lower;
  const padding = range * 0.5;
  const scaleMin = lower - padding;
  const scaleMax = upper + padding;
  const scaleRange = scaleMax - scaleMin;

  const scale = (val: number) => ((val - scaleMin) / scaleRange) * 100;

  return (
    <div className="relative h-full flex items-center">
      {/* Axis line */}
      <div className="absolute inset-x-0 h-0.5 bg-stone-300 top-1/2" />

      {/* CI bar */}
      <div
        className="absolute h-3 bg-teal-500 rounded-full top-1/2 -translate-y-1/2"
        style={{
          left: `${scale(lower)}%`,
          width: `${scale(upper) - scale(lower)}%`,
        }}
      />

      {/* Lower bound marker */}
      <div
        className="absolute w-0.5 h-5 bg-teal-600 top-1/2 -translate-y-1/2"
        style={{ left: `${scale(lower)}%` }}
      />
      <span
        className="absolute text-xs text-teal-700 -translate-x-1/2"
        style={{ left: `${scale(lower)}%`, top: "75%" }}
      >
        {formatNumber(lower)}
      </span>

      {/* Mean marker */}
      <div
        className="absolute w-3 h-3 bg-orange-500 rounded-full top-1/2 -translate-y-1/2 -translate-x-1/2 border-2 border-white"
        style={{ left: `${scale(mean)}%` }}
      />

      {/* Upper bound marker */}
      <div
        className="absolute w-0.5 h-5 bg-teal-600 top-1/2 -translate-y-1/2"
        style={{ left: `${scale(upper)}%` }}
      />
      <span
        className="absolute text-xs text-teal-700 -translate-x-1/2"
        style={{ left: `${scale(upper)}%`, top: "75%" }}
      >
        {formatNumber(upper)}
      </span>
    </div>
  );
}
