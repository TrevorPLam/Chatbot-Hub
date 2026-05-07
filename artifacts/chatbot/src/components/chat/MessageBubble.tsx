import React from "react";
import { Bot, User } from "lucide-react";

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

export function MessageBubble({ role, content, isStreaming }: MessageBubbleProps) {
  const isUser = role === "user";
  
  // Basic markdown-like rendering for line breaks and code blocks
  const renderContent = (text: string) => {
    // Basic formatting: split by newlines
    return text.split('\n').map((line, i) => (
      <React.Fragment key={i}>
        {line}
        {i < text.split('\n').length - 1 && <br />}
      </React.Fragment>
    ));
  };

  return (
    <div className={`flex w-full ${isUser ? "justify-end" : "justify-start"} mb-6 animate-in fade-in slide-in-from-bottom-2 duration-300`}>
      <div className={`flex max-w-[85%] md:max-w-[75%] gap-4 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
        
        <div className={`shrink-0 flex items-center justify-center w-8 h-8 rounded-md mt-1 ${isUser ? "bg-secondary text-secondary-foreground" : "bg-primary/20 text-primary border border-primary/30"}`}>
          {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
        </div>
        
        <div className={`
          flex flex-col gap-1 min-w-0
          ${isUser ? "items-end" : "items-start"}
        `}>
          <div className="text-xs font-mono text-muted-foreground mb-1">
            {isUser ? "USER" : "NEXUS_AI"}
          </div>
          
          <div className={`
            px-4 py-3 rounded-2xl text-sm leading-relaxed
            ${isUser 
              ? "bg-secondary text-secondary-foreground rounded-tr-sm" 
              : "bg-transparent text-foreground prose prose-invert max-w-none"}
          `}>
            {isUser ? (
              <div className="whitespace-pre-wrap break-words">{content}</div>
            ) : (
              <div className={isStreaming ? "typing-cursor" : ""}>
                {renderContent(content)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
