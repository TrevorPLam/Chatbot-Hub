import React from "react";
import { Zap } from "lucide-react";

interface TokenBadgeProps {
  tokens: number;
  className?: string;
}

export function TokenBadge({ tokens, className = "" }: TokenBadgeProps) {
  if (!tokens) return null;

  const formatted = tokens >= 1000
    ? `${(tokens / 1000).toFixed(1)}k`
    : tokens.toString();

  return (
    <div
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono text-muted-foreground/70 border border-border/30 bg-secondary/30 ${className}`}
      title={`${tokens.toLocaleString()} tokens used`}
    >
      <Zap className="h-2.5 w-2.5" />
      {formatted}
    </div>
  );
}
