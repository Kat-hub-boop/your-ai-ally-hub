import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState, ErrorState, LoadingBlock, PageHeader } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { fmtDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/projects")({
  head: () => ({
    meta: [
      { title: "Projects — AI Productivity Suite" },
      { name: "description", content: "Group meetings, tasks, research and notes under one project with progress tracking." },
      { property: "og:title", content: "Projects — AI Productivity Suite" },
      { property: "og:description", content: "Group meetings, tasks, research and notes under one project." },
    ],
  }),
  component: ProjectsPage,
});

function ProjectsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", deadline: "" });

  const { data, isLoading, error } = useQuery({
    queryKey: ["projects-detail"],
    queryFn: async () => {
      const [projects, tasks, meetings, research, notes] = await Promise.all([
        supabase.from("projects").select("*").order("created_at", { ascending: false }),
        supabase.from("tasks").select("id,title,status,project_id"),
        supabase.from("meetings").select("id,title,project_id"),
        supabase.from("research_projects").select("id,title,project_id"),
        supabase.from("notes").select("id,title,project_id"),
      ]);
      if (projects.error) throw projects.error;
      return {
        projects: projects.data,
        tasks: tasks.data ?? [],
        meetings: meetings.data ?? [],
        research: research.data ?? [],
        notes: notes.data ?? [],
      };
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("A project name is required.");
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await supabase.from("projects").insert({
        user_id: auth.user!.id,
        name: form.name.trim(),
        description: form.description || null,
        deadline: form.deadline || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Project created.");
      setOpen(false);
      setForm({ name: "", description: "", deadline: "" });
      void qc.invalidateQueries({ queryKey: ["projects-detail"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Project deleted.");
      void qc.invalidateQueries({ queryKey: ["projects-detail"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader
        title="Projects"
        description="Everything related to a piece of work in one place."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 size-4" /> New project</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New project</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label htmlFor="pn">Name</Label><Input id="pn" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div><Label htmlFor="pdc">Description</Label><Textarea id="pdc" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                <div><Label htmlFor="pdl">Deadline</Label><Input id="pdl" type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} /></div>
                <Button className="w-full" disabled={create.isPending} onClick={() => create.mutate()}>
                  {create.isPending ? "Saving…" : "Create project"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      {isLoading ? (
        <LoadingBlock />
      ) : error ? (
        <ErrorState message={(error as Error).message} />
      ) : (data?.projects ?? []).length === 0 ? (
        <EmptyState title="No projects yet" description="Create a project to link meetings, tasks, research and notes together." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {(data?.projects ?? []).map((p) => {
            const tasks = data!.tasks.filter((t) => t.project_id === p.id);
            const done = tasks.filter((t) => t.status === "done").length;
            const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
            return (
              <Card key={p.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{p.name}</CardTitle>
                    <Button variant="ghost" size="icon" aria-label="Delete project" onClick={() => remove.mutate(p.id)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                  <Badge variant="outline" className="w-fit">{p.status}</Badge>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <p>{p.description || "Not specified"}</p>
                  <p className="text-xs">Deadline: {fmtDate(p.deadline)}</p>
                  <div>
                    <div className="mb-1 flex justify-between text-xs"><span>Progress</span><span>{pct}%</span></div>
                    <Progress value={pct} />
                  </div>
                  <p className="text-xs">
                    {tasks.length} tasks · {data!.meetings.filter((m) => m.project_id === p.id).length} meetings ·{" "}
                    {data!.research.filter((r) => r.project_id === p.id).length} research ·{" "}
                    {data!.notes.filter((n) => n.project_id === p.id).length} notes
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
