import React from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Cpu } from "lucide-react";

export const MODELS = [
  { id: "gpt-5.4", label: "GPT-5.4", description: "Most capable" },
  { id: "gpt-5.2", label: "GPT-5.2", description: "Great balance" },
  { id: "gpt-5-mini", label: "GPT-5 Mini", description: "Fast & efficient" },
  { id: "gpt-5-nano", label: "GPT-5 Nano", description: "Fastest" },
] as const;

export type ModelId = (typeof MODELS)[number]["id"];

interface ModelSelectorProps {
  value: string;
  onChange: (model: string) => void;
  disabled?: boolean;
}

export function ModelSelector({ value, onChange, disabled }: ModelSelectorProps) {
  const current = MODELS.find((m) => m.id === value) ?? MODELS[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={disabled}
          className="h-7 gap-1.5 px-2 text-xs font-mono text-muted-foreground hover:text-foreground border border-border/40 hover:border-primary/40 transition-colors"
        >
          <Cpu className="h-3 w-3" />
          <span>{current.label}</span>
          <ChevronDown className="h-3 w-3 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
          Model
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {MODELS.map((model) => (
          <DropdownMenuItem
            key={model.id}
            onClick={() => onChange(model.id)}
            className="flex items-center justify-between cursor-pointer"
          >
            <div>
              <div className="text-sm font-medium">{model.label}</div>
              <div className="text-[11px] text-muted-foreground">{model.description}</div>
            </div>
            {model.id === value && (
              <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
