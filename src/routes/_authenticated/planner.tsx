import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Wand2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AiSafetyNote, EmptyState, LoadingBlock, PageHeader } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { type DayPlan, planMyDay } from "@/lib/ai.functions";
import { fmtDate, todayISO } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/planner")({
  head: () => ({
    meta: [
      { title: "AI Planner — AI Productivity Suite" },
      { name: "description", content: "Generate a realistic daily or weekly plan from your own open tasks." },
      { property: "og:title", content: "AI Planner — AI Productivity Suite" },
      { property: "og:description", content: "Generate a realistic daily or weekly plan from your own open tasks." },
    ],
  }),
  component: PlannerPage,
});

function PlannerPage() {
  const run = useServerFn(planMyDay);
  const [prompt, setPrompt] = useState("");
  const [date, setDate] = useState(todayISO());
  const [kind, setKind] = useState<"daily" | "weekly">("daily");
  const [plan, setPlan] = useState<DayPlan | null>(null);

  const { data: saved, isLoading, refetch } = useQuery({
    queryKey: ["plans"],
    queryFn: async () => {
      const { data, error } = await supabase.from("plans").select("*").order("created_at", { ascending: false }).limit(20);
      if (error) throw error;
      return data;
    },
  });

  const generate = useMutation({
    mutationFn: () => run({ data: { prompt: prompt || undefined, kind, date } }),
    onSuccess: (result) => {
      setPlan(result);
      toast.success("Plan generated.");
      void refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader title="AI Planner" description="A realistic schedule built only from the tasks you already have." />

      <Card className="mb-6">
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Wand2 className="size-4 text-primary" /> Plan my day</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label htmlFor="pd">Date</Label><Input id="pd" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
            <div>
              <Label>Horizon</Label>
              <Tabs value={kind} onValueChange={(v) => setKind(v as "daily" | "weekly")}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="daily">Daily</TabsTrigger>
                  <TabsTrigger value="weekly">Weekly</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
          <div>
            <Label htmlFor="pp">Planning instruction (optional)</Label>
            <Textarea id="pp" rows={3} placeholder="e.g. Keep the morning free for deep work" value={prompt} onChange={(e) => setPrompt(e.target.value)} />
          </div>
          <Button disabled={generate.isPending} onClick={() => generate.mutate()}>
            {generate.isPending ? "Planning…" : "Plan my day with AI"}
          </Button>
          <AiSafetyNote>
            The planner only uses your saved tasks, working hours and break preferences. It never invents tasks or deadlines,
            and flags anything unrealistic or overloaded.
          </AiSafetyNote>
        </CardContent>
      </Card>

      {plan && (
        <div className="mb-6 grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle className="text-base">Timeline</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">{plan.summary}</p>
              {plan.blocks.map((b, i) => (
                <div key={i} className="flex gap-3 rounded-lg border border-border p-3">
                  <span className="w-24 shrink-0 text-sm font-medium">{b.start}–{b.end}</span>
                  <div>
                    <p className="text-sm font-medium">{b.title} <Badge variant="outline" className="ml-1">{b.type}</Badge></p>
                    <p className="text-xs text-muted-foreground">{b.reason}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Warnings</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                {plan.warnings.length ? plan.warnings.map((w, i) => <p key={i}>• {w}</p>) : <p>No warnings.</p>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Suggested postponements</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                {plan.postpone_suggestions.length
                  ? plan.postpone_suggestions.map((p, i) => <p key={i}>• {p.task} — {p.reason}</p>)
                  : <p>Nothing needs postponing.</p>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Next best action</CardTitle></CardHeader>
              <CardContent className="text-sm text-muted-foreground">{plan.next_best_action}</CardContent>
            </Card>
          </div>
        </div>
      )}

      <h2 className="mb-3 text-lg font-semibold">Saved plans</h2>
      {isLoading ? (
        <LoadingBlock rows={2} />
      ) : (saved ?? []).length === 0 ? (
        <EmptyState title="No saved plans" description="Generate a plan and it will be stored here for reference." />
      ) : (
        <div className="space-y-2">
          {(saved ?? []).map((p) => (
            <Card key={p.id}>
              <CardContent className="flex items-center justify-between gap-3 p-4 text-sm">
                <span className="font-medium">{p.kind === "weekly" ? "Weekly plan" : "Daily plan"} · {fmtDate(p.plan_date)}</span>
                <Button variant="outline" size="sm" onClick={() => setPlan(p.content as unknown as DayPlan)}>View</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
