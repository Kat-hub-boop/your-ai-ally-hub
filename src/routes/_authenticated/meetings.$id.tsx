import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Copy, Download, FileText, ListPlus, Share2, Sparkles, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AiSafetyNote, ErrorState, LoadingBlock, PageHeader } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { summarizeMeeting, type MeetingSummary } from "@/lib/ai.functions";
import { downloadDocx, downloadPdf, sectionsToText, summaryToSections } from "@/lib/export";
import { fmtDate, priorityClass } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/meetings/$id")({
  head: () => ({
    meta: [
      { title: "Meeting summary — AI Productivity Suite" },
      { name: "description", content: "Structured meeting summary with decisions, action items and follow-ups." },
      { property: "og:title", content: "Meeting summary — AI Productivity Suite" },
      { property: "og:description", content: "Structured meeting summary with decisions, action items and follow-ups." },
    ],
  }),
  component: MeetingDetail,
});

function MeetingDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const summarize = useServerFn(summarizeMeeting);
  const [busy, setBusy] = useState(false);
  const [notesDraft, setNotesDraft] = useState<string | null>(null);

  const { data: meeting, isLoading, error } = useQuery({
    queryKey: ["meeting", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("meetings").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

  const summary = (meeting?.summary ?? null) as MeetingSummary | null;

  const saveNotes = useMutation({
    mutationFn: async (notes: string) => {
      const { error } = await supabase.from("meetings").update({ raw_notes: notes }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Notes saved");
      setNotesDraft(null);
      void qc.invalidateQueries({ queryKey: ["meeting", id] });
    },
  });

  const saveSummary = useMutation({
    mutationFn: async (next: MeetingSummary) => {
      const { error } = await supabase.from("meetings").update({ summary: next as never }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Summary updated");
      void qc.invalidateQueries({ queryKey: ["meeting", id] });
    },
  });

  const createTasks = useMutation({
    mutationFn: async () => {
      if (!summary?.action_items?.length) throw new Error("There are no action items to convert.");
      const { data: auth } = await supabase.auth.getUser();
      const rows = summary.action_items.map((a) => {
        const deadline = /^\d{4}-\d{2}-\d{2}$/.test(a.deadline ?? "") ? a.deadline : null;
        const priority = ["urgent", "high", "medium", "low"].includes((a.priority ?? "").toLowerCase())
          ? a.priority.toLowerCase()
          : "medium";
        return {
          user_id: auth.user!.id,
          meeting_id: id,
          title: a.task,
          description: `From meeting “${meeting?.title}”. Responsible: ${a.responsible || "Not specified"}. Deadline as stated: ${a.deadline || "Not specified"}. Priority as stated: ${a.priority || "Not specified"}.`,
          responsible_person: a.responsible || null,
          due_date: deadline,
          priority,
          category: "Meeting action item",
        };
      });
      const { error } = await supabase.from("tasks").insert(rows);
      if (error) throw error;
      return rows.length;
    },
    onSuccess: (count) => toast.success(`${count} task(s) created from action items`),
    onError: (e: Error) => toast.error(e.message),
  });

  async function generate() {
    setBusy(true);
    try {
      await summarize({ data: { meetingId: id } });
      toast.success("Summary generated");
      void qc.invalidateQueries({ queryKey: ["meeting", id] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not generate the summary.");
    } finally {
      setBusy(false);
    }
  }

  if (isLoading) return <LoadingBlock rows={4} />;
  if (error || !meeting) return <ErrorState message="This meeting could not be loaded." />;

  const sections = summary ? summaryToSections(meeting.title, summary as unknown as Record<string, unknown>) : [];
  const plainText = summary ? sectionsToText(meeting.title, sections) : "";

  return (
    <div className="space-y-6">
      <PageHeader
        title={meeting.title}
        description={`${fmtDate(meeting.meeting_date)} · ${meeting.participants || "Participants not specified"}`}
        actions={
          <>
            <Button onClick={() => void generate()} disabled={busy}>
              <Sparkles className="mr-2 size-4" /> {busy ? "Summarising…" : summary ? "Regenerate summary" : "Generate summary"}
            </Button>
            {summary && (
              <>
                <Button variant="outline" onClick={() => { void navigator.clipboard.writeText(plainText); toast.success("Summary copied"); }}>
                  <Copy className="mr-2 size-4" /> Copy
                </Button>
                <Button
                  variant="outline"
                  onClick={async () => {
                    if (navigator.share) {
                      try { await navigator.share({ title: meeting.title, text: plainText }); return; } catch { /* cancelled */ }
                    }
                    await navigator.clipboard.writeText(plainText);
                    toast.success("Summary copied — ready to share");
                  }}
                >
                  <Share2 className="mr-2 size-4" /> Share
                </Button>
                <Button variant="outline" onClick={() => void downloadPdf(meeting.title, sections)}>
                  <Download className="mr-2 size-4" /> PDF
                </Button>
                <Button variant="outline" onClick={() => void downloadDocx(meeting.title, sections)}>
                  <FileText className="mr-2 size-4" /> DOCX
                </Button>
              </>
            )}
          </>
        }
      />

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Transcript / notes</CardTitle>
          {notesDraft !== null && (
            <Button size="sm" onClick={() => saveNotes.mutate(notesDraft)}>Save notes</Button>
          )}
        </CardHeader>
        <CardContent className="space-y-2">
          <Textarea
            rows={8}
            value={notesDraft ?? meeting.raw_notes ?? ""}
            onChange={(e) => setNotesDraft(e.target.value)}
            placeholder="Paste the transcript or your raw notes here…"
          />
          {meeting.file_name && <p className="text-xs text-muted-foreground">Attached file: {meeting.file_name}</p>}
        </CardContent>
      </Card>

      {!summary ? (
        <AiSafetyNote>
          Generate a summary to extract the overview, executive summary, discussion points, decisions, action items,
          issues, next steps and follow-ups. The AI only uses your supplied notes and marks anything missing as “Not
          specified”.
        </AiSafetyNote>
      ) : (
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Overview</CardTitle></CardHeader>
            <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
              <p><span className="text-muted-foreground">Title: </span>{summary.overview?.title || "Not specified"}</p>
              <p><span className="text-muted-foreground">Date: </span>{summary.overview?.date || "Not specified"}</p>
              <p><span className="text-muted-foreground">Participants: </span>{summary.overview?.participants || "Not specified"}</p>
              <p><span className="text-muted-foreground">Purpose: </span>{summary.overview?.purpose || "Not specified"}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Executive summary</CardTitle></CardHeader>
            <CardContent>
              <Textarea
                rows={4}
                defaultValue={summary.executive_summary}
                onBlur={(e) => {
                  if (e.target.value !== summary.executive_summary)
                    saveSummary.mutate({ ...summary, executive_summary: e.target.value });
                }}
              />
              <p className="mt-1 text-xs text-muted-foreground">Edits save automatically when you click away.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Action items</CardTitle>
              <Button size="sm" onClick={() => createTasks.mutate()} disabled={createTasks.isPending}>
                <ListPlus className="mr-2 size-4" /> Create tasks from action items
              </Button>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {summary.action_items?.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Task</TableHead>
                      <TableHead>Responsible person</TableHead>
                      <TableHead>Deadline</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summary.action_items.map((a, i) => (
                      <TableRow key={i}>
                        <TableCell>{a.task}</TableCell>
                        <TableCell>{a.responsible || "Not specified"}</TableCell>
                        <TableCell>{a.deadline || "Not specified"}</TableCell>
                        <TableCell><Badge variant="outline" className={priorityClass((a.priority ?? "").toLowerCase())}>{a.priority || "Not specified"}</Badge></TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Remove action item"
                            onClick={() =>
                              saveSummary.mutate({ ...summary, action_items: summary.action_items.filter((_, k) => k !== i) })
                            }
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground">Not specified</p>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            {([
              ["Discussion points", summary.discussion_points],
              ["Decisions (agreed)", summary.decisions],
              ["Suggestions (proposed, not agreed)", summary.suggestions],
              ["Issues / concerns", summary.issues],
              ["Next steps", summary.next_steps],
              ["Follow-up", summary.follow_up],
              ["Gaps in the source material", summary.notes_on_gaps],
            ] as const).map(([heading, items]) => (
              <Card key={heading}>
                <CardHeader><CardTitle className="text-base">{heading}</CardTitle></CardHeader>
                <CardContent>
                  {items?.length ? (
                    <ul className="list-disc space-y-1 pl-5 text-sm">{items.map((x, i) => <li key={i}>{x}</li>)}</ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">Not specified</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <AiSafetyNote>
            This summary is extracted only from your supplied notes — nothing was invented. Decisions and suggestions are
            listed separately; verify anything critical against the original recording or notes.
          </AiSafetyNote>
        </div>
      )}
    </div>
  );
}
