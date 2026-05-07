import React from "react";
import { Link, useLocation } from "wouter";
import { useListOpenaiConversations, useCreateOpenaiConversation, useDeleteOpenaiConversation, getListOpenaiConversationsQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Plus, MessageSquare, Trash2, Menu, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();
  
  const { data: conversations = [], isLoading } = useListOpenaiConversations({
    query: {
      queryKey: getListOpenaiConversationsQueryKey()
    }
  });

  const createMutation = useCreateOpenaiConversation();
  const deleteMutation = useDeleteOpenaiConversation();

  const handleNewChat = () => {
    createMutation.mutate({ data: { title: "New Conversation" } }, {
      onSuccess: (newConv) => {
        queryClient.invalidateQueries({ queryKey: getListOpenaiConversationsQueryKey() });
        setLocation(`/conversations/${newConv.id}`);
        if (window.innerWidth < 768) {
          onClose();
        }
      }
    });
  };

  const handleDelete = (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    e.stopPropagation();
    deleteMutation.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListOpenaiConversationsQueryKey() });
        if (location === `/conversations/${id}`) {
          setLocation("/");
        }
      }
    });
  };

  // Sort by newest first
  const sortedConversations = [...conversations].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden animate-in fade-in"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:sticky top-0 left-0 z-50 h-[100dvh] w-72 bg-sidebar border-r border-sidebar-border
        flex flex-col transition-transform duration-300 ease-in-out
        ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
      `}>
        <div className="p-4 flex items-center justify-between border-b border-sidebar-border">
          <div className="flex items-center gap-2 font-mono font-bold text-primary">
            <div className="w-4 h-4 bg-primary rounded-sm animate-pulse" />
            NexusChat
          </div>
          <Button variant="ghost" size="icon" className="md:hidden text-sidebar-foreground" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-4">
          <Button 
            className="w-full justify-start gap-2 bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20" 
            onClick={handleNewChat}
            disabled={createMutation.isPending}
          >
            <Plus className="h-4 w-4" />
            New Chat
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {isLoading ? (
            <div className="flex flex-col gap-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-12 bg-sidebar-accent/50 rounded-md animate-pulse" />
              ))}
            </div>
          ) : sortedConversations.length === 0 ? (
            <div className="text-center p-4 text-sm text-muted-foreground mt-4">
              No conversations yet
            </div>
          ) : (
            sortedConversations.map((conv) => {
              const isActive = location === `/conversations/${conv.id}`;
              return (
                <Link key={conv.id} href={`/conversations/${conv.id}`}>
                  <div className={`
                    group flex flex-col p-3 rounded-md cursor-pointer transition-colors
                    ${isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent/50"}
                  `}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <MessageSquare className={`h-4 w-4 shrink-0 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                        <span className="truncate text-sm font-medium">{conv.title || "New Conversation"}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 hover:text-destructive shrink-0"
                        onClick={(e) => handleDelete(e, conv.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <span className="text-[10px] text-muted-foreground mt-1 ml-6">
                      {formatDistanceToNow(new Date(conv.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                </Link>
              );
            })
          )}
        </div>

        <div className="p-4 border-t border-sidebar-border text-xs text-sidebar-foreground/50 font-mono text-center">
          SYSTEM_READY
        </div>
      </aside>
    </>
  );
}
