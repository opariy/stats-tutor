/**
 * Visualization Types and Configurations
 */

export type VisualizationType =
  | "normal-distribution"
  | "histogram"
  | "scatter-plot"
  | "box-plot"
  | "regression"
  | "bar-chart"
  | "line-chart"
  | "probability-tree"
  | "confidence-interval";

export interface BaseVisualizationProps {
  width?: number;
  height?: number;
  title?: string;
  className?: string;
}

export interface NormalDistributionProps extends BaseVisualizationProps {
  mean?: number;
  stdDev?: number;
  showArea?: boolean;
  areaFrom?: number;
  areaTo?: number;
  showMean?: boolean;
  showStdDevLines?: boolean;
}

export interface HistogramProps extends BaseVisualizationProps {
  data: number[];
  bins?: number;
  showNormalOverlay?: boolean;
  xLabel?: string;
  yLabel?: string;
}

export interface ScatterPlotProps extends BaseVisualizationProps {
  data: Array<{ x: number; y: number; label?: string }>;
  showRegressionLine?: boolean;
  xLabel?: string;
  yLabel?: string;
  showCorrelation?: boolean;
}

export interface BoxPlotProps extends BaseVisualizationProps {
  data: number[] | Array<{ name: string; values: number[] }>;
  showOutliers?: boolean;
  horizontal?: boolean;
}

export interface RegressionProps extends BaseVisualizationProps {
  data: Array<{ x: number; y: number }>;
  showEquation?: boolean;
  showRSquared?: boolean;
  showResiduals?: boolean;
  xLabel?: string;
  yLabel?: string;
}

export interface BarChartProps extends BaseVisualizationProps {
  data: Array<{ name: string; value: number; color?: string }>;
  xLabel?: string;
  yLabel?: string;
  horizontal?: boolean;
}

export interface LineChartProps extends BaseVisualizationProps {
  data: Array<{ x: number; y: number }> | Array<{ name: string; values: number[] }>;
  xLabel?: string;
  yLabel?: string;
  showPoints?: boolean;
}

export interface ConfidenceIntervalProps extends BaseVisualizationProps {
  mean: number;
  marginOfError: number;
  confidenceLevel?: number;
  sampleSize?: number;
  showDistribution?: boolean;
}

export interface VisualizationData {
  type: VisualizationType;
  props: Record<string, unknown>;
}

// Color palette for consistent styling
export const CHART_COLORS = {
  primary: "#0d9488", // teal-600
  secondary: "#f97316", // orange-500
  tertiary: "#8b5cf6", // violet-500
  accent: "#ec4899", // pink-500
  muted: "#94a3b8", // slate-400
  background: "#f8fafc", // slate-50
  grid: "#e2e8f0", // slate-200
  text: "#334155", // slate-700
  area: "rgba(13, 148, 136, 0.2)",
  error: "#ef4444", // red-500
  success: "#22c55e", // green-500
};
