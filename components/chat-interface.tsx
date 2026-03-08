"use client";

import { useState, useRef, useEffect, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, MessageCircle, X } from "lucide-react";
import type { Timestamp } from "@/app/types";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ChatMsg {
  content: string;
  role: "user" | "assistant";
}

interface Props {
  timestamps: Timestamp[];
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ChatInterface({ timestamps, className = "" }: Props) {
  const [panelOpen, setPanelOpen] = useState(false);
  const [conversation, setConversation] = useState<ChatMsg[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation]);

  /* ---- Send handler ---- */
  const onSend = async (e: FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;

    const outgoing: ChatMsg = { content: text, role: "user" };
    setConversation((prev) => [...prev, outgoing]);
    setDraft("");
    setSending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...conversation, outgoing],
          events: timestamps,
        }),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Request failed");
      }

      const reply: ChatMsg = await res.json();
      setConversation((prev) => [...prev, reply]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setConversation((prev) => [
        ...prev,
        { role: "assistant", content: `Error: ${msg}` },
      ]);
    } finally {
      setSending(false);
    }
  };

  /* ---- Collapsed state — just show the FAB ---- */
  if (!panelOpen) {
    return (
      <Button
        onClick={() => setPanelOpen(true)}
        className={`fixed bottom-4 right-4 rounded-full p-4 bg-red-700 hover:bg-red-800 shadow-lg z-50 ${className}`}
      >
        <MessageCircle className="w-6 h-6" />
      </Button>
    );
  }

  /* ---- Expanded chat panel ---- */
  return (
    <div
      className={`fixed bottom-4 right-4 w-96 h-[500px] bg-zinc-900/95 backdrop-blur-sm rounded-lg shadow-xl border border-zinc-800 flex flex-col z-50 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900">
        <h3 className="font-semibold text-white">FirstWatch Assistant</h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setPanelOpen(false)}
          className="h-8 w-8 rounded-full hover:bg-zinc-800"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Message list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {conversation.map((msg, i) => {
          const isUser = msg.role === "user";
          return (
            <div key={i} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${isUser
                    ? "bg-red-700 text-white"
                    : "bg-zinc-800 text-zinc-200"
                  }`}
              >
                {msg.content}
              </div>
            </div>
          );
        })}
        {sending && (
          <div className="flex justify-start">
            <div className="bg-zinc-800 rounded-lg px-4 py-2">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={onSend} className="p-4 border-t border-zinc-800 bg-zinc-900">
        <div className="flex gap-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Ask about the analysis…"
            className="flex-1 bg-zinc-800 border-zinc-700 text-white"
            disabled={sending}
          />
          <Button
            type="submit"
            disabled={sending}
            className="bg-red-700 hover:bg-red-800"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send"}
          </Button>
        </div>
      </form>
    </div>
  );
}
