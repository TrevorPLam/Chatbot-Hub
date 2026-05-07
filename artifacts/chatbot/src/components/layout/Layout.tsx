import React, { useState, useRef, useEffect, useCallback } from "react";
import { Sidebar } from "./Sidebar";
import { TokenUsagePanel } from "./TokenUsagePanel";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCreateOpenaiConversation } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { getListOpenaiConversationsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tokenPanelOpen, setTokenPanelOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const createMutation = useCreateOpenaiConversation();

  const handleNewChat = useCallback(() => {
    createMutation.mutate(
      { data: { title: "New Conversation" } },
      {
        onSuccess: (newConv) => {
          queryClient.invalidateQueries({ queryKey: getListOpenaiConversationsQueryKey() });
          setLocation(`/conversations/${newConv.id}`);
        },
      }
    );
  }, [createMutation, queryClient, setLocation]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === "n") {
        e.preventDefault();
        handleNewChat();
      }
      if (mod && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleNewChat]);

  return (
    <div className="flex h-[100dvh] w-full bg-background overflow-hidden selection:bg-primary/30">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        searchInputRef={searchInputRef}
        onShowTokenUsage={() => setTokenPanelOpen(true)}
      />

      <main className="flex-1 flex flex-col min-w-0 relative">
        <header className="md:hidden h-14 border-b border-border flex items-center px-4 shrink-0 bg-background/80 backdrop-blur z-10 sticky top-0">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)} className="mr-2">
            <Menu className="h-5 w-5" />
          </Button>
          <div className="font-mono font-bold text-primary text-sm flex items-center gap-2">
            <div className="w-3 h-3 bg-primary rounded-sm" />
            NexusChat
          </div>
        </header>

        <div className="flex-1 overflow-hidden relative">
          {children}
        </div>
      </main>

      {tokenPanelOpen && (
        <TokenUsagePanel onClose={() => setTokenPanelOpen(false)} />
      )}
    </div>
  );
}
