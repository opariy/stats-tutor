"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import ReactMarkdown from "react-markdown";
import MathFormula from "./MathFormula";

// Dynamic imports for heavy chart components
const NormalDistribution = dynamic(() => import("./NormalDistribution"), { ssr: false });
const Histogram = dynamic(() => import("./Histogram"), { ssr: false });
const ScatterPlot = dynamic(() => import("./ScatterPlot"), { ssr: false });
const BoxPlot = dynamic(() => import("./BoxPlot"), { ssr: false });
const ConfidenceInterval = dynamic(() => import("./ConfidenceInterval"), { ssr: false });
const MermaidDiagram = dynamic(() => import("./MermaidDiagram"), { ssr: false });

interface VisualizationRendererProps {
  content: string;
  className?: string;
}

// Regex patterns for visualization syntax
const VISUALIZATION_PATTERNS = {
  // ```viz:type {...props}
  vizBlock: /```viz:(\w+[-\w]*)\s*\n([\s\S]*?)```/g,
  // $$ latex $$
  displayMath: /\$\$([\s\S]*?)\$\$/g,
  // $ inline latex $ - must contain math-like content (letters, backslash, operators)
  // Excludes currency like "$3" or "$100"
  inlineMath: /\$([^\$\n]+?)\$/g,
  // ```mermaid ... ```
  mermaid: /```mermaid\s*\n([\s\S]*?)```/g,
};

