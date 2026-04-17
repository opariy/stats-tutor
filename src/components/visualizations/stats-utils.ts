/**
 * Statistical utility functions for visualizations
 */

// Standard normal distribution PDF
export function normalPDF(x: number, mean = 0, stdDev = 1): number {
  const coefficient = 1 / (stdDev * Math.sqrt(2 * Math.PI));
  const exponent = -0.5 * Math.pow((x - mean) / stdDev, 2);
  return coefficient * Math.exp(exponent);
}

// Generate normal distribution curve data points
export function generateNormalCurve(
  mean = 0,
  stdDev = 1,
  points = 100
): Array<{ x: number; y: number }> {
  const data: Array<{ x: number; y: number }> = [];
  const xMin = mean - 4 * stdDev;
  const xMax = mean + 4 * stdDev;
  const step = (xMax - xMin) / points;

  for (let x = xMin; x <= xMax; x += step) {
    data.push({ x: Math.round(x * 100) / 100, y: normalPDF(x, mean, stdDev) });
  }

  return data;
}

// Calculate mean
export function mean(data: number[]): number {
  if (data.length === 0) return 0;
  return data.reduce((sum, val) => sum + val, 0) / data.length;
}

// Calculate standard deviation
export function stdDev(data: number[], population = false): number {
  if (data.length < 2) return 0;
  const avg = mean(data);
  const squaredDiffs = data.map((val) => Math.pow(val - avg, 2));
  const divisor = population ? data.length : data.length - 1;
  return Math.sqrt(squaredDiffs.reduce((sum, val) => sum + val, 0) / divisor);
}

// Calculate variance
export function variance(data: number[], population = false): number {
  return Math.pow(stdDev(data, population), 2);
}

// Calculate median
export function median(data: number[]): number {
  if (data.length === 0) return 0;
  const sorted = [...data].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

// Calculate quartiles
export function quartiles(data: number[]): { q1: number; q2: number; q3: number } {
  const sorted = [...data].sort((a, b) => a - b);
  const q2 = median(sorted);
  const mid = Math.floor(sorted.length / 2);
  const lower = sorted.slice(0, mid);
  const upper = sorted.length % 2 === 0 ? sorted.slice(mid) : sorted.slice(mid + 1);
  return {
    q1: median(lower),
    q2,
    q3: median(upper),
  };
}

// Calculate IQR and outlier bounds
export function outlierBounds(data: number[]): {
  lower: number;
  upper: number;
  iqr: number;
} {
  const { q1, q3 } = quartiles(data);
  const iqr = q3 - q1;
  return {
    lower: q1 - 1.5 * iqr,
    upper: q3 + 1.5 * iqr,
    iqr,
  };
}

// Identify outliers
export function findOutliers(data: number[]): number[] {
  const { lower, upper } = outlierBounds(data);
  return data.filter((val) => val < lower || val > upper);
}

// Calculate correlation coefficient (Pearson)
export function correlation(
  data: Array<{ x: number; y: number }>
): number {
  if (data.length < 2) return 0;

  const n = data.length;
  const sumX = data.reduce((sum, p) => sum + p.x, 0);
  const sumY = data.reduce((sum, p) => sum + p.y, 0);
  const sumXY = data.reduce((sum, p) => sum + p.x * p.y, 0);
  const sumX2 = data.reduce((sum, p) => sum + p.x * p.x, 0);
  const sumY2 = data.reduce((sum, p) => sum + p.y * p.y, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt(
    (n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY)
  );

  return denominator === 0 ? 0 : numerator / denominator;
}

// Calculate linear regression
export function linearRegression(
  data: Array<{ x: number; y: number }>
): { slope: number; intercept: number; rSquared: number } {
  if (data.length < 2) return { slope: 0, intercept: 0, rSquared: 0 };

  const n = data.length;
  const sumX = data.reduce((sum, p) => sum + p.x, 0);
  const sumY = data.reduce((sum, p) => sum + p.y, 0);
  const sumXY = data.reduce((sum, p) => sum + p.x * p.y, 0);
  const sumX2 = data.reduce((sum, p) => sum + p.x * p.x, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  const r = correlation(data);
  const rSquared = r * r;

  return { slope, intercept, rSquared };
}

// Generate regression line points
export function regressionLine(
  data: Array<{ x: number; y: number }>
): Array<{ x: number; y: number }> {
  const { slope, intercept } = linearRegression(data);
  const xValues = data.map((p) => p.x);
  const minX = Math.min(...xValues);
  const maxX = Math.max(...xValues);

  return [
    { x: minX, y: slope * minX + intercept },
    { x: maxX, y: slope * maxX + intercept },
  ];
}

// Create histogram bins
export function createHistogramBins(
  data: number[],
  binCount?: number
): Array<{ bin: string; count: number; range: [number, number] }> {
  if (data.length === 0) return [];

  const min = Math.min(...data);
  const max = Math.max(...data);
  const count = binCount || Math.ceil(Math.sqrt(data.length));
  const binWidth = (max - min) / count;

  const bins: Array<{ bin: string; count: number; range: [number, number] }> = [];

  for (let i = 0; i < count; i++) {
    const rangeStart = min + i * binWidth;
    const rangeEnd = min + (i + 1) * binWidth;
    const binData = data.filter(
      (val) => val >= rangeStart && (i === count - 1 ? val <= rangeEnd : val < rangeEnd)
    );
    bins.push({
      bin: `${rangeStart.toFixed(1)}-${rangeEnd.toFixed(1)}`,
      count: binData.length,
      range: [rangeStart, rangeEnd],
    });
  }

  return bins;
}

// Calculate confidence interval
export function confidenceInterval(
  sampleMean: number,
  sampleStdDev: number,
  sampleSize: number,
  confidenceLevel = 0.95
): { lower: number; upper: number; marginOfError: number } {
  // Z-scores for common confidence levels
  const zScores: Record<number, number> = {
    0.9: 1.645,
    0.95: 1.96,
    0.99: 2.576,
  };

  const z = zScores[confidenceLevel] || 1.96;
  const standardError = sampleStdDev / Math.sqrt(sampleSize);
  const marginOfError = z * standardError;

  return {
    lower: sampleMean - marginOfError,
    upper: sampleMean + marginOfError,
    marginOfError,
  };
}

// Format number for display
export function formatNumber(num: number, decimals = 2): string {
  return num.toFixed(decimals);
}
