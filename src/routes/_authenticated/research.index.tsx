import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState, ErrorState, LoadingBlock, PageHeader } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { fmtDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/research/")({
  head: () => ({
    meta: [
      { title: "Research — AI Productivity Suite" },
      { name: "description", content: "Private research workspaces with sources, notes, citations and AI analysis." },
      { property: "og:title", content: "Research — AI Productivity Suite" },
      { property: "og:description", content: "Private research workspaces with sources, notes, citations and AI analysis." },
    ],
  }),
  component: ResearchIndex,
});

function ResearchIndex() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [form, setForm] = useState({ title: "", topic: "", research_question: "", deadline: "" });

  const { data, isLoading, error } = useQuery({
    queryKey: ["research_projects"],
    queryFn: async () => {
      const { data, error } = await supabase.from("research_projects").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!form.title.trim()) throw new Error("A title is required.");
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await supabase.from("research_projects").insert({
        user_id: auth.user!.id,
        title: form.title.trim(),
        topic: form.topic || null,
        research_question: form.research_question || null,
        deadline: form.deadline || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Research project created.");
      setOpen(false);
      setForm({ title: "", topic: "", research_question: "", deadline: "" });
      void qc.invalidateQueries({ queryKey: ["research_projects"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const items = (data ?? []).filter((r) => r.title.toLowerCase().includes(term.trim().toLowerCase()));

  return (
    <div>
      <PageHeader
        title="Research"
        description="Workspaces for your topics, sources, notes and citations."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 size-4" /> New research project</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New research project</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label htmlFor="rt">Title</Label><Input id="rt" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
                <div><Label htmlFor="rtp">Topic</Label><Textarea id="rtp" rows={2} value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} /></div>
                <div><Label htmlFor="rq">Research question</Label><Textarea id="rq" rows={2} value={form.research_question} onChange={(e) => setForm({ ...form, research_question: e.target.value })} /></div>
                <div><Label htmlFor="rd">Deadline</Label><Input id="rd" type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} /></div>
                <Button className="w-full" disabled={create.isPending} onClick={() => create.mutate()}>
                  {create.isPending ? "Saving…" : "Create"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <Input placeholder="Search research projects…" className="mb-4 max-w-sm" value={term} onChange={(e) => setTerm(e.target.value)} />

      {isLoading ? (
        <LoadingBlock />
      ) : error ? (
        <ErrorState message={(error as Error).message} />
      ) : items.length === 0 ? (
        <EmptyState title="No research projects" description="Start a workspace to collect sources, notes and citations." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((r) => (
            <Link key={r.id} to="/research/$id" params={{ id: r.id }}>
              <Card className="h-full transition-shadow hover:shadow-lg">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{r.title}</CardTitle>
                  <Badge variant="outline" className="w-fit">{r.status}</Badge>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  <p className="line-clamp-2">{r.topic || "Not specified"}</p>
                  <p className="mt-2 text-xs">Deadline: {fmtDate(r.deadline)}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
