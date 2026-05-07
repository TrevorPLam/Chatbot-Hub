import React from "react";
import { MessageSquarePlus, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCreateOpenaiConversation } from "@workspace/api-client-react";
import { useLocation } from "wouter";

export function WelcomeView() {
  const [, setLocation] = useLocation();
  const createMutation = useCreateOpenaiConversation();

  const startChat = (initialMessage?: string) => {
    createMutation.mutate({ data: { title: "New Conversation" } }, {
      onSuccess: (newConv) => {
        // If we had an initial message, we'd pass it via state or url, but for simplicity
        // we'll just navigate to the new chat. The actual send happens in the ChatView.
        setLocation(`/conversations/${newConv.id}`);
      }
    });
  };

  const suggestions = [
    "Write a python script to parse CSV files",
    "Explain quantum computing simply",
    "Help me design a database schema",
    "Review this code snippet for bugs"
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center">
      <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 border border-primary/20 shadow-[0_0_30px_-5px_hsl(var(--primary)/0.3)]">
        <Terminal className="h-8 w-8 text-primary" />
      </div>
      
      <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">Welcome to NexusChat</h1>
      <p className="text-muted-foreground max-w-md mb-10 text-sm md:text-base">
        A high-performance AI assistant interface. Start a new conversation or select one from the sidebar.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl mb-10">
        {suggestions.map((suggestion, i) => (
          <Button
            key={i}
            variant="outline"
            className="h-auto p-4 justify-start text-left whitespace-normal border-border hover:border-primary/50 hover:bg-primary/5"
            onClick={() => startChat()}
            disabled={createMutation.isPending}
          >
            <span className="text-sm text-foreground/80">{suggestion}</span>
          </Button>
        ))}
      </div>

      <Button 
        size="lg" 
        className="gap-2 font-mono"
        onClick={() => startChat()}
        disabled={createMutation.isPending}
      >
        <MessageSquarePlus className="h-4 w-4" />
        INITIALIZE_CONNECTION
      </Button>
    </div>
  );
}
