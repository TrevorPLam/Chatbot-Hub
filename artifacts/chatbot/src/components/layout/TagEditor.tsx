import React, { useState, useRef } from "react";
import { Tag, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useUpdateOpenaiConversation,
  getGetOpenaiConversationQueryKey,
  getListOpenaiConversationsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

interface TagEditorProps {
  conversationId: number;
  tags: string[];
}

const TAG_COLORS = [
  "bg-blue-500/20 text-blue-400 border-blue-500/30",
  "bg-green-500/20 text-green-400 border-green-500/30",
  "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  "bg-purple-500/20 text-purple-400 border-purple-500/30",
  "bg-pink-500/20 text-pink-400 border-pink-500/30",
  "bg-orange-500/20 text-orange-400 border-orange-500/30",
];

function tagColor(tag: string): string {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
}

export function TagEditor({ conversationId, tags }: TagEditorProps) {
  const [adding, setAdding] = useState(false);
  const [newTag, setNewTag] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const updateMutation = useUpdateOpenaiConversation();

  const saveTags = (updatedTags: string[]) => {
    updateMutation.mutate(
      { id: conversationId, data: { tags: updatedTags } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetOpenaiConversationQueryKey(conversationId) });
          queryClient.invalidateQueries({ queryKey: getListOpenaiConversationsQueryKey() });
        },
      },
    );
  };

  const addTag = () => {
    const trimmed = newTag.trim().toLowerCase().replace(/\s+/g, "-");
    if (trimmed && !tags.includes(trimmed)) {
      saveTags([...tags, trimmed]);
    }
    setNewTag("");
    setAdding(false);
  };

  const removeTag = (tag: string) => {
    saveTags(tags.filter((t) => t !== tag));
  };

  return (
    <div className="flex items-center flex-wrap gap-1.5">
      {tags.map((tag) => (
        <div
          key={tag}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono border ${tagColor(tag)}`}
        >
          <Tag className="h-2.5 w-2.5" />
          {tag}
          <button
            onClick={() => removeTag(tag)}
            className="hover:opacity-70 ml-0.5"
          >
            <X className="h-2 w-2" />
          </button>
        </div>
      ))}

      {adding ? (
        <input
          ref={inputRef}
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") addTag();
            if (e.key === "Escape") { setAdding(false); setNewTag(""); }
          }}
          onBlur={addTag}
          placeholder="tag-name"
          autoFocus
          className="h-5 px-2 text-[10px] font-mono bg-secondary/50 border border-border rounded-full outline-none focus:border-primary w-24"
        />
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="h-5 px-1.5 text-[10px] font-mono text-muted-foreground hover:text-primary gap-1 rounded-full"
          onClick={() => setAdding(true)}
        >
          <Plus className="h-2.5 w-2.5" />
          tag
        </Button>
      )}
    </div>
  );
}
