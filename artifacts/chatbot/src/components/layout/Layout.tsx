import React, { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-[100dvh] w-full bg-background overflow-hidden selection:bg-primary/30">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <main className="flex-1 flex flex-col min-w-0 relative">
        <header className="md:hidden h-14 border-b border-border flex items-center px-4 shrink-0 bg-background/80 backdrop-blur z-10 sticky top-0">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)} className="mr-2">
            <Menu className="h-5 w-5" />
          </Button>
          <div className="font-mono font-bold text-primary text-sm flex items-center gap-2">
            <div className="w-3 h-3 bg-primary rounded-sm" />
            NexusChat
          </div>
        </header>
        
        <div className="flex-1 overflow-hidden relative">
          {children}
        </div>
      </main>
    </div>
  );
}