// Check if content between $ signs is actually math (not currency)
function isActualMath(content: string): boolean {
  const trimmed = content.trim();

  // CURRENCY PATTERNS (return false):
  // $3, $100, $3.50, $3 fee, $100 dollars, etc.
  // Starts with a number = likely currency
  if (/^\d/.test(trimmed)) return false;

  // MATH PATTERNS (return true):
  // Contains LaTeX commands like \frac, \bar, \sum
  if (/\\[a-zA-Z]+/.test(content)) return true;

  // Contains parentheses with letters: f(x), g(n)
  if (/[a-zA-Z]\s*\(/.test(content)) return true;

  // Contains equals with letters: x = 5, f(x) = 3x
  if (/[a-zA-Z]\s*=/.test(content)) return true;
  if (/=\s*[a-zA-Z]/.test(content)) return true;

  // Contains math operators with letters: 3x, x + y, 2n - 1
  if (/\d+\s*[a-zA-Z]/.test(content)) return true; // 3x, 2n
  if (/[a-zA-Z]\s*[+\-\*\/\^]/.test(content)) return true;
  if (/[+\-\*\/\^]\s*[a-zA-Z]/.test(content)) return true;

  // Contains subscript/superscript: x^2, a_1
  if (/[\^_]/.test(content)) return true;

  // Single letter (variable): x, n, f
  if (/^[a-zA-Z]$/.test(trimmed)) return true;

  return false;
}

export default function VisualizationRenderer({
  content,
  className = "",
}: VisualizationRendererProps) {
  const renderedContent = useMemo(() => {
    const parts: Array<{ type: string; content: string; props?: Record<string, unknown> }> = [];
    let lastIndex = 0;
    let match;

    // Create a combined pattern to find all special blocks in order
    const combinedContent = content;
    const allMatches: Array<{
      index: number;
      length: number;
      type: string;
      content: string;
      props?: Record<string, unknown>;
    }> = [];

    // Find viz blocks
    const vizRegex = /```viz:(\w+[-\w]*)\s*\n([\s\S]*?)```/g;
    while ((match = vizRegex.exec(combinedContent)) !== null) {
      try {
        const props = JSON.parse(match[2]);
        allMatches.push({
          index: match.index,
          length: match[0].length,
          type: `viz:${match[1]}`,
          content: match[2],
          props,
        });
      } catch {
        // Invalid JSON, treat as text
      }
    }

    // Find mermaid blocks
    const mermaidRegex = /```mermaid\s*\n([\s\S]*?)```/g;
    while ((match = mermaidRegex.exec(combinedContent)) !== null) {
      allMatches.push({
        index: match.index,
        length: match[0].length,
        type: "mermaid",
        content: match[1].trim(),
      });
    }

    // Find display math
    const displayMathRegex = /\$\$([\s\S]*?)\$\$/g;
    while ((match = displayMathRegex.exec(combinedContent)) !== null) {
      allMatches.push({
        index: match.index,
        length: match[0].length,
        type: "displayMath",
        content: match[1].trim(),
      });
    }

    // Sort by index
    allMatches.sort((a, b) => a.index - b.index);

    // Build parts array
    for (const m of allMatches) {
      if (m.index > lastIndex) {
        // Add text before this match
        const textBefore = combinedContent.slice(lastIndex, m.index);
        if (textBefore.trim()) {
          parts.push({ type: "text", content: textBefore });
        }
      }
      parts.push({ type: m.type, content: m.content, props: m.props });
      lastIndex = m.index + m.length;
    }

    // Add remaining text
    if (lastIndex < combinedContent.length) {
      const remaining = combinedContent.slice(lastIndex);
      if (remaining.trim()) {
        parts.push({ type: "text", content: remaining });
      }
    }

    return parts;
  }, [content]);

  return (
    <div className={className}>
      {renderedContent.map((part, index) => (
        <RenderPart key={index} part={part} />
      ))}
    </div>
  );
}

function RenderPart({
  part,
}: {
  part: { type: string; content: string; props?: Record<string, unknown> };
}) {
  switch (part.type) {
    case "viz:normal-distribution":
      return <NormalDistribution {...(part.props as any)} />;

    case "viz:histogram":
      return <Histogram {...(part.props as any)} />;

    case "viz:scatter-plot":
      return <ScatterPlot {...(part.props as any)} />;

    case "viz:box-plot":
      return <BoxPlot {...(part.props as any)} />;

    case "viz:confidence-interval":
      return <ConfidenceInterval {...(part.props as any)} />;

    case "mermaid":
      return <MermaidDiagram chart={part.content} />;

    case "displayMath":
      return <MathFormula formula={part.content} displayMode />;

    case "text":
      return <TextWithInlineMath content={part.content} />;

    default:
      return <TextWithInlineMath content={part.content} />;
  }
}

// Markdown components for consistent styling
const markdownComponents = {
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="list-disc ml-4 mb-3">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="list-decimal ml-4 mb-3">{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="mb-1">{children}</li>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-semibold">{children}</strong>
  ),
  em: ({ children }: { children?: React.ReactNode }) => (
    <em className="italic">{children}</em>
  ),
  code: ({ children }: { children?: React.ReactNode }) => (
    <code className="bg-teal-50 text-teal-700 px-1.5 py-0.5 rounded text-sm font-mono border border-teal-100">
      {children}
    </code>
  ),
  pre: ({ children }: { children?: React.ReactNode }) => (
    <pre className="bg-stone-50 p-3 rounded-lg mb-3 overflow-x-auto border border-stone-200">
      {children}
    </pre>
  ),
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h1 className="text-xl font-bold mb-2">{children}</h1>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 className="text-lg font-bold mb-2">{children}</h2>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="text-base font-bold mb-2">{children}</h3>
  ),
};

// Check if content has ACTUAL math (not currency like $3)
function hasActualInlineMath(content: string): boolean {
  const regex = /\$([^\$\n]+?)\$/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    if (isActualMath(match[1])) {
      return true;
    }
  }
  return false;
}

// Render text with inline math AND markdown
function TextWithInlineMath({ content }: { content: string }) {
  // Check if content has ACTUAL inline math (not currency)
  const hasInlineMath = hasActualInlineMath(content);

  if (!hasInlineMath) {
    // No inline math, just render markdown
    return (
      <ReactMarkdown components={markdownComponents}>
        {content}
      </ReactMarkdown>
    );
  }

  // Split content into paragraphs first, then process inline math within each
  const paragraphs = content.split(/\n\n+/);

  return (
    <div>
      {paragraphs.map((para, pIdx) => (
        <p key={pIdx} className="mb-3 last:mb-0 leading-relaxed">
          <InlineMathParagraph content={para} />
        </p>
      ))}
    </div>
  );
}

