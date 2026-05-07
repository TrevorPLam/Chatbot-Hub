import React, { useState, useEffect, useRef } from "react";
import { useRoute, useSearch } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { ChatInput } from "@/components/chat/ChatInput";
import { 
  useGetOpenaiConversation, 
  getGetOpenaiConversationQueryKey,
  getListOpenaiMessagesQueryKey,
  getListOpenaiConversationsQueryKey
} from "@workspace/api-client-react";
import { Loader2 } from "lucide-react";
import type { OpenaiMessage } from "@workspace/api-client-react/src/generated/api.schemas";

export function ChatView() {
  const [, params] = useRoute("/conversations/:id");
  const id = Number(params?.id);
  const search = useSearch();
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const autoSentRef = useRef(false);
  
  const [streamingContent, setStreamingContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const { data: conversation, isLoading } = useGetOpenaiConversation(id, {
    query: {
      enabled: !!id,
      queryKey: getGetOpenaiConversationQueryKey(id)
    }
  });

  const messages = conversation?.messages || [];

  // Auto-send prompt from query param (e.g. when clicking a suggestion on welcome screen)
  useEffect(() => {
    if (!id || isLoading || autoSentRef.current) return;
    const promptParam = new URLSearchParams(search).get("prompt");
    if (promptParam && messages.length === 0) {
      autoSentRef.current = true;
      handleSend(promptParam);
      // Clean up the URL without re-mounting
      window.history.replaceState(null, "", `/conversations/${id}`);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isLoading, messages.length]);

  // Scroll to bottom when messages change or streaming content updates
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingContent]);

  const handleSend = async (content: string) => {
    if (!id || !content.trim()) return;

    // Optimistically update UI
    const tempUserMessage: OpenaiMessage = {
      id: Date.now(),
      conversationId: id,
      role: "user",
      content,
      createdAt: new Date().toISOString()
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
        body: JSON.stringify({ content }),
        signal: abortControllerRef.current.signal
      });

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        
        // Parse SSE
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || ""; // Keep the last incomplete chunk in buffer
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                setStreamingContent(prev => prev + data.content);
              }
              if (data.done) {
                break;
              }
            } catch (e) {
              console.error("Failed to parse SSE data", e);
            }
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log("Streaming aborted");
      } else {
        console.error("Streaming error:", error);
      }
    } finally {
      setIsStreaming(false);
      setStreamingContent("");
      // Refresh real data
      queryClient.invalidateQueries({ queryKey: getGetOpenaiConversationQueryKey(id) });
      queryClient.invalidateQueries({ queryKey: getListOpenaiMessagesQueryKey(id) });
      queryClient.invalidateQueries({ queryKey: getListOpenaiConversationsQueryKey() });
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
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

  return (
    <div className="flex flex-col h-full relative">
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 scrollbar-thin" ref={scrollRef}>
        <div className="max-w-4xl mx-auto flex flex-col min-h-full">
          {messages.length === 0 && !isStreaming && (
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 opacity-50">
              <div className="font-mono text-sm uppercase tracking-widest text-primary">Connection Established</div>
              <p className="text-sm">Type a message to begin transmission.</p>
            </div>
          )}

          {messages.map((msg) => (
            <MessageBubble key={msg.id} role={msg.role as "user" | "assistant"} content={msg.content} />
          ))}

          {isStreaming && (
            <MessageBubble role="assistant" content={streamingContent} isStreaming={true} />
          )}
          
          {/* Bottom padding to ensure last message isn't hidden behind input */}
          <div className="h-4 shrink-0" />
        </div>
      </div>

      <div className="shrink-0 bg-gradient-to-t from-background via-background to-transparent pt-6 pb-4 px-4 relative z-10">
        <ChatInput 
          onSend={handleSend} 
          isStreaming={isStreaming} 
          onStop={handleStop} 
        />
      </div>
    </div>
  );
}
