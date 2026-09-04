import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { CalendarDays, FileText, FolderKanban, ListTodo, Microscope, NotebookPen, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { fmtDate } from "@/lib/format";

type Hit = { id: string; type: string; title: string; subtitle: string; date?: string | null; to: string };

const TYPE_ICON: Record<string, typeof Search> = {
  Meeting: CalendarDays,
  Task: ListTodo,
  Project: FolderKanban,
  Research: Microscope,
  Note: NotebookPen,
  Source: FileText,
};

export function GlobalSearch({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [term, setTerm] = useState("");
  const [type, setType] = useState("all");
  const [sort, setSort] = useState("relevance");
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["global-search", term],
    enabled: open && term.trim().length >= 2,
    queryFn: async (): Promise<Hit[]> => {
      const q = `%${term.trim()}%`;
      const [meetings, tasks, projects, research, notes, sources] = await Promise.all([
        supabase.from("meetings").select("id,title,participants,meeting_date").ilike("title", q).limit(10),
        supabase.from("tasks").select("id,title,description,due_date").ilike("title", q).limit(10),
        supabase.from("projects").select("id,name,description,deadline").ilike("name", q).limit(10),
        supabase.from("research_projects").select("id,title,topic,deadline").ilike("title", q).limit(10),
        supabase.from("notes").select("id,title,content,updated_at").ilike("title", q).limit(10),
        supabase.from("sources").select("id,title,authors,research_project_id,created_at").ilike("title", q).limit(10),
      ]);
      const hits: Hit[] = [];
      for (const m of meetings.data ?? [])
        hits.push({ id: m.id, type: "Meeting", title: m.title, subtitle: m.participants ?? "No participants listed", date: m.meeting_date, to: `/meetings/${m.id}` });
      for (const t of tasks.data ?? [])
        hits.push({ id: t.id, type: "Task", title: t.title, subtitle: t.description ?? "No description", date: t.due_date, to: `/tasks` });
      for (const p of projects.data ?? [])
        hits.push({ id: p.id, type: "Project", title: p.name, subtitle: p.description ?? "No description", date: p.deadline, to: `/projects/${p.id}` });
      for (const r of research.data ?? [])
        hits.push({ id: r.id, type: "Research", title: r.title, subtitle: r.topic ?? "No topic", date: r.deadline, to: `/research/${r.id}` });
      for (const n of notes.data ?? [])
        hits.push({ id: n.id, type: "Note", title: n.title, subtitle: (n.content ?? "").slice(0, 90) || "Empty note", date: n.updated_at, to: `/notes` });
      for (const s of sources.data ?? [])
        hits.push({ id: s.id, type: "Source", title: s.title, subtitle: s.authors ?? "Author not specified", date: s.created_at, to: s.research_project_id ? `/research/${s.research_project_id}` : `/research` });
      return hits;
    },
  });

  const results = useMemo(() => {
    let list = data ?? [];
    if (type !== "all") list = list.filter((h) => h.type === type);
    if (sort === "title") list = [...list].sort((a, b) => a.title.localeCompare(b.title));
    if (sort === "date") list = [...list].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
    return list;
  }, [data, type, sort]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Search your workspace</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Meetings, tasks, projects, research, notes, sources…"
              className="pl-9"
            />
          </div>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="sm:w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["all", "Meeting", "Task", "Project", "Research", "Note", "Source"].map((t) => (
                <SelectItem key={t} value={t}>{t === "all" ? "All types" : t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="sm:w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="relevance">Relevance</SelectItem>
              <SelectItem value="title">Title A–Z</SelectItem>
              <SelectItem value="date">Newest date</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="max-h-[50vh] space-y-2 overflow-y-auto">
          {term.trim().length < 2 && (
            <p className="py-8 text-center text-sm text-muted-foreground">Type at least two characters to search.</p>
          )}
          {isLoading && <p className="py-8 text-center text-sm text-muted-foreground">Searching…</p>}
          {term.trim().length >= 2 && !isLoading && results.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">No matches found.</p>
          )}
          {results.map((hit) => {
            const Icon = TYPE_ICON[hit.type] ?? Search;
            return (
              <button
                key={`${hit.type}-${hit.id}`}
                onClick={() => {
                  onOpenChange(false);
                  void navigate({ to: hit.to as never });
                }}
                className="flex w-full items-start gap-3 rounded-lg border border-border bg-card p-3 text-left transition-colors hover:bg-accent"
              >
                <Icon className="mt-0.5 size-4 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{hit.title}</span>
                    <Badge variant="secondary" className="shrink-0">{hit.type}</Badge>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{hit.subtitle}</p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">{fmtDate(hit.date?.slice(0, 10))}</span>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