// Simple inline markdown processor (bold, italic, code)
function processInlineMarkdown(text: string): React.ReactNode[] {
  const result: React.ReactNode[] = [];
  // Match **bold**, *italic*, `code`
  const regex = /(\*\*(.+?)\*\*)|(\*(.+?)\*)|(`([^`]+)`)/g;
  let lastIndex = 0;
  let match;
  let keyIndex = 0;

  while ((match = regex.exec(text)) !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      result.push(text.slice(lastIndex, match.index));
    }

    if (match[2]) {
      // Bold: **text**
      result.push(<strong key={keyIndex++} className="font-semibold">{match[2]}</strong>);
    } else if (match[4]) {
      // Italic: *text*
      result.push(<em key={keyIndex++} className="italic">{match[4]}</em>);
    } else if (match[6]) {
      // Code: `text`
      result.push(
        <code key={keyIndex++} className="bg-teal-50 text-teal-700 px-1.5 py-0.5 rounded text-sm font-mono border border-teal-100">
          {match[6]}
        </code>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    result.push(text.slice(lastIndex));
  }

  return result.length > 0 ? result : [text];
}

// Render a single paragraph with inline math (no block elements)
function InlineMathParagraph({ content }: { content: string }) {
  const parts = useMemo(() => {
    const result: Array<{ type: "text" | "math"; content: string }> = [];
    const regex = /\$([^\$\n]+?)\$/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        result.push({ type: "text", content: content.slice(lastIndex, match.index) });
      }
      // Only treat as math if it's actually math, not currency
      if (isActualMath(match[1])) {
        result.push({ type: "math", content: match[1] });
      } else {
        // Keep as text with dollar signs (it's currency like $3)
        result.push({ type: "text", content: match[0] });
      }
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < content.length) {
      result.push({ type: "text", content: content.slice(lastIndex) });
    }

    return result;
  }, [content]);

  return (
    <>
      {parts.map((part, i) =>
        part.type === "math" ? (
          <MathFormula key={i} formula={part.content} />
        ) : (
          <span key={i}>{processInlineMarkdown(part.content)}</span>
        )
      )}
    </>
  );
}

// Utility to create visualization block syntax
export function createVizBlock(
  type: string,
  props: Record<string, unknown>
): string {
  return `\`\`\`viz:${type}\n${JSON.stringify(props, null, 2)}\n\`\`\``;
}

// Example usage comments for the AI tutor
export const VIZ_SYNTAX_GUIDE = `
Visualization Syntax Guide for AI Tutor:

1. NORMAL DISTRIBUTION
\`\`\`viz:normal-distribution
{
  "mean": 0,
  "stdDev": 1,
  "showArea": true,
  "areaFrom": -1,
  "areaTo": 1,
  "showMean": true,
  "showStdDevLines": true,
  "title": "Standard Normal Distribution"
}
\`\`\`

2. HISTOGRAM
\`\`\`viz:histogram
{
  "data": [1, 2, 2, 3, 3, 3, 4, 4, 5],
  "bins": 5,
  "title": "Sample Distribution"
}
\`\`\`

3. SCATTER PLOT
\`\`\`viz:scatter-plot
{
  "data": [{"x": 1, "y": 2}, {"x": 2, "y": 4}, {"x": 3, "y": 5}],
  "showRegressionLine": true,
  "showCorrelation": true,
  "xLabel": "X Variable",
  "yLabel": "Y Variable"
}
\`\`\`

4. BOX PLOT
\`\`\`viz:box-plot
{
  "data": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  "showOutliers": true,
  "title": "Data Distribution"
}
\`\`\`

5. CONFIDENCE INTERVAL
\`\`\`viz:confidence-interval
{
  "mean": 50,
  "marginOfError": 5,
  "confidenceLevel": 0.95,
  "sampleSize": 100,
  "title": "95% Confidence Interval"
}
\`\`\`

6. MATH FORMULAS
- Display mode: $$ \\bar{x} = \\frac{1}{n} \\sum x_i $$
- Inline mode: The formula $\\bar{x}$ represents the sample mean.

7. MERMAID DIAGRAMS
\`\`\`mermaid
flowchart TD
    A[Start] --> B[Step 1]
    B --> C{Decision}
    C -->|Yes| D[Result A]
    C -->|No| E[Result B]
\`\`\`
`;
