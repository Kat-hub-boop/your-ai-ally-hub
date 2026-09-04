import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CalendarCheck, ListChecks, Microscope, Sparkles } from "lucide-react";
import { useState } from "react";

import { AiSafetyNote, LoadingBlock, PageHeader } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { dashboardSuggestions, type DashboardSuggestions } from "@/lib/ai.functions";
import { fmtDate, isOverdue, priorityClass, todayISO } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — AI Productivity Suite" },
      { name: "description", content: "Your meetings, today's tasks, deadlines and research at a glance." },
      { property: "og:title", content: "Dashboard — AI Productivity Suite" },
      { property: "og:description", content: "Your meetings, tasks, deadlines and research at a glance." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();
  const suggest = useServerFn(dashboardSuggestions);
  const [tips, setTips] = useState<DashboardSuggestions | null>(null);
  const [tipsBusy, setTipsBusy] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const today = todayISO();
      const [meetings, tasks, deadlines, research, allTasks] = await Promise.all([
        supabase.from("meetings").select("id,title,meeting_date,summary").order("created_at", { ascending: false }).limit(5),
        supabase.from("tasks").select("*").neq("status", "done").lte("due_date", today).order("due_date").limit(8),
        supabase.from("tasks").select("*").neq("status", "done").gt("due_date", today).order("due_date").limit(6),
        supabase.from("research_projects").select("id,title,topic,updated_at").order("updated_at", { ascending: false }).limit(4),
        supabase.from("tasks").select("id,status,due_date"),
      ]);
      const all = allTasks.data ?? [];
      return {
        meetings: meetings.data ?? [],
        today: tasks.data ?? [],
        deadlines: deadlines.data ?? [],
        research: research.data ?? [],
        stats: {
          total: all.length,
          done: all.filter((t) => t.status === "done").length,
          overdue: all.filter((t) => isOverdue(t.due_date, t.status)).length,
        },
      };
    },
  });

  const pct = data && data.stats.total > 0 ? Math.round((data.stats.done / data.stats.total) * 100) : 0;

  return (
    <div>
      <PageHeader
        title={`Welcome back${user?.email ? `, ${user.email.split("@")[0]}` : ""}`}
        description="Everything you need for meetings, tasks and research — private to your account."
      />

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { to: "/meetings", icon: CalendarCheck, title: "New Meeting Summary", body: "Turn notes into structured minutes and action items." },
          { to: "/planner", icon: ListChecks, title: "Plan My Tasks", body: "Get a realistic AI day plan from your open tasks." },
          { to: "/research", icon: Microscope, title: "Start Research", body: "Create a research workspace with sources and citations." },
        ].map((q) => (
          <Link key={q.to} to={q.to}>
            <Card className="h-full border-primary/25 bg-gradient-to-br from-primary/10 to-transparent transition-all hover:-translate-y-0.5 hover:shadow-lg">
              <CardHeader className="pb-2">
                <q.icon className="size-6 text-primary" />
                <CardTitle className="text-base">{q.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{q.body}</CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {isLoading ? (
        <div className="mt-6"><LoadingBlock rows={3} /></div>
      ) : (
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle className="text-base">Today&apos;s tasks &amp; overdue</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {data?.today.length === 0 && <p className="text-sm text-muted-foreground">Nothing due today. Enjoy the calm.</p>}
              {data?.today.map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{t.title}</p>
                    <p className="text-xs text-muted-foreground">Due {fmtDate(t.due_date)}</p>
                  </div>
                  <Badge variant="outline" className={priorityClass(t.priority)}>{t.priority}</Badge>
                </div>
              ))}
              <Button variant="outline" size="sm" asChild className="mt-2"><Link to="/tasks">Open tasks</Link></Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Productivity</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Tasks completed</span><span className="font-semibold">{data?.stats.done}/{data?.stats.total}</span></div>
              <div className="h-2 w-full rounded-full bg-muted"><div className="h-2 rounded-full bg-primary" style={{ width: `${pct}%` }} /></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Overdue</span><span className="font-semibold text-destructive">{data?.stats.overdue}</span></div>
              <Button variant="outline" size="sm" asChild><Link to="/analytics">View analytics</Link></Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Recent meetings</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {data?.meetings.length === 0 && <p className="text-sm text-muted-foreground">No meetings yet.</p>}
              {data?.meetings.map((m) => (
                <Link key={m.id} to="/meetings/$id" params={{ id: m.id }} className="block rounded-lg border border-border p-3 hover:bg-accent">
                  <p className="truncate text-sm font-medium">{m.title}</p>
                  <p className="text-xs text-muted-foreground">{fmtDate(m.meeting_date)} · {m.summary ? "Summarised" : "Not summarised"}</p>
                </Link>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Upcoming deadlines</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {data?.deadlines.length === 0 && <p className="text-sm text-muted-foreground">No upcoming deadlines.</p>}
              {data?.deadlines.map((t) => (
                <div key={t.id} className="rounded-lg border border-border p-3">
                  <p className="truncate text-sm font-medium">{t.title}</p>
                  <p className="text-xs text-muted-foreground">Due {fmtDate(t.due_date)}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Recent research</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {data?.research.length === 0 && <p className="text-sm text-muted-foreground">No research projects yet.</p>}
              {data?.research.map((r) => (
                <Link key={r.id} to="/research/$id" params={{ id: r.id }} className="block rounded-lg border border-border p-3 hover:bg-accent">
                  <p className="truncate text-sm font-medium">{r.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{r.topic ?? "No topic set"}</p>
                </Link>
              ))}
            </CardContent>
          </Card>

          <Card className="lg:col-span-3">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">AI suggestions</CardTitle>
              <Button
                size="sm"
                variant="outline"
                disabled={tipsBusy}
                onClick={async () => {
                  setTipsBusy(true);
                  try {
                    setTips(await suggest({ data: undefined }));
                  } finally {
                    setTipsBusy(false);
                  }
                }}
              >
                <Sparkles className="mr-2 size-4" /> {tipsBusy ? "Thinking…" : "Get suggestions"}
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {tips?.suggestions.length ? (
                <ul className="space-y-2">
                  {tips.suggestions.map((s, i) => (
                    <li key={i} className="rounded-lg border border-border p-3">
                      <p className="text-sm font-medium">{s.title}</p>
                      <p className="text-sm text-muted-foreground">{s.detail}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">Generate practical suggestions based only on your own open tasks.</p>
              )}
              <AiSafetyNote>
                AI output is advisory. It never invents tasks, deadlines or facts, and anything uncertain is labelled — verify
                before acting on important items.
              </AiSafetyNote>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
