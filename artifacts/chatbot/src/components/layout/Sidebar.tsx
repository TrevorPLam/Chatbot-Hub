import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  useListOpenaiConversations,
  useCreateOpenaiConversation,
  useDeleteOpenaiConversation,
  useUpdateOpenaiConversation,
  getListOpenaiConversationsQueryKey,
  getGetOpenaiConversationQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Plus, MessageSquare, Trash2, X, Search, Pencil, Check } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

function RenameInput({
  initialValue,
  onSave,
  onCancel,
}: {
  initialValue: string;
  onSave: (value: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const commit = () => {
    const trimmed = value.trim();
    if (trimmed && trimmed !== initialValue) onSave(trimmed);
    else onCancel();
  };

  return (
    <input
      ref={inputRef}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") onCancel();
        e.stopPropagation();
      }}
      onBlur={commit}
      onClick={(e) => e.preventDefault()}
      className="flex-1 min-w-0 bg-transparent border-b border-primary text-sm font-medium text-sidebar-accent-foreground outline-none"
    />
  );
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [renamingId, setRenamingId] = useState<number | null>(null);

  const { data: conversations = [], isLoading } = useListOpenaiConversations({
    query: { queryKey: getListOpenaiConversationsQueryKey() },
  });

  const createMutation = useCreateOpenaiConversation();
  const deleteMutation = useDeleteOpenaiConversation();
  const updateMutation = useUpdateOpenaiConversation();

  const handleNewChat = () => {
    createMutation.mutate(
      { data: { title: "New Conversation" } },
      {
        onSuccess: (newConv) => {
          queryClient.invalidateQueries({ queryKey: getListOpenaiConversationsQueryKey() });
          setLocation(`/conversations/${newConv.id}`);
          if (window.innerWidth < 768) onClose();
        },
      }
    );
  };

  const handleDelete = (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    e.stopPropagation();
    deleteMutation.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListOpenaiConversationsQueryKey() });
          if (location === `/conversations/${id}`) setLocation("/");
        },
      }
    );
  };

  const handleRename = (id: number, newTitle: string) => {
    updateMutation.mutate(
      { id, data: { title: newTitle } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListOpenaiConversationsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetOpenaiConversationQueryKey(id) });
        },
      }
    );
    setRenamingId(null);
  };

  const sortedConversations = [...conversations]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .filter((c) =>
      search.trim() === "" || c.title.toLowerCase().includes(search.toLowerCase())
    );

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden animate-in fade-in"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed md:sticky top-0 left-0 z-50 h-[100dvh] w-72 bg-sidebar border-r border-sidebar-border
          flex flex-col transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        <div className="p-4 flex items-center justify-between border-b border-sidebar-border">
          <div className="flex items-center gap-2 font-mono font-bold text-primary">
            <div className="w-4 h-4 bg-primary rounded-sm animate-pulse" />
            NexusChat
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-sidebar-foreground"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-4 flex flex-col gap-2">
          <Button
            className="w-full justify-start gap-2 bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20"
            onClick={handleNewChat}
            disabled={createMutation.isPending}
          >
            <Plus className="h-4 w-4" />
            New Chat
          </Button>

          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations…"
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-secondary/40 border border-border/50 rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 space-y-1 pb-2">
          {isLoading ? (
            <div className="flex flex-col gap-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-sidebar-accent/50 rounded-md animate-pulse" />
              ))}
            </div>
          ) : sortedConversations.length === 0 ? (
            <div className="text-center p-4 text-sm text-muted-foreground mt-4">
              {search ? "No matches found" : "No conversations yet"}
            </div>
          ) : (
            sortedConversations.map((conv) => {
              const isActive = location === `/conversations/${conv.id}`;
              const isRenaming = renamingId === conv.id;

              return (
                <Link key={conv.id} href={`/conversations/${conv.id}`}>
                  <div
                    className={`
                      group flex flex-col p-3 rounded-md cursor-pointer transition-colors
                      ${isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent/50"}
                    `}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0">
                        <MessageSquare
                          className={`h-4 w-4 shrink-0 ${isActive ? "text-primary" : "text-muted-foreground"}`}
                        />
                        {isRenaming ? (
                          <RenameInput
                            initialValue={conv.title}
                            onSave={(title) => handleRename(conv.id, title)}
                            onCancel={() => setRenamingId(null)}
                          />
                        ) : (
                          <span className="truncate text-sm font-medium">
                            {conv.title || "New Conversation"}
                          </span>
                        )}
                      </div>
                      {!isRenaming && (
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 hover:text-primary"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setRenamingId(conv.id);
                            }}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 hover:text-destructive"
                            onClick={(e) => handleDelete(e, conv.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
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
