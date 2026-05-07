import React, { useState } from "react";
import { Bot, User, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TokenBadge } from "./TokenBadge";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
  imageUrl?: string;
  tokensUsed?: number;
}

function CopyButton({ text, className = "" }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const handle = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <Button
      variant="ghost"
      size="icon"
      className={`h-6 w-6 text-muted-foreground hover:text-foreground transition-colors ${className}`}
      onClick={handle}
      title="Copy"
    >
      {copied ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
    </Button>
  );
}

function CodeBlock({ language, code }: { language: string; code: string }) {
  return (
    <div className="relative group/code my-3 rounded-lg overflow-hidden border border-border/50">
      <div className="flex items-center justify-between px-4 py-1.5 bg-black/40 border-b border-border/50">
        <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
          {language || "code"}
        </span>
        <CopyButton
          text={code}
          className="opacity-0 group-hover/code:opacity-100"
        />
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

const markdownComponents: React.ComponentProps<typeof ReactMarkdown>["components"] = {
  code({ className, children, ...props }) {
    const match = /language-(\w+)/.exec(className || "");
    const isBlock = !!match || String(children).includes("\n");
    if (isBlock) {
      return (
        <CodeBlock
          language={match?.[1] || ""}
          code={String(children).replace(/\n$/, "")}
        />
      );
    }
    return (
      <code
        className="px-1.5 py-0.5 rounded bg-black/30 text-primary font-mono text-[0.8em] border border-border/30"
        {...props}
      >
        {children}
      </code>
    );
  },
  h1: ({ children }) => <h1 className="text-xl font-bold mt-4 mb-2 text-foreground border-b border-border/40 pb-1">{children}</h1>,
  h2: ({ children }) => <h2 className="text-lg font-bold mt-3 mb-2 text-foreground">{children}</h2>,
  h3: ({ children }) => <h3 className="text-base font-semibold mt-2 mb-1 text-foreground">{children}</h3>,
  p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
  ul: ({ children }) => <ul className="mb-2 ml-4 space-y-1 list-disc marker:text-primary/60">{children}</ul>,
  ol: ({ children }) => <ol className="mb-2 ml-4 space-y-1 list-decimal marker:text-primary/60">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-primary/50 pl-4 my-2 text-muted-foreground italic">
      {children}
    </blockquote>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto my-3 rounded-lg border border-border/50">
      <table className="w-full text-sm border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-black/30 text-muted-foreground text-xs uppercase">{children}</thead>,
  th: ({ children }) => <th className="px-4 py-2 text-left font-semibold border-b border-border/40">{children}</th>,
  td: ({ children }) => <td className="px-4 py-2 border-b border-border/20 last:border-b-0">{children}</td>,
  hr: () => <hr className="my-4 border-border/40" />,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 hover:text-primary/80">
      {children}
    </a>
  ),
  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
  em: ({ children }) => <em className="italic text-foreground/90">{children}</em>,
};

export function MessageBubble({ role, content, isStreaming, imageUrl, tokensUsed }: MessageBubbleProps) {
  const isUser = role === "user";

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
            {!isUser && !isStreaming && tokensUsed && (
              <TokenBadge tokens={tokensUsed} />
            )}
            {!isUser && !isStreaming && (
              <CopyButton
                text={content}
                className="opacity-0 group-hover:opacity-100"
              />
            )}
          </div>

          {/* Attached image */}
          {imageUrl && (
            <div className="mb-2">
              <img
                src={imageUrl}
                alt="Attached"
                className="max-w-xs max-h-64 rounded-lg border border-border/50 object-contain"
              />
            </div>
          )}

          <div className={`
            px-4 py-3 rounded-2xl text-sm leading-relaxed min-w-0 w-full
            ${isUser
              ? "bg-secondary text-secondary-foreground rounded-tr-sm"
              : "bg-transparent text-foreground"}
          `}>
            {isUser ? (
              <div className="whitespace-pre-wrap break-words">{content}</div>
            ) : (
              <div className={`prose-custom ${isStreaming ? "typing-cursor" : ""}`}>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={markdownComponents}
                >
                  {content || " "}
                </ReactMarkdown>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
