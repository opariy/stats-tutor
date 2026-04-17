"use client";

import { useState, useCallback } from "react";
import NormalDistribution from "./NormalDistribution";
import ConfidenceInterval from "./ConfidenceInterval";
import ScatterPlot from "./ScatterPlot";
import { linearRegression, correlation } from "./stats-utils";

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  unit?: string;
}

function Slider({ label, value, min, max, step = 0.1, onChange, unit = "" }: SliderProps) {
  return (
    <div className="flex items-center gap-3">
      <label className="text-sm text-stone-600 w-32">{label}</label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="flex-1 h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
      />
      <span className="text-sm font-mono text-stone-700 w-16 text-right">
        {value.toFixed(step < 1 ? 2 : 0)}{unit}
      </span>
    </div>
  );
}

// Interactive Normal Distribution Explorer
export function NormalExplorer({ className = "" }: { className?: string }) {
  const [mean, setMean] = useState(0);
  const [stdDev, setStdDev] = useState(1);
  const [showArea, setShowArea] = useState(true);
  const [areaFrom, setAreaFrom] = useState(-1);
  const [areaTo, setAreaTo] = useState(1);

  return (
    <div className={`bg-white rounded-xl border border-stone-200 p-4 ${className}`}>
      <h3 className="font-semibold text-stone-800 mb-4">Normal Distribution Explorer</h3>

      <NormalDistribution
        mean={mean}
        stdDev={stdDev}
        showArea={showArea}
        areaFrom={areaFrom}
        areaTo={areaTo}
        showMean
        showStdDevLines
        height={220}
      />

      <div className="mt-4 space-y-3">
        <Slider label="Mean (μ)" value={mean} min={-5} max={5} onChange={setMean} />
        <Slider label="Std Dev (σ)" value={stdDev} min={0.5} max={3} onChange={setStdDev} />

        <div className="flex items-center gap-3">
          <label className="text-sm text-stone-600 w-32">Show Area</label>
          <input
            type="checkbox"
            checked={showArea}
            onChange={(e) => setShowArea(e.target.checked)}
            className="w-4 h-4 accent-teal-600"
          />
        </div>

        {showArea && (
          <>
            <Slider label="Area From" value={areaFrom} min={mean - 4 * stdDev} max={mean + 4 * stdDev} onChange={setAreaFrom} />
            <Slider label="Area To" value={areaTo} min={mean - 4 * stdDev} max={mean + 4 * stdDev} onChange={setAreaTo} />
          </>
        )}
      </div>

      <div className="mt-4 p-3 bg-stone-50 rounded-lg text-sm text-stone-600">
        <p>
          Try adjusting the parameters to see how the normal distribution changes!
        </p>
        <ul className="mt-2 list-disc list-inside text-xs space-y-1">
          <li>Higher σ = wider, flatter curve</li>
          <li>Lower σ = narrower, taller curve</li>
          <li>Changing μ shifts the curve left/right</li>
        </ul>
      </div>
    </div>
  );
}

// Interactive Confidence Interval Explorer
export function ConfidenceIntervalExplorer({ className = "" }: { className?: string }) {
  const [sampleMean, setSampleMean] = useState(50);
  const [sampleStdDev, setSampleStdDev] = useState(10);
  const [sampleSize, setSampleSize] = useState(30);
  const [confidenceLevel, setConfidenceLevel] = useState(0.95);

  // Calculate margin of error
  const zScores: Record<number, number> = { 0.9: 1.645, 0.95: 1.96, 0.99: 2.576 };
  const z = zScores[confidenceLevel] || 1.96;
  const standardError = sampleStdDev / Math.sqrt(sampleSize);
  const marginOfError = z * standardError;

  return (
    <div className={`bg-white rounded-xl border border-stone-200 p-4 ${className}`}>
      <h3 className="font-semibold text-stone-800 mb-4">Confidence Interval Explorer</h3>

      <ConfidenceInterval
        mean={sampleMean}
        marginOfError={marginOfError}
        confidenceLevel={confidenceLevel}
        sampleSize={sampleSize}
        showDistribution
        height={180}
      />

      <div className="mt-4 space-y-3">
        <Slider label="Sample Mean" value={sampleMean} min={0} max={100} step={1} onChange={setSampleMean} />
        <Slider label="Std Dev (s)" value={sampleStdDev} min={1} max={30} step={1} onChange={setSampleStdDev} />
        <Slider label="Sample Size (n)" value={sampleSize} min={5} max={200} step={1} onChange={setSampleSize} />

        <div className="flex items-center gap-3">
          <label className="text-sm text-stone-600 w-32">Confidence</label>
          <select
            value={confidenceLevel}
            onChange={(e) => setConfidenceLevel(parseFloat(e.target.value))}
            className="flex-1 p-2 border border-stone-300 rounded-lg text-sm"
          >
            <option value={0.9}>90%</option>
            <option value={0.95}>95%</option>
            <option value={0.99}>99%</option>
          </select>
        </div>
      </div>

      <div className="mt-4 p-3 bg-stone-50 rounded-lg text-sm text-stone-600">
        <p className="font-medium">What affects the interval width?</p>
        <ul className="mt-2 list-disc list-inside text-xs space-y-1">
          <li>↑ Sample size → narrower interval (more precise)</li>
          <li>↑ Std deviation → wider interval (more variability)</li>
          <li>↑ Confidence level → wider interval (more certainty)</li>
        </ul>
      </div>
    </div>
  );
}

