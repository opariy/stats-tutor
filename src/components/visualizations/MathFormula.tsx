"use client";

import { useEffect, useRef } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

interface MathFormulaProps {
  formula: string;
  displayMode?: boolean;
  className?: string;
  errorColor?: string;
}

export default function MathFormula({
  formula,
  displayMode = false,
  className = "",
  errorColor = "#cc0000",
}: MathFormulaProps) {
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      try {
        katex.render(formula, containerRef.current, {
          displayMode,
          throwOnError: false,
          errorColor,
          trust: false,
          strict: false,
        });
      } catch {
        if (containerRef.current) {
          containerRef.current.textContent = formula;
        }
      }
    }
  }, [formula, displayMode, errorColor]);

  return (
    <span
      ref={containerRef}
      className={`math-formula ${displayMode ? "block my-4 text-center" : "inline"} ${className}`}
    />
  );
}

// Common statistical formulas as constants
export const FORMULAS = {
  mean: "\\bar{x} = \\frac{1}{n} \\sum_{i=1}^{n} x_i",
  variance: "s^2 = \\frac{1}{n-1} \\sum_{i=1}^{n} (x_i - \\bar{x})^2",
  stdDev: "s = \\sqrt{\\frac{1}{n-1} \\sum_{i=1}^{n} (x_i - \\bar{x})^2}",
  standardError: "SE = \\frac{s}{\\sqrt{n}}",
  confidenceInterval: "CI = \\bar{x} \\pm z_{\\alpha/2} \\cdot \\frac{s}{\\sqrt{n}}",
  tStatistic: "t = \\frac{\\bar{x} - \\mu_0}{s / \\sqrt{n}}",
  zScore: "z = \\frac{x - \\mu}{\\sigma}",
  correlation: "r = \\frac{\\sum(x_i - \\bar{x})(y_i - \\bar{y})}{\\sqrt{\\sum(x_i - \\bar{x})^2 \\sum(y_i - \\bar{y})^2}}",
  regression: "\\hat{y} = b_0 + b_1 x",
  regressionSlope: "b_1 = \\frac{\\sum(x_i - \\bar{x})(y_i - \\bar{y})}{\\sum(x_i - \\bar{x})^2}",
  regressionIntercept: "b_0 = \\bar{y} - b_1 \\bar{x}",
  normalPDF: "f(x) = \\frac{1}{\\sigma\\sqrt{2\\pi}} e^{-\\frac{(x-\\mu)^2}{2\\sigma^2}}",
  binomialPMF: "P(X = k) = \\binom{n}{k} p^k (1-p)^{n-k}",
  poissonPMF: "P(X = k) = \\frac{\\lambda^k e^{-\\lambda}}{k!}",
  chiSquare: "\\chi^2 = \\sum \\frac{(O_i - E_i)^2}{E_i}",
  bayesTheorem: "P(A|B) = \\frac{P(B|A) \\cdot P(A)}{P(B)}",
};

// Helper component for common formulas
export function StatFormula({
  name,
  className = "",
}: {
  name: keyof typeof FORMULAS;
  className?: string;
}) {
  return <MathFormula formula={FORMULAS[name]} displayMode className={className} />;
}
