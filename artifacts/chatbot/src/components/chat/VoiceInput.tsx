import React, { useState, useCallback } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useVoiceRecorder, useVoiceStream } from "@workspace/integrations-openai-ai-react";

interface VoiceInputProps {
  conversationId: number;
  onDone: () => void;
  disabled?: boolean;
}

export function VoiceInput({ conversationId, onDone, disabled }: VoiceInputProps) {
  const [transcript, setTranscript] = useState("");
  const recorder = useVoiceRecorder();

  const workletPath = `${import.meta.env.BASE_URL}audio-playback-worklet.js`.replace(/\/+/g, "/");

  const stream = useVoiceStream({
    workletPath,
    onTranscript: (_, full) => setTranscript(full),
    onComplete: () => {
      setTranscript("");
      onDone();
    },
  });

  const handleClick = useCallback(async () => {
    if (recorder.state === "recording") {
      const blob = await recorder.stopRecording();
      if (blob) {
        await stream.streamVoiceResponse(
          `/api/openai/conversations/${conversationId}/voice-messages`,
          blob,
        );
      }
    } else {
      await recorder.startRecording();
    }
  }, [recorder, stream, conversationId]);

  const isRecording = recorder.state === "recording";
  const isStreaming = stream.state === "streaming";
  const isLoading = recorder.state === "requesting-permission" || isStreaming;

  return (
    <div className="flex items-center gap-2">
      {transcript && (
        <div className="text-xs text-muted-foreground italic max-w-48 truncate">
          {transcript}
        </div>
      )}
      <Button
        type="button"
        size="icon"
        variant="ghost"
        onClick={handleClick}
        disabled={disabled || isLoading}
        title={isRecording ? "Stop recording" : "Voice message"}
        className={`h-10 w-10 rounded-xl transition-colors ${
          isRecording
            ? "bg-red-500/20 text-red-500 hover:bg-red-500/30 animate-pulse"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isRecording ? (
          <MicOff className="h-4 w-4" />
        ) : (
          <Mic className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}
