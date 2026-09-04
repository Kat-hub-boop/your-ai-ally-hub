import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AiSafetyNote, EmptyState, LoadingBlock, PageHeader } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { fmtDate, todayISO } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/meetings/")({
  head: () => ({
    meta: [
      { title: "Meetings — AI Productivity Suite" },
      { name: "description", content: "Summarise meeting notes into decisions, action items and follow-ups." },
      { property: "og:title", content: "Meetings — AI Productivity Suite" },
      { property: "og:description", content: "Summarise meeting notes into decisions, action items and follow-ups." },
    ],
  }),
  component: MeetingsPage,
});

function MeetingsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    title: "",
    meeting_date: todayISO(),
    participants: "",
    purpose: "",
    raw_notes: "",
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ["meetings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("meetings").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!form.title.trim()) throw new Error("A meeting title is required.");
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user!.id;
      let filePath: string | null = null;
      let notes = form.raw_notes;

      if (file) {
        if (file.size > 20 * 1024 * 1024) throw new Error("Files must be 20MB or smaller.");
        filePath = `${userId}/${crypto.randomUUID()}-${file.name}`;
        const { error: upErr } = await supabase.storage.from("meeting-docs").upload(filePath, file);
        if (upErr) throw upErr;
        if (/\.(txt|md|csv|vtt|srt)$/i.test(file.name)) {
          const text = await file.text();
          notes = `${notes}\n\n--- Uploaded: ${file.name} ---\n${text}`.trim();
        }
      }

      const { data: row, error } = await supabase
        .from("meetings")
        .insert({
          user_id: userId,
          title: form.title.trim(),
          meeting_date: form.meeting_date || null,
          participants: form.participants || null,
          purpose: form.purpose || null,
          raw_notes: notes || null,
          file_path: filePath,
          file_name: file?.name ?? null,
        })
        .select("id")
        .single();
      if (error) throw error;
      return row.id;
    },
    onSuccess: (id) => {
      toast.success("Meeting saved");
      setOpen(false);
      setFile(null);
      setForm({ title: "", meeting_date: todayISO(), participants: "", purpose: "", raw_notes: "" });
      void qc.invalidateQueries({ queryKey: ["meetings"] });
      void navigate({ to: "/meetings/$id", params: { id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = (data ?? []).filter((m) =>
    `${m.title} ${m.participants ?? ""}`.toLowerCase().includes(term.toLowerCase()),
  );

  return (
    <div>
      <PageHeader
        title="Meetings"
        description="Store meeting notes and generate structured, fact-only summaries."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 size-4" /> New meeting</Button></DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>New meeting</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label htmlFor="mt">Title *</Label><Input id="mt" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div><Label htmlFor="md">Date</Label><Input id="md" type="date" value={form.meeting_date} onChange={(e) => setForm({ ...form, meeting_date: e.target.value })} /></div>
                  <div><Label htmlFor="mp">Participants</Label><Input id="mp" placeholder="Comma separated" value={form.participants} onChange={(e) => setForm({ ...form, participants: e.target.value })} /></div>
                </div>
                <div><Label htmlFor="mu">Purpose</Label><Input id="mu" value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} /></div>
                <div><Label htmlFor="mn">Transcript or notes</Label><Textarea id="mn" rows={8} value={form.raw_notes} onChange={(e) => setForm({ ...form, raw_notes: e.target.value })} /></div>
                <div>
                  <Label htmlFor="mf">Attach a document (optional)</Label>
                  <Input id="mf" type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                  <p className="mt-1 text-xs text-muted-foreground">Text files (.txt, .md, .vtt, .srt, .csv) are also added to the notes.</p>
                </div>
                <AiSafetyNote>The summary is generated only from what you supply here. Missing details are marked “Not specified”.</AiSafetyNote>
                <Button className="w-full" disabled={create.isPending} onClick={() => create.mutate()}>
                  {create.isPending ? "Saving…" : "Save meeting"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <Input className="mb-4 max-w-sm" placeholder="Search past meetings…" value={term} onChange={(e) => setTerm(e.target.value)} />

      {isLoading ? (
        <LoadingBlock />
      ) : error ? (
        <p className="text-sm text-destructive">Could not load meetings.</p>
      ) : filtered.length === 0 ? (
        <EmptyState title="No meetings yet" description="Add a meeting with its transcript or notes to generate a structured summary and action items." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((m) => (
            <Link key={m.id} to="/meetings/$id" params={{ id: m.id }}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{m.title}</CardTitle>
                  <p className="text-xs text-muted-foreground">{fmtDate(m.meeting_date)}</p>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="line-clamp-2 text-sm text-muted-foreground">{m.participants || "Participants not specified"}</p>
                  <Badge variant={m.summary ? "default" : "secondary"}>{m.summary ? "Summarised" : "Not summarised"}</Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