// Interactive Correlation Explorer
export function CorrelationExplorer({ className = "" }: { className?: string }) {
  const [points, setPoints] = useState<Array<{ x: number; y: number }>>([
    { x: 1, y: 2 },
    { x: 2, y: 4 },
    { x: 3, y: 5 },
    { x: 4, y: 4 },
    { x: 5, y: 7 },
    { x: 6, y: 8 },
    { x: 7, y: 9 },
  ]);

  const [noise, setNoise] = useState(0);

  // Generate noisy data
  const noisyPoints = points.map((p) => ({
    x: p.x,
    y: p.y + (Math.random() - 0.5) * noise * 2,
  }));

  const r = correlation(noisyPoints);
  const regression = linearRegression(noisyPoints);

  const addRandomPoint = useCallback(() => {
    const newX = Math.random() * 10;
    const newY = Math.random() * 10;
    setPoints((prev) => [...prev, { x: newX, y: newY }]);
  }, []);

  const resetToLinear = useCallback(() => {
    setPoints([
      { x: 1, y: 1 },
      { x: 2, y: 2 },
      { x: 3, y: 3 },
      { x: 4, y: 4 },
      { x: 5, y: 5 },
    ]);
  }, []);

  const resetToNone = useCallback(() => {
    const randomPoints = Array.from({ length: 10 }, () => ({
      x: Math.random() * 10,
      y: Math.random() * 10,
    }));
    setPoints(randomPoints);
  }, []);

  return (
    <div className={`bg-white rounded-xl border border-stone-200 p-4 ${className}`}>
      <h3 className="font-semibold text-stone-800 mb-4">Correlation Explorer</h3>

      <ScatterPlot
        data={noisyPoints}
        showRegressionLine
        showCorrelation
        xLabel="X"
        yLabel="Y"
        height={250}
      />

      <div className="mt-4 space-y-3">
        <Slider
          label="Add Noise"
          value={noise}
          min={0}
          max={5}
          step={0.5}
          onChange={setNoise}
        />

        <div className="flex flex-wrap gap-2">
          <button
            onClick={addRandomPoint}
            className="px-3 py-1.5 bg-teal-100 text-teal-700 rounded-lg text-sm hover:bg-teal-200 transition"
          >
            Add Point
          </button>
          <button
            onClick={resetToLinear}
            className="px-3 py-1.5 bg-stone-100 text-stone-700 rounded-lg text-sm hover:bg-stone-200 transition"
          >
            Perfect Linear
          </button>
          <button
            onClick={resetToNone}
            className="px-3 py-1.5 bg-stone-100 text-stone-700 rounded-lg text-sm hover:bg-stone-200 transition"
          >
            Random (No Correlation)
          </button>
        </div>
      </div>

      <div className="mt-4 p-3 bg-stone-50 rounded-lg text-xs text-stone-600">
        <p>
          Add noise to see how it affects the correlation coefficient.
          A perfect linear relationship has r = ±1.
        </p>
      </div>
    </div>
  );
}

// Main sandbox with tabs
export default function InteractiveSandbox({ className = "" }: { className?: string }) {
  const [activeTab, setActiveTab] = useState<"normal" | "ci" | "correlation">("normal");

  return (
    <div className={`${className}`}>
      <div className="flex border-b border-stone-200 mb-4">
        {[
          { id: "normal", label: "Normal Distribution" },
          { id: "ci", label: "Confidence Intervals" },
          { id: "correlation", label: "Correlation" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 text-sm font-medium transition ${
              activeTab === tab.id
                ? "text-teal-600 border-b-2 border-teal-600"
                : "text-stone-500 hover:text-stone-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "normal" && <NormalExplorer />}
      {activeTab === "ci" && <ConfidenceIntervalExplorer />}
      {activeTab === "correlation" && <CorrelationExplorer />}
    </div>
  );
}
