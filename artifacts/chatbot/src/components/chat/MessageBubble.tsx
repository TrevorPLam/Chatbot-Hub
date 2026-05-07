import React, { useState } from "react";
import { Bot, User, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="relative group/code my-3 rounded-lg overflow-hidden border border-border/50">
      <div className="flex items-center justify-between px-4 py-1.5 bg-black/40 border-b border-border/50">
        <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
          {language || "code"}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-foreground opacity-0 group-hover/code:opacity-100 transition-opacity"
          onClick={handleCopy}
        >
          {copied ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
        </Button>
      </div>
      <SyntaxHighlighter
        language={language || "text"}
        style={vscDarkPlus}
        customStyle={{
          margin: 0,
          padding: "1rem",
          background: "rgba(0,0,0,0.3)",
          fontSize: "0.8125rem",
          lineHeight: "1.6",
        }}
        codeTagProps={{ style: { fontFamily: "JetBrains Mono, monospace" } }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

function renderContent(text: string) {
  const codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let keyIndex = 0;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const segment = text.slice(lastIndex, match.index);
      parts.push(
        <span key={keyIndex++}>
          {segment.split("\n").map((line, i, arr) => (
            <React.Fragment key={i}>
              {line}
              {i < arr.length - 1 && <br />}
            </React.Fragment>
          ))}
        </span>
      );
    }
    parts.push(
      <CodeBlock key={keyIndex++} language={match[1]} code={match[2].trimEnd()} />
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    const remaining = text.slice(lastIndex);
    parts.push(
      <span key={keyIndex++}>
        {remaining.split("\n").map((line, i, arr) => (
          <React.Fragment key={i}>
            {line}
            {i < arr.length - 1 && <br />}
          </React.Fragment>
        ))}
      </span>
    );
  }

  return parts;
}

export function MessageBubble({ role, content, isStreaming }: MessageBubbleProps) {
  const isUser = role === "user";
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className={`flex w-full ${isUser ? "justify-end" : "justify-start"} mb-6 animate-in fade-in slide-in-from-bottom-2 duration-300 group`}>
      <div className={`flex max-w-[85%] md:max-w-[75%] gap-4 ${isUser ? "flex-row-reverse" : "flex-row"}`}>

        <div className={`shrink-0 flex items-center justify-center w-8 h-8 rounded-md mt-1 ${isUser ? "bg-secondary text-secondary-foreground" : "bg-primary/20 text-primary border border-primary/30"}`}>
          {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
        </div>

        <div className={`flex flex-col gap-1 min-w-0 ${isUser ? "items-end" : "items-start"}`}>
          <div className="flex items-center gap-2">
            <div className="text-xs font-mono text-muted-foreground">
              {isUser ? "USER" : "NEXUS_AI"}
            </div>
            {!isUser && !isStreaming && (
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                onClick={handleCopy}
                title="Copy message"
              >
                {copied ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
              </Button>
            )}
          </div>

          <div className={`
            px-4 py-3 rounded-2xl text-sm leading-relaxed
            ${isUser
              ? "bg-secondary text-secondary-foreground rounded-tr-sm"
              : "bg-transparent text-foreground max-w-none"}
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
