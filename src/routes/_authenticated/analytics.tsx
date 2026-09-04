import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { subDays } from "date-fns";
import { Download } from "lucide-react";

import { LoadingBlock, PageHeader } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { downloadCsv } from "@/lib/export";
import { isOverdue } from "@/lib/format";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — AI Productivity Suite" },
      { name: "description", content: "Task completion, meeting output and research statistics for your workspace." },
      { property: "og:title", content: "Analytics — AI Productivity Suite" },
      { property: "og:description", content: "Task completion, meeting output and research statistics." },
    ],
  }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["analytics"],
    queryFn: async () => {
      const [tasks, meetings, research, sources, notes, documents] = await Promise.all([
        supabase.from("tasks").select("id,title,status,due_date,completed_at,meeting_id"),
        supabase.from("meetings").select("id,title,summary"),
        supabase.from("research_projects").select("id,title,status"),
        supabase.from("sources").select("id"),
        supabase.from("notes").select("id"),
        supabase.from("documents").select("id"),
      ]);
      return {
        tasks: tasks.data ?? [],
        meetings: meetings.data ?? [],
        research: research.data ?? [],
        sources: sources.data ?? [],
        notes: notes.data ?? [],
        documents: documents.data ?? [],
      };
    },
  });

  if (isLoading || !data) return <LoadingBlock rows={4} />;

  const total = data.tasks.length;
  const done = data.tasks.filter((t) => t.status === "done").length;
  const overdue = data.tasks.filter((t) => isOverdue(t.due_date, t.status)).length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  const weekly = Array.from({ length: 7 }, (_, i) => {
    const day = subDays(new Date(), 6 - i);
    const key = day.toISOString().slice(0, 10);
    return {
      day: day.toLocaleDateString(undefined, { weekday: "short" }),
      completed: data.tasks.filter((t) => (t.completed_at ?? "").slice(0, 10) === key).length,
    };
  });

  const summarised = data.meetings.filter((m) => m.summary).length;
  const fromMeetings = data.tasks.filter((t) => t.meeting_id).length;
  const fromMeetingsDone = data.tasks.filter((t) => t.meeting_id && t.status === "done").length;

  const stats = [
    { label: "Tasks completed", value: `${done}/${total}` },
    { label: "Remaining", value: total - done },
    { label: "Overdue", value: overdue },
    { label: "Meetings summarised", value: `${summarised}/${data.meetings.length}` },
    { label: "Action items created", value: fromMeetings },
    { label: "Action items completed", value: fromMeetingsDone },
    { label: "Research projects", value: data.research.length },
    { label: "Saved sources", value: data.sources.length },
    { label: "Notes", value: data.notes.length },
    { label: "Documents", value: data.documents.length },
  ];

  return (
    <div>
      <PageHeader
        title="Analytics"
        description="How your workspace is performing."
        actions={
          <Button
            variant="outline"
            onClick={() =>
              downloadCsv("analytics", stats.map((s) => ({ metric: s.label, value: String(s.value) })))
            }
          >
            <Download className="mr-2 size-4" /> Export CSV
          </Button>
        }
      />

      <Card className="mb-6">
        <CardHeader className="pb-2"><CardTitle className="text-base">Task completion</CardTitle></CardHeader>
        <CardContent>
          <div className="mb-2 flex justify-between text-sm"><span>{pct}% complete</span><span>{done} of {total}</span></div>
          <Progress value={pct} />
        </CardContent>
      </Card>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="mt-1 text-2xl font-bold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Weekly productivity</CardTitle></CardHeader>
        <CardContent>
          <ChartContainer config={{ completed: { label: "Completed", color: "hsl(var(--primary))" } }} className="h-64 w-full">
            <BarChart data={weekly}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="day" tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="completed" fill="var(--color-completed)" radius={4} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
