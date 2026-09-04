import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { addDays, addMonths, endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { LoadingBlock, PageHeader } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { priorityClass } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/calendar")({
  head: () => ({
    meta: [
      { title: "Calendar — AI Productivity Suite" },
      { name: "description", content: "See and reschedule your tasks across day, week and month views." },
      { property: "og:title", content: "Calendar — AI Productivity Suite" },
      { property: "og:description", content: "See and reschedule your tasks across day, week and month views." },
    ],
  }),
  component: CalendarPage,
});

type View = "day" | "week" | "month";

function CalendarPage() {
  const qc = useQueryClient();
  const [view, setView] = useState<View>("week");
  const [anchor, setAnchor] = useState(new Date());

  const { data, isLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tasks").select("*");
      if (error) throw error;
      return data;
    },
  });

  const reschedule = useMutation({
    mutationFn: async ({ id, due_date }: { id: string; due_date: string }) => {
      const { error } = await supabase.from("tasks").update({ due_date }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Task rescheduled.");
      void qc.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const days = useMemo(() => {
    if (view === "day") return [anchor];
    if (view === "week") {
      const start = startOfWeek(anchor, { weekStartsOn: 1 });
      return Array.from({ length: 7 }, (_, i) => addDays(start, i));
    }
    const start = startOfWeek(startOfMonth(anchor), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(anchor), { weekStartsOn: 1 });
    const out: Date[] = [];
    for (let d = start; d <= end; d = addDays(d, 1)) out.push(d);
    return out;
  }, [view, anchor]);

  const move = (dir: number) => {
    if (view === "month") setAnchor(addMonths(anchor, dir));
    else setAnchor(addDays(anchor, dir * (view === "week" ? 7 : 1)));
  };

  return (
    <div>
      <PageHeader
        title="Calendar"
        description="Drag a task onto another day to reschedule it."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" aria-label="Previous" onClick={() => move(-1)}><ChevronLeft className="size-4" /></Button>
            <span className="min-w-32 text-center text-sm font-medium">{format(anchor, view === "month" ? "MMMM yyyy" : "d MMM yyyy")}</span>
            <Button variant="outline" size="icon" aria-label="Next" onClick={() => move(1)}><ChevronRight className="size-4" /></Button>
            <Tabs value={view} onValueChange={(v) => setView(v as View)}>
              <TabsList>
                <TabsTrigger value="day">Day</TabsTrigger>
                <TabsTrigger value="week">Week</TabsTrigger>
                <TabsTrigger value="month">Month</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        }
      />

      {isLoading ? (
        <LoadingBlock />
      ) : (
        <div className={view === "day" ? "grid gap-3" : view === "week" ? "grid gap-3 md:grid-cols-7" : "grid grid-cols-7 gap-2"}>
          {days.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const dayTasks = (data ?? []).filter((t) => t.due_date === key);
            return (
              <Card
                key={key}
                className="min-h-28"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  const id = e.dataTransfer.getData("text/plain");
                  if (id) reschedule.mutate({ id, due_date: key });
                }}
              >
                <CardContent className="space-y-2 p-2">
                  <p className="text-xs font-semibold text-muted-foreground">{format(day, view === "month" ? "d" : "EEE d MMM")}</p>
                  {dayTasks.map((t) => (
                    <div
                      key={t.id}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData("text/plain", t.id)}
                      className="cursor-grab rounded-md border border-border p-2 text-xs"
                    >
                      <p className="truncate font-medium">{t.title}</p>
                      <Badge variant="outline" className={`mt-1 ${priorityClass(t.priority)}`}>{t.priority}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
