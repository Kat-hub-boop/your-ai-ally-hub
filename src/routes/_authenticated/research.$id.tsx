import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Copy, Plus, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AiSafetyNote, EmptyState, LoadingBlock, PageHeader } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import {
  type ResearchAnswer,
  type ResearchOverview,
  type WritingDraft,
  analyzeSource,
  buildResearchOverview,
  compareSources,
  draftDocument,
  researchChat,
} from "@/lib/ai.functions";
import { CITATION_STYLES, type CitationStyle, buildCitation } from "@/lib/citations";
import { fmtDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/research/$id")({
  head: () => ({
    meta: [
      { title: "Research workspace — AI Productivity Suite" },
      { name: "description", content: "Sources, notes, AI analysis, citations and writing drafts for this research project." },
      { property: "og:title", content: "Research workspace — AI Productivity Suite" },
      { property: "og:description", content: "Sources, notes, AI analysis, citations and writing drafts." },
    ],
  }),
  component: ResearchDetail,
});

const DOC_TYPES = [
  { value: "essay", label: "Essay" },
  { value: "report", label: "Research report" },
  { value: "literature_review", label: "Literature review" },
  { value: "proposal", label: "Proposal" },
  { value: "executive_summary", label: "Executive summary" },
  { value: "presentation_outline", label: "Presentation outline" },
] as const;

const EMPTY_SOURCE = {
  title: "",
  authors: "",
  publication_date: "",
  publisher: "",
  url: "",
  source_type: "article",
  relevance: "medium",
  credibility: "unverified",
  content: "",
};

function ResearchDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const overviewFn = useServerFn(buildResearchOverview);
  const analyzeFn = useServerFn(analyzeSource);
  const compareFn = useServerFn(compareSources);
  const chatFn = useServerFn(researchChat);
  const draftFn = useServerFn(draftDocument);

  const [sourceOpen, setSourceOpen] = useState(false);
  const [sourceForm, setSourceForm] = useState(EMPTY_SOURCE);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<ResearchAnswer | null>(null);
  const [comparison, setComparison] = useState<string | null>(null);
  const [style, setStyle] = useState<CitationStyle>("apa7");
  const [docType, setDocType] = useState<(typeof DOC_TYPES)[number]["value"]>("essay");
  const [instruction, setInstruction] = useState("");
  const [draft, setDraft] = useState<WritingDraft | null>(null);

  const project = useQuery({
    queryKey: ["research_project", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("research_projects").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

  const sources = useQuery({
    queryKey: ["sources", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("sources").select("*").eq("research_project_id", id).order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const notes = useQuery({
    queryKey: ["research_notes", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("notes").select("*").eq("research_project_id", id).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const addSource = useMutation({
    mutationFn: async () => {
      if (!sourceForm.title.trim()) throw new Error("A source title is required.");
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await supabase.from("sources").insert({
        user_id: auth.user!.id,
        research_project_id: id,
        title: sourceForm.title.trim(),
        authors: sourceForm.authors || null,
        publication_date: sourceForm.publication_date || null,
        publisher: sourceForm.publisher || null,
        url: sourceForm.url || null,
        source_type: sourceForm.source_type,
        relevance: sourceForm.relevance,
        credibility: sourceForm.credibility,
        content: sourceForm.content || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Source saved.");
      setSourceOpen(false);
      setSourceForm(EMPTY_SOURCE);
      void qc.invalidateQueries({ queryKey: ["sources", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const overview = useMutation({
    mutationFn: () => overviewFn({ data: { researchProjectId: id } }),
    onSuccess: () => {
      toast.success("Overview generated.");
      void project.refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const analyze = useMutation({
    mutationFn: (sourceId: string) => analyzeFn({ data: { sourceId } }),
    onSuccess: () => {
      toast.success("Source analysed.");
      void qc.invalidateQueries({ queryKey: ["sources", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const compare = useMutation({
    mutationFn: () => compareFn({ data: { researchProjectId: id } }),
    onSuccess: (r) => setComparison(JSON.stringify(r, null, 2)),
    onError: (e: Error) => toast.error(e.message),
  });

  const ask = useMutation({
    mutationFn: () => chatFn({ data: { researchProjectId: id, question } }),
    onSuccess: (r) => setAnswer(r),
    onError: (e: Error) => toast.error(e.message),
  });

  const write = useMutation({
    mutationFn: () => draftFn({ data: { researchProjectId: id, docType, instruction: instruction || undefined, style } }),
    onSuccess: (r) => {
      setDraft(r);
      toast.success("Draft generated.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveCitation = useMutation({
    mutationFn: async (source: NonNullable<typeof sources.data>[number]) => {
      const c = buildCitation(source, style);
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await supabase.from("citations").insert({
        user_id: auth.user!.id,
        research_project_id: id,
        source_id: source.id,
        style,
        in_text: c.inText,
        reference: c.reference,
      });
      if (error) throw error;
      await navigator.clipboard.writeText(`${c.inText}\n\n${c.reference}`);
    },
    onSuccess: () => toast.success("Citation saved and copied."),
    onError: (e: Error) => toast.error(e.message),
  });

  if (project.isLoading) return <LoadingBlock />;
  const rp = project.data;
  const ov = rp?.overview as unknown as ResearchOverview | null;

  return (
    <div>
      <PageHeader
        title={rp?.title ?? "Research"}
        description={rp?.research_question || rp?.topic || "Not specified"}
        actions={
          <Button disabled={overview.isPending} onClick={() => overview.mutate()}>
            <Sparkles className="mr-2 size-4" /> {overview.isPending ? "Thinking…" : "AI topic overview"}
          </Button>
        }
      />

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sources">Sources</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="chat">Research chat</TabsTrigger>
          <TabsTrigger value="writing">Writing</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <AiSafetyNote>
            AI works only from your saved topic, notes and sources. It never fabricates references, quotations or statistics —
            always verify important findings against the original source.
          </AiSafetyNote>
          {!ov ? (
            <EmptyState title="No overview yet" description="Generate an AI overview to map questions, themes and gaps." />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {([
                ["Topic understanding", [ov.topic_understanding]],
                ["Key questions", ov.key_questions],
                ["Themes", ov.themes],
                ["Gaps", ov.gaps],
                ["Further questions", ov.further_questions],
                ["Uncertainties", ov.uncertainties],
              ] as [string, string[]][]).map(([heading, items]) => (
                <Card key={heading}>
                  <CardHeader className="pb-2"><CardTitle className="text-base">{heading}</CardTitle></CardHeader>
                  <CardContent className="space-y-1 text-sm text-muted-foreground">
                    {(items ?? []).map((line, i) => <p key={i}>• {line}</p>)}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="sources" className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Dialog open={sourceOpen} onOpenChange={setSourceOpen}>
              <DialogTrigger asChild><Button><Plus className="mr-2 size-4" /> Add source</Button></DialogTrigger>
              <DialogContent className="max-h-[85vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Add source</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label htmlFor="st">Title</Label><Input id="st" value={sourceForm.title} onChange={(e) => setSourceForm({ ...sourceForm, title: e.target.value })} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label htmlFor="sa">Author(s)</Label><Input id="sa" value={sourceForm.authors} onChange={(e) => setSourceForm({ ...sourceForm, authors: e.target.value })} /></div>
                    <div><Label htmlFor="sp">Publication date</Label><Input id="sp" value={sourceForm.publication_date} onChange={(e) => setSourceForm({ ...sourceForm, publication_date: e.target.value })} /></div>
                    <div><Label htmlFor="spub">Site / journal</Label><Input id="spub" value={sourceForm.publisher} onChange={(e) => setSourceForm({ ...sourceForm, publisher: e.target.value })} /></div>
                    <div><Label htmlFor="su">Link</Label><Input id="su" value={sourceForm.url} onChange={(e) => setSourceForm({ ...sourceForm, url: e.target.value })} /></div>
                    <div>
                      <Label>Type</Label>
                      <Select value={sourceForm.source_type} onValueChange={(v) => setSourceForm({ ...sourceForm, source_type: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["article", "journal", "book", "report", "website", "video", "other"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Relevance</Label>
                      <Select value={sourceForm.relevance} onValueChange={(v) => setSourceForm({ ...sourceForm, relevance: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{["high", "medium", "low"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Credibility</Label>
                      <Select value={sourceForm.credibility} onValueChange={(v) => setSourceForm({ ...sourceForm, credibility: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{["high", "medium", "low", "unverified"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div><Label htmlFor="sc">Source text / your notes on it</Label><Textarea id="sc" rows={5} value={sourceForm.content} onChange={(e) => setSourceForm({ ...sourceForm, content: e.target.value })} /></div>
                  <Button className="w-full" disabled={addSource.isPending} onClick={() => addSource.mutate()}>
                    {addSource.isPending ? "Saving…" : "Save source"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="outline" disabled={compare.isPending} onClick={() => compare.mutate()}>
              {compare.isPending ? "Comparing…" : "Compare sources"}
            </Button>
            <Select value={style} onValueChange={(v) => setStyle(v as CitationStyle)}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>{CITATION_STYLES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          {comparison && (
            <Card><CardHeader className="pb-2"><CardTitle className="text-base">Comparison</CardTitle></CardHeader>
              <CardContent><pre className="whitespace-pre-wrap text-xs text-muted-foreground">{comparison}</pre></CardContent>
            </Card>
          )}

          {sources.isLoading ? (
            <LoadingBlock />
          ) : (sources.data ?? []).length === 0 ? (
            <EmptyState title="No sources yet" description="Add the sources you have verified yourself — AI only analyses what you save." />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {(sources.data ?? []).map((s) => (
                <Card key={s.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{s.title}</CardTitle>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="outline">{s.source_type}</Badge>
                      <Badge variant="outline">relevance: {s.relevance}</Badge>
                      <Badge variant="outline">credibility: {s.credibility}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-muted-foreground">
                    <p>{s.authors || "Not specified"} · {s.publisher || "Not specified"} · {fmtDate(s.publication_date)}</p>
                    {s.url && <a className="block truncate text-primary underline" href={s.url} target="_blank" rel="noreferrer">{s.url}</a>}
                    {s.credibility === "unverified" || s.credibility === "low" ? (
                      <p className="rounded-md border border-warning/30 bg-warning/10 p-2 text-xs text-warning">
                        Reliability warning: verify this source before relying on it.
                      </p>
                    ) : null}
                    {s.analysis ? (
                      <pre className="max-h-52 overflow-auto whitespace-pre-wrap rounded-md bg-muted p-2 text-xs">
                        {JSON.stringify(s.analysis, null, 2)}
                      </pre>
                    ) : null}
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" disabled={analyze.isPending} onClick={() => analyze.mutate(s.id)}>Analyse</Button>
                      <Button size="sm" variant="outline" onClick={() => saveCitation.mutate(s)}>
                        <Copy className="mr-1 size-3.5" /> Cite
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="notes">
          {notes.isLoading ? (
            <LoadingBlock />
          ) : (notes.data ?? []).length === 0 ? (
            <EmptyState title="No notes linked" description="Create notes on the Notes page and link them to this research project." />
          ) : (
            <div className="space-y-2">
              {(notes.data ?? []).map((n) => (
                <Card key={n.id}>
                  <CardHeader className="pb-2"><CardTitle className="text-base">{n.title}</CardTitle></CardHeader>
                  <CardContent className="whitespace-pre-wrap text-sm text-muted-foreground">{n.content}</CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="chat" className="space-y-4">
          <div className="flex gap-2">
            <Input placeholder="Ask about your saved sources and notes…" value={question} onChange={(e) => setQuestion(e.target.value)} />
            <Button disabled={ask.isPending || question.trim().length < 2} onClick={() => ask.mutate()}>
              {ask.isPending ? "Thinking…" : "Ask"}
            </Button>
          </div>
          <AiSafetyNote>Answers come only from your saved research context, with citations to your own sources.</AiSafetyNote>
          {answer && (
            <Card>
              <CardContent className="space-y-3 p-4 text-sm">
                <p className="whitespace-pre-wrap">{answer.answer}</p>
                {answer.citations?.length ? (
                  <div>
                    <p className="font-medium">Cited sources</p>
                    {answer.citations.map((c, i) => <p key={i} className="text-muted-foreground">• {c.source_title} — {c.supports}</p>)}
                  </div>
                ) : null}
                {answer.uncertainty?.length ? (
                  <div>
                    <p className="font-medium">Uncertainty</p>
                    {answer.uncertainty.map((u, i) => <p key={i} className="text-muted-foreground">• {u}</p>)}
                  </div>
                ) : null}
                {answer.suggested_next_research?.length ? (
                  <div>
                    <p className="font-medium">Suggested next research</p>
                    {answer.suggested_next_research.map((u, i) => <p key={i} className="text-muted-foreground">• {u}</p>)}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="writing" className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Select value={docType} onValueChange={(v) => setDocType(v as typeof docType)}>
              <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
              <SelectContent>{DOC_TYPES.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={style} onValueChange={(v) => setStyle(v as CitationStyle)}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>{CITATION_STYLES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
            </Select>
            <Button disabled={write.isPending} onClick={() => write.mutate()}>{write.isPending ? "Drafting…" : "Generate draft"}</Button>
          </div>
          <Textarea rows={2} placeholder="Extra instruction (optional)" value={instruction} onChange={(e) => setInstruction(e.target.value)} />
          {draft && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">{draft.title}</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                {draft.sections.map((s, i) => (
                  <div key={i}>
                    <p className="font-medium">{s.heading}</p>
                    <p className="whitespace-pre-wrap text-muted-foreground">{s.content}</p>
                  </div>
                ))}
                {draft.caveats?.length ? (
                  <p className="text-xs text-muted-foreground">Caveats: {draft.caveats.join(" · ")}</p>
                ) : null}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    void navigator.clipboard.writeText(
                      `${draft.title}\n\n${draft.sections.map((s) => `${s.heading}\n${s.content}`).join("\n\n")}`,
                    );
                    toast.success("Draft copied.");
                  }}
                >
                  <Copy className="mr-1 size-3.5" /> Copy draft
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
