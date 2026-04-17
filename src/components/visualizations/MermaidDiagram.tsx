"use client";

import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";

interface MermaidDiagramProps {
  chart: string;
  className?: string;
  theme?: "default" | "dark" | "forest" | "neutral";
}

// Initialize mermaid once
let mermaidInitialized = false;

export default function MermaidDiagram({
  chart,
  className = "",
  theme = "default",
}: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (!mermaidInitialized) {
      mermaid.initialize({
        startOnLoad: false,
        theme,
        securityLevel: "strict",
        fontFamily: "inherit",
      });
      mermaidInitialized = true;
    }

    const renderChart = async () => {
      try {
        const id = `mermaid-${Math.random().toString(36).substring(7)}`;
        const { svg } = await mermaid.render(id, chart);
        setSvg(svg);
        setError("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to render diagram");
        setSvg("");
      }
    };

    renderChart();
  }, [chart, theme]);

  if (error) {
    return (
      <div className={`p-4 bg-red-50 border border-red-200 rounded-lg ${className}`}>
        <p className="text-sm text-red-600">Diagram error: {error}</p>
        <pre className="mt-2 text-xs text-stone-500 overflow-auto">{chart}</pre>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`mermaid-diagram flex justify-center p-4 bg-white rounded-lg ${className}`}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

// Pre-built diagram templates for statistics
export const STAT_DIAGRAMS = {
  hypothesisTesting: `
flowchart TD
    A[State Hypotheses] --> B[Choose Significance Level α]
    B --> C[Collect Data]
    C --> D[Calculate Test Statistic]
    D --> E[Find p-value]
    E --> F{p-value < α?}
    F -->|Yes| G[Reject H₀]
    F -->|No| H[Fail to Reject H₀]
    G --> I[Evidence supports Hₐ]
    H --> J[Insufficient evidence]
  `,

  typeErrors: `
flowchart LR
    subgraph Reality
        R1[H₀ True]
        R2[H₀ False]
    end
    subgraph Decision
        D1[Reject H₀]
        D2[Fail to Reject H₀]
    end
    R1 --> D1
    R1 --> D2
    R2 --> D1
    R2 --> D2
    R1 -.->|Type I Error α| D1
    R2 -.->|Type II Error β| D2
  `,

  samplingProcess: `
flowchart TD
    A[Population] --> B[Random Sample]
    B --> C[Calculate Statistic]
    C --> D[Make Inference]
    D --> E[Conclusions about Population]
    B -.->|Sampling Error| C
  `,

  regressionSteps: `
flowchart TD
    A[Scatter Plot Data] --> B[Check Linearity]
    B --> C[Fit Regression Line]
    C --> D[Calculate R²]
    D --> E{Good Fit?}
    E -->|Yes| F[Make Predictions]
    E -->|No| G[Check Assumptions]
    G --> H[Transform Data?]
    H --> B
  `,

  probabilityTree: `
flowchart TD
    A[Start] --> B[Event A]
    A --> C[Event A']
    B --> D[Event B given A]
    B --> E[Event B' given A]
    C --> F[Event B given A']
    C --> G[Event B' given A']
  `,

  centralLimitTheorem: `
flowchart LR
    A[Population<br/>Any Distribution] --> B[Take Many Samples<br/>Size n]
    B --> C[Calculate Sample Means]
    C --> D[Distribution of Means<br/>≈ Normal]
    D --> E[μ_x̄ = μ<br/>σ_x̄ = σ/√n]
  `,
};

// Helper component for pre-built diagrams
export function StatDiagram({
  name,
  className = "",
}: {
  name: keyof typeof STAT_DIAGRAMS;
  className?: string;
}) {
  return <MermaidDiagram chart={STAT_DIAGRAMS[name]} className={className} />;
}
