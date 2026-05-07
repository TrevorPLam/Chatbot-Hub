import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRoute, useSearch } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { ChatInput } from "@/components/chat/ChatInput";
import { TagEditor } from "@/components/layout/TagEditor";
import { TokenBadge } from "@/components/chat/TokenBadge";
import {
  useGetOpenaiConversation,
  getGetOpenaiConversationQueryKey,
  getListOpenaiMessagesQueryKey,
  getListOpenaiConversationsQueryKey,
} from "@workspace/api-client-react";
import { Loader2, Download, ChevronDown, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { OpenaiMessage } from "@workspace/api-client-react/src/generated/api.schemas";

function exportMarkdown(title: string, messages: OpenaiMessage[]) {
  const lines: string[] = [`# ${title}`, "", `*Exported from NexusChat on ${new Date().toLocaleString()}*`, ""];
  for (const msg of messages) {
    const role = msg.role === "user" ? "**You**" : "**NexusChat AI**";
    lines.push(`### ${role}`, "", msg.content, "");
  }
  const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

export function ChatView() {
  const [, params] = useRoute("/conversations/:id");
  const id = Number(params?.id);
  const search = useSearch();
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const autoSentRef = useRef(false);

  const [streamingContent, setStreamingContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [lastTokensUsed, setLastTokensUsed] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const { data: conversation, isLoading } = useGetOpenaiConversation(id, {
    query: {
      enabled: !!id,
      queryKey: getGetOpenaiConversationQueryKey(id),
    },
  });

  const messages = conversation?.messages || [];

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollBtn(distFromBottom > 200);
  }, []);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, []);

  useEffect(() => {
    if (!id || isLoading || autoSentRef.current) return;
    const promptParam = new URLSearchParams(search).get("prompt");
    if (promptParam && messages.length === 0) {
      autoSentRef.current = true;
      handleSend(promptParam);
      window.history.replaceState(null, "", `/conversations/${id}`);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isLoading, messages.length]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingContent]);

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: getGetOpenaiConversationQueryKey(id) });
    queryClient.invalidateQueries({ queryKey: getListOpenaiMessagesQueryKey(id) });
    queryClient.invalidateQueries({ queryKey: getListOpenaiConversationsQueryKey() });
  }, [queryClient, id]);

  const handleSend = async (content: string, imageBase64?: string, imageMimeType?: string) => {
    if (!id || (!content.trim() && !imageBase64)) return;

    const tempUserMessage: OpenaiMessage = {
      id: Date.now(),
      conversationId: id,
      role: "user",
      content,
      createdAt: new Date().toISOString(),
    };

    queryClient.setQueryData(getGetOpenaiConversationQueryKey(id), (old: any) => {
      if (!old) return old;
      return { ...old, messages: [...old.messages, tempUserMessage] };
    });

    setIsStreaming(true);
    setStreamingContent("");

    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch(`/api/openai/conversations/${id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, imageBase64, imageMimeType }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                setStreamingContent((prev) => prev + data.content);
              }
              if (data.tokensUsed) {
                setLastTokensUsed(data.tokensUsed);
              }
              if (data.done) break;
            } catch {
              // ignore parse errors
            }
          }
        }
      }
    } catch (error) {
      if (!(error instanceof Error && error.name === "AbortError")) {
        console.error("Streaming error:", error);
      }
    } finally {
      setIsStreaming(false);
      setStreamingContent("");
      invalidateAll();
    }
  };

  const handleStop = () => {
    abortControllerRef.current?.abort();
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary opacity-50" />
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        Conversation not found
      </div>
    );
  }

  const totalMessages = messages.length + (isStreaming ? 1 : 0);

  return (
    <div className="flex flex-col h-full relative">
      {/* Chat header */}
      <div className="shrink-0 border-b border-border/40 px-4 md:px-8 py-3 flex items-center gap-3 bg-background/60 backdrop-blur-sm">
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold truncate text-foreground">{conversation.title}</h2>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <div className="flex items-center gap-1.5">
              <MessageSquare className="h-3 w-3 text-muted-foreground" />
              <span className="text-[11px] text-muted-foreground font-mono">
                {totalMessages} {totalMessages === 1 ? "message" : "messages"}
              </span>
            </div>
            {(conversation.totalTokensUsed ?? 0) > 0 && (
              <TokenBadge tokens={conversation.totalTokensUsed ?? 0} />
            )}
            <TagEditor
              conversationId={id}
              tags={conversation.tags ?? []}
            />
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground hover:text-foreground text-xs shrink-0"
          onClick={() => exportMarkdown(conversation.title, messages)}
          disabled={messages.length === 0}
          title="Export as Markdown"
        >
          <Download className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Export</span>
        </Button>
      </div>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto px-4 md:px-8 py-6 scrollbar-thin"
        ref={scrollRef}
        onScroll={handleScroll}
      >
        <div className="max-w-4xl mx-auto flex flex-col min-h-full">
          {messages.length === 0 && !isStreaming && (
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 opacity-50">
              <div className="font-mono text-sm uppercase tracking-widest text-primary">
                Connection Established
              </div>
              <p className="text-sm">Type a message, attach an image, or use voice to begin.</p>
            </div>
          )}

          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              role={msg.role as "user" | "assistant"}
              content={msg.content}
              imageUrl={msg.imageUrl ?? undefined}
              tokensUsed={msg.tokensUsed ?? undefined}
            />
          ))}

          {isStreaming && (
            <MessageBubble role="assistant" content={streamingContent} isStreaming={true} />
          )}

          <div className="h-4 shrink-0" />
        </div>
      </div>

      {/* Scroll-to-bottom floating button */}
      {showScrollBtn && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-28 right-6 z-20 flex items-center justify-center w-9 h-9 rounded-full bg-primary/20 border border-primary/40 text-primary shadow-lg hover:bg-primary/30 transition-all animate-in fade-in slide-in-from-bottom-2 duration-200"
          title="Scroll to bottom"
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      )}

      {/* Input */}
      <div className="shrink-0 bg-gradient-to-t from-background via-background to-transparent pt-4 pb-4 px-0 relative z-10">
        <ChatInput
          onSend={handleSend}
          isStreaming={isStreaming}
          onStop={handleStop}
          conversationId={id}
          onVoiceDone={invalidateAll}
        />
      </div>
    </div>
  );
}
