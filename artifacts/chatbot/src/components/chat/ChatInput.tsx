import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { SendHorizontal, Square } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

interface ChatInputProps {
  onSend: (message: string) => void;
  isStreaming: boolean;
  onStop?: () => void;
}

export function ChatInput({ onSend, isStreaming, onStop }: ChatInputProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = () => {
    if (!input.trim() || isStreaming) return;
    onSend(input.trim());
    setInput("");
    
    // Reset height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Auto-resize textarea
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
    }
  };

  useEffect(() => {
    if (!isStreaming && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isStreaming]);

  return (
    <div className="relative flex items-end w-full max-w-4xl mx-auto p-4 pt-0 gap-2">
      <div className="relative flex-1 bg-secondary/50 border border-border rounded-xl focus-within:ring-1 focus-within:ring-primary focus-within:border-primary transition-all">
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="Send a message to Nexus..."
          className="min-h-[56px] max-h-[200px] w-full resize-none border-0 bg-transparent focus-visible:ring-0 text-foreground px-4 py-4 pr-12 scrollbar-none"
          rows={1}
          disabled={isStreaming}
        />
      </div>
      
      {isStreaming ? (
        <Button 
          size="icon" 
          onClick={onStop}
          className="h-14 w-14 shrink-0 rounded-xl bg-secondary text-foreground hover:bg-secondary/80"
        >
          <Square className="h-5 w-5 fill-current" />
        </Button>
      ) : (
        <Button 
          size="icon" 
          onClick={handleSubmit}
          disabled={!input.trim()}
          className="h-14 w-14 shrink-0 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-transform active:scale-95"
        >
          <SendHorizontal className="h-5 w-5" />
        </Button>
      )}
    </div>
  );
}
