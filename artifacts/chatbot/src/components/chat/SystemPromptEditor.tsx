import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { BrainCircuit, Check, X } from "lucide-react";

interface SystemPromptEditorProps {
  value: string | null | undefined;
  onChange: (prompt: string | null) => void;
  disabled?: boolean;
}

export function SystemPromptEditor({ value, onChange, disabled }: SystemPromptEditorProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const hasPrompt = !!value?.trim();

  const handleOpen = (o: boolean) => {
    if (o) setDraft(value ?? "");
    setOpen(o);
  };

  const handleSave = () => {
    onChange(draft.trim() || null);
    setOpen(false);
  };

  const handleClear = () => {
    setDraft("");
    onChange(null);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={disabled}
          className={`h-7 gap-1.5 px-2 text-xs font-mono border transition-colors ${
            hasPrompt
              ? "text-primary border-primary/40 hover:border-primary/60"
              : "text-muted-foreground border-border/40 hover:text-foreground hover:border-primary/40"
          }`}
          title={hasPrompt ? "System prompt active" : "Add system prompt"}
        >
          <BrainCircuit className="h-3 w-3" />
          <span>{hasPrompt ? "Persona" : "Set persona"}</span>
          {hasPrompt && <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0" side="bottom">
        <div className="px-4 pt-4 pb-2">
          <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">
            System Prompt
          </div>
          <p className="text-[11px] text-muted-foreground mb-3">
            Sets the AI's persona and behavior for this conversation.
          </p>
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="e.g. You are a senior Python developer who gives concise, practical answers..."
            className="min-h-[100px] max-h-[200px] resize-none text-sm"
            autoFocus
          />
        </div>
        <div className="flex items-center justify-between px-4 pb-4 pt-2 gap-2">
          {hasPrompt && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="h-7 text-xs text-muted-foreground hover:text-destructive gap-1"
            >
              <X className="h-3 w-3" />
              Clear
            </Button>
          )}
          <div className="flex gap-2 ml-auto">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
              className="h-7 text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              className="h-7 text-xs gap-1"
            >
              <Check className="h-3 w-3" />
              Save
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
