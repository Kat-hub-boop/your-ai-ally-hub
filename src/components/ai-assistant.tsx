import { useServerFn } from "@tanstack/react-start";
import { useRouterState } from "@tanstack/react-router";
import { Bot, Send, ShieldCheck, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { assistantAsk, type AssistantReply } from "@/lib/ai.functions";

type Turn = { question: string; reply?: AssistantReply; error?: string };

export function AiAssistant() {
  const ask = useServerFn(assistantAsk);
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);

  async function send() {
    const q = question.trim();
    if (q.length < 2) return;
    setQuestion("");
    setBusy(true);
    setTurns((t) => [...t, { question: q }]);
    try {
      const reply = await ask({ data: { question: q, page: path } });
      setTurns((t) => t.map((turn, i) => (i === t.length - 1 ? { ...turn, reply } : turn)));
    } catch (e) {
      const message = e instanceof Error ? e.message : "The assistant could not answer right now.";
      setTurns((t) => t.map((turn, i) => (i === t.length - 1 ? { ...turn, error: message } : turn)));
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          size="lg"
          className="fixed bottom-5 right-5 z-40 gap-2 rounded-full shadow-lg transition-transform hover:scale-105"
        >
          <Sparkles className="size-4" /> AI Assistant
        </Button>
      </SheetTrigger>
      <SheetContent className="flex w-full flex-col gap-4 sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2"><Bot className="size-5 text-primary" /> Workspace assistant</SheetTitle>
          <SheetDescription>
            Answers use only your own workspace data. It never invents tasks, dates or facts.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto pr-1">
          {turns.length === 0 && (
            <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
              Try: “What should I work on next?”, “Which tasks are overdue?”, “Summarise my research projects.”
            </div>
          )}
          {turns.map((turn, i) => (
            <div key={i} className="space-y-2">
              <p className="ml-auto w-fit max-w-[85%] rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground">
                {turn.question}
              </p>
              {turn.error && <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{turn.error}</p>}
              {turn.reply && (
                <div className="space-y-2 rounded-lg border border-border bg-card p-3 text-sm">
                  <p className="whitespace-pre-wrap">{turn.reply.answer}</p>
                  {turn.reply.suggestions.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold uppercase text-muted-foreground">Suggestions</p>
                      <ul className="list-disc pl-4 text-sm">
                        {turn.reply.suggestions.map((s, k) => <li key={k}>{s}</li>)}
                      </ul>
                    </div>
                  )}
                  {turn.reply.uncertainty.length > 0 && (
                    <div className="rounded-md bg-warning/10 p-2">
                      <p className="text-xs font-semibold uppercase text-warning">Uncertain / verify</p>
                      <ul className="list-disc pl-4 text-sm">
                        {turn.reply.uncertainty.map((s, k) => <li key={k}>{s}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          {busy && <p className="text-sm text-muted-foreground">Thinking…</p>}
        </div>

        <div className="space-y-2">
          <Textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask about your tasks, meetings or research…"
            rows={3}
          />
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <ShieldCheck className="size-3" /> Private to your account
            </p>
            <Button onClick={() => void send()} disabled={busy || question.trim().length < 2} className="gap-2">
              <Send className="size-4" /> Ask
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
