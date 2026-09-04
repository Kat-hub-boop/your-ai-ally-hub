import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState, LoadingBlock, PageHeader } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { fmtDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/notes")({
  head: () => ({
    meta: [
      { title: "Notes — AI Productivity Suite" },
      { name: "description", content: "Capture and search private notes across projects and research." },
      { property: "og:title", content: "Notes — AI Productivity Suite" },
      { property: "og:description", content: "Capture and search private notes across projects and research." },
    ],
  }),
  component: NotesPage,
});

function NotesPage() {
  const qc = useQueryClient();
  const [term, setTerm] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", content: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["notes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("notes").select("*").order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await supabase.from("notes").insert({
        user_id: auth.user!.id,
        title: form.title.trim(),
        content: form.content,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Note saved");
      setForm({ title: "", content: "" });
      setOpen(false);
      void qc.invalidateQueries({ queryKey: ["notes"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["notes"] }),
  });

  const filtered = (data ?? []).filter(
    (n) => n.title.toLowerCase().includes(term.toLowerCase()) || (n.content ?? "").toLowerCase().includes(term.toLowerCase()),
  );

  return (
    <div>
      <PageHeader
        title="Notes"
        description="Persistent notes you can link to projects and research."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 size-4" /> New note</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New note</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label htmlFor="nt">Title</Label><Input id="nt" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
                <div><Label htmlFor="nc">Content</Label><Textarea id="nc" rows={8} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} /></div>
                <Button
                  className="w-full"
                  disabled={!form.title.trim() || create.isPending}
                  onClick={() => create.mutate()}
                >
                  {create.isPending ? "Saving…" : "Save note"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />
      <Input className="mb-4 max-w-sm" placeholder="Search notes…" value={term} onChange={(e) => setTerm(e.target.value)} />

      {isLoading ? (
        <LoadingBlock />
      ) : filtered.length === 0 ? (
        <EmptyState title="No notes yet" description="Create your first note to keep ideas, references and context in one private place." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((n) => (
            <Card key={n.id}>
              <CardHeader className="flex-row items-start justify-between space-y-0">
                <div>
                  <CardTitle className="text-base">{n.title}</CardTitle>
                  <p className="text-xs text-muted-foreground">Updated {fmtDate(n.updated_at.slice(0, 10))}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => remove.mutate(n.id)} aria-label="Delete note">
                  <Trash2 className="size-4" />
                </Button>
              </CardHeader>
              <CardContent className="whitespace-pre-wrap text-sm text-muted-foreground line-clamp-6">
                {n.content || "Empty note"}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
