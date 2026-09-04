import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { EmptyState, ErrorState, LoadingBlock, PageHeader } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import type { TablesUpdate } from "@/integrations/supabase/types";
import { PRIORITIES, STATUSES, STATUS_LABEL, fmtDate, isOverdue, priorityClass } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/tasks")({
  head: () => ({
    meta: [
      { title: "Tasks — AI Productivity Suite" },
      { name: "description", content: "Manage tasks with list and Kanban views, priorities, deadlines and filters." },
      { property: "og:title", content: "Tasks — AI Productivity Suite" },
      { property: "og:description", content: "Manage tasks with list and Kanban views, priorities and deadlines." },
    ],
  }),
  component: TasksPage,
});

const EMPTY = {
  title: "",
  description: "",
  priority: "medium",
  due_date: "",
  due_time: "",
  estimated_minutes: "",
  category: "",
  tags: "",
};

function TasksPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [term, setTerm] = useState("");
  const [priority, setPriority] = useState("all");
  const [status, setStatus] = useState("all");

  const { data, isLoading, error } = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .order("due_date", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data;
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!form.title.trim()) throw new Error("A task title is required.");
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await supabase.from("tasks").insert({
        user_id: auth.user!.id,
        title: form.title.trim(),
        description: form.description || null,
        priority: form.priority,
        due_date: form.due_date || null,
        due_time: form.due_time || null,
        estimated_minutes: form.estimated_minutes ? Number(form.estimated_minutes) : null,
        category: form.category || null,
        tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Task created.");
      setForm(EMPTY);
      setOpen(false);
      void qc.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: TablesUpdate<"tasks"> }) => {
      const { error } = await supabase.from("tasks").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["tasks"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Task deleted.");
      void qc.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  const tasks = useMemo(() => {
    const t = term.trim().toLowerCase();
    return (data ?? []).filter(
      (task) =>
        (!t || task.title.toLowerCase().includes(t) || (task.description ?? "").toLowerCase().includes(t)) &&
        (priority === "all" || task.priority === priority) &&
        (status === "all" || task.status === status),
    );
  }, [data, term, priority, status]);

  return (
    <div>
      <PageHeader
        title="Tasks"
        description="Everything you need to do, private to your account."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 size-4" /> New task</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto">
              <DialogHeader><DialogTitle>New task</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label htmlFor="t">Title</Label><Input id="t" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
                <div><Label htmlFor="d">Description</Label><Textarea id="d" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Priority</Label>
                    <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label htmlFor="em">Estimated minutes</Label><Input id="em" type="number" min={0} value={form.estimated_minutes} onChange={(e) => setForm({ ...form, estimated_minutes: e.target.value })} /></div>
                  <div><Label htmlFor="dd">Due date</Label><Input id="dd" type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
                  <div><Label htmlFor="dt">Due time</Label><Input id="dt" type="time" value={form.due_time} onChange={(e) => setForm({ ...form, due_time: e.target.value })} /></div>
                  <div><Label htmlFor="c">Category</Label><Input id="c" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
                  <div><Label htmlFor="tg">Tags (comma separated)</Label><Input id="tg" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} /></div>
                </div>
                <Button className="w-full" disabled={create.isPending} onClick={() => create.mutate()}>
                  {create.isPending ? "Saving…" : "Create task"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <Input placeholder="Search tasks…" className="max-w-xs" value={term} onChange={(e) => setTerm(e.target.value)} />
        <Select value={priority} onValueChange={setPriority}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            {PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <LoadingBlock />
      ) : error ? (
        <ErrorState message={(error as Error).message} />
      ) : tasks.length === 0 ? (
        <EmptyState title="No tasks yet" description="Create your first task, or generate tasks from a meeting's action items." />
      ) : (
        <Tabs defaultValue="list">
          <TabsList>
            <TabsTrigger value="list">List</TabsTrigger>
            <TabsTrigger value="board">Kanban</TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="space-y-2">
            {tasks.map((task) => (
              <Card key={task.id}>
                <CardContent className="flex flex-wrap items-center gap-3 p-4">
                  <Checkbox
                    checked={task.status === "done"}
                    onCheckedChange={(v) =>
                      update.mutate({
                        id: task.id,
                        patch: { status: v ? "done" : "todo", completed_at: v ? new Date().toISOString() : null },
                      })
                    }
                  />
                  <div className="min-w-40 flex-1">
                    <p className={task.status === "done" ? "font-medium line-through opacity-60" : "font-medium"}>{task.title}</p>
                    <p className="text-xs text-muted-foreground">
                      Due {fmtDate(task.due_date)} {task.due_time ? `· ${task.due_time.slice(0, 5)}` : ""} · {STATUS_LABEL[task.status]}
                      {isOverdue(task.due_date, task.status) ? " · Overdue" : ""}
                    </p>
                  </div>
                  <Badge variant="outline" className={priorityClass(task.priority)}>{task.priority}</Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const next = new Date();
                      next.setDate(next.getDate() + 1);
                      update.mutate({ id: task.id, patch: { due_date: next.toISOString().slice(0, 10) } });
                    }}
                  >
                    Postpone
                  </Button>
                  <Button variant="ghost" size="icon" aria-label="Delete task" onClick={() => remove.mutate(task.id)}>
                    <Trash2 className="size-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="board">
            <div className="grid gap-4 md:grid-cols-3">
              {STATUSES.map((col) => (
                <Card
                  key={col}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    const id = e.dataTransfer.getData("text/plain");
                    if (id) update.mutate({ id, patch: { status: col, completed_at: col === "done" ? new Date().toISOString() : null } });
                  }}
                >
                  <CardHeader className="pb-2"><CardTitle className="text-sm">{STATUS_LABEL[col]}</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {tasks.filter((t) => t.status === col).map((t) => (
                      <div
                        key={t.id}
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData("text/plain", t.id)}
                        className="cursor-grab rounded-lg border border-border bg-card p-3 text-sm shadow-sm"
                      >
                        <p className="font-medium">{t.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">Due {fmtDate(t.due_date)}</p>
                      </div>
                    ))}
                    {tasks.filter((t) => t.status === col).length === 0 && (
                      <p className="py-6 text-center text-xs text-muted-foreground">Drop tasks here</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
