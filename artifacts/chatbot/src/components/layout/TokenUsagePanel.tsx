import React from "react";
import { Zap, X, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGetOpenaiTokenUsage } from "@workspace/api-client-react";

interface TokenUsagePanelProps {
  onClose: () => void;
}

export function TokenUsagePanel({ onClose }: TokenUsagePanelProps) {
  const { data, isLoading } = useGetOpenaiTokenUsage();

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-80 bg-background border-l border-border flex flex-col shadow-xl animate-in slide-in-from-right duration-200">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2 font-mono text-sm font-bold text-primary">
          <BarChart3 className="h-4 w-4" />
          Token Usage
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 bg-secondary/50 rounded animate-pulse" />
            ))}
          </div>
        ) : data ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-secondary/30 border border-border/50 rounded-lg p-3">
                <div className="text-xs text-muted-foreground font-mono uppercase tracking-wider mb-1">
                  Total Tokens
                </div>
                <div className="text-xl font-bold font-mono text-primary flex items-center gap-1">
                  <Zap className="h-4 w-4" />
                  {(data.totalTokens ?? 0).toLocaleString()}
                </div>
              </div>
              <div className="bg-secondary/30 border border-border/50 rounded-lg p-3">
                <div className="text-xs text-muted-foreground font-mono uppercase tracking-wider mb-1">
                  Messages
                </div>
                <div className="text-xl font-bold font-mono text-foreground">
                  {(data.totalMessages ?? 0).toLocaleString()}
                </div>
              </div>
            </div>

            {(data.byConversation?.length ?? 0) > 0 && (
              <div>
                <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">
                  By Conversation
                </div>
                <div className="space-y-1.5">
                  {data.byConversation
                    ?.filter((c) => c.tokens > 0)
                    .slice(0, 10)
                    .map((c) => {
                      const maxTokens = Math.max(
                        ...(data.byConversation?.map((x) => x.tokens) ?? [1]),
                      );
                      const pct = maxTokens > 0 ? (c.tokens / maxTokens) * 100 : 0;
                      return (
                        <div key={c.conversationId} className="space-y-0.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="truncate text-foreground/80 flex-1 mr-2">
                              {c.title}
                            </span>
                            <span className="text-muted-foreground font-mono shrink-0">
                              {c.tokens.toLocaleString()}
                            </span>
                          </div>
                          <div className="h-1 rounded-full bg-secondary/50">
                            <div
                              className="h-1 rounded-full bg-primary/60 transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center text-muted-foreground text-sm py-8">
            No usage data yet
          </div>
        )}
      </div>

      <div className="p-4 border-t border-border text-xs text-muted-foreground font-mono text-center">
        USAGE_REPORT
      </div>
    </div>
  );
}
