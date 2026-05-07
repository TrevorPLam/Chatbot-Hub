import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { SendHorizontal, Square } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "./ImageUpload";
import { VoiceInput } from "./VoiceInput";

interface ChatInputProps {
  onSend: (message: string, imageBase64?: string, imageMimeType?: string) => void;
  isStreaming: boolean;
  onStop?: () => void;
  conversationId: number;
  onVoiceDone: () => void;
}

export function ChatInput({ onSend, isStreaming, onStop, conversationId, onVoiceDone }: ChatInputProps) {
  const [input, setInput] = useState("");
  const [imageBase64, setImageBase64] = useState<string | undefined>();
  const [imageMimeType, setImageMimeType] = useState<string | undefined>();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = () => {
    if ((!input.trim() && !imageBase64) || isStreaming) return;
    onSend(input.trim(), imageBase64, imageMimeType);
    setInput("");
    setImageBase64(undefined);
    setImageMimeType(undefined);

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

  const canSend = (!!input.trim() || !!imageBase64) && !isStreaming;

  return (
    <div className="relative flex flex-col w-full max-w-4xl mx-auto gap-2 px-4 pt-0">
      <div className="relative flex-1 bg-secondary/50 border border-border rounded-xl focus-within:ring-1 focus-within:ring-primary focus-within:border-primary transition-all">
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="Send a message to Nexus..."
          className="min-h-[56px] max-h-[200px] w-full resize-none border-0 bg-transparent focus-visible:ring-0 text-foreground px-4 py-4 pr-4 scrollbar-none"
          rows={1}
          disabled={isStreaming}
        />
        <div className="flex items-center justify-between px-3 pb-3 gap-2">
          <div className="flex items-center gap-1">
            <ImageUpload
              onImageSelected={(base64, mime) => { setImageBase64(base64); setImageMimeType(mime); }}
              onImageCleared={() => { setImageBase64(undefined); setImageMimeType(undefined); }}
              disabled={isStreaming}
            />
            <VoiceInput
              conversationId={conversationId}
              onDone={onVoiceDone}
              disabled={isStreaming}
            />
          </div>

          {isStreaming ? (
            <Button
              size="icon"
              onClick={onStop}
              className="h-9 w-9 shrink-0 rounded-lg bg-secondary text-foreground hover:bg-secondary/80"
            >
              <Square className="h-4 w-4 fill-current" />
            </Button>
          ) : (
            <Button
              size="icon"
              onClick={handleSubmit}
              disabled={!canSend}
              className="h-9 w-9 shrink-0 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-transform active:scale-95"
            >
              <SendHorizontal className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
