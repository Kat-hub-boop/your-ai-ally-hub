import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { callAiJson } from "./ai.server";

function fail(message: string): never {
  throw new Error(message);
}

/* ---------------------------------- Meetings --------------------------------- */

export type MeetingSummary = {
  overview: { title: string; date: string; participants: string; purpose: string };
  executive_summary: string;
  discussion_points: string[];
  decisions: string[];
  suggestions: string[];
  action_items: {
    task: string;
    responsible: string;
    deadline: string;
    priority: string;
  }[];
  issues: string[];
  next_steps: string[];
  follow_up: string[];
  notes_on_gaps: string[];
};

export const summarizeMeeting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ meetingId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }): Promise<MeetingSummary> => {
    const { data: meeting, error } = await context.supabase
      .from("meetings")
      .select("*")
      .eq("id", data.meetingId)
      .single();
    if (error || !meeting) fail("Meeting not found.");
    if (!meeting.raw_notes || meeting.raw_notes.trim().length < 20)
      fail("Add a transcript or meeting notes (at least a few sentences) before summarizing.");

    const result = await callAiJson<MeetingSummary>({
      system:
        "You summarize meeting transcripts/notes. Extract ONLY what the supplied text supports. Use 'Not specified' for any missing field. Keep decisions (agreed) separate from suggestions (proposed, not agreed).",
      prompt: `Meeting title: ${meeting.title}
Date: ${meeting.meeting_date ?? "Not specified"}
Participants: ${meeting.participants ?? "Not specified"}
Stated purpose: ${meeting.purpose ?? "Not specified"}

TRANSCRIPT / NOTES:
"""
${meeting.raw_notes}
"""

Return JSON:
{"overview":{"title":"","date":"","participants":"","purpose":""},
"executive_summary":"",
"discussion_points":[],
"decisions":[],
"suggestions":[],
"action_items":[{"task":"","responsible":"","deadline":"","priority":"urgent|high|medium|low or Not specified"}],
"issues":[],
"next_steps":[],
"follow_up":[],
"notes_on_gaps":["information that was missing or unclear in the source"]}`,
    });
    if (!result.ok) fail(result.error);

    await context.supabase
      .from("meetings")
      .update({ summary: result.data as never, summary_generated_at: new Date().toISOString() })
      .eq("id", data.meetingId);

    return result.data;
  });

/* ---------------------------------- Planner ---------------------------------- */

export type DayPlan = {
  summary: string;
  blocks: { start: string; end: string; title: string; type: string; reason: string }[];
  warnings: string[];
  postpone_suggestions: { task: string; reason: string }[];
  next_best_action: string;
};

export const planMyDay = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        prompt: z.string().max(2000).optional(),
        kind: z.enum(["daily", "weekly"]).default("daily"),
        date: z.string(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }): Promise<DayPlan> => {
    const [{ data: tasks }, { data: profile }] = await Promise.all([
      context.supabase
        .from("tasks")
        .select("id,title,description,priority,status,due_date,due_time,estimated_minutes,category,depends_on")
        .neq("status", "done")
        .order("due_date", { ascending: true })
        .limit(120),
      context.supabase.from("profiles").select("work_start,work_end,break_minutes").eq("id", context.userId).single(),
    ]);

    if (!tasks || tasks.length === 0) fail("You have no open tasks to plan yet. Add some tasks first.");

    const result = await callAiJson<DayPlan>({
      system:
        "You are a realistic scheduling assistant. Plan ONLY the tasks supplied. Never invent tasks, deadlines or requirements. Respect the working hours, include breaks, and flag overdue, conflicting, unrealistic or overloaded schedules honestly.",
      prompt: `Today's date: ${data.date}
Planning horizon: ${data.kind}
Working hours: ${profile?.work_start ?? "09:00"} to ${profile?.work_end ?? "17:00"}
Preferred break length: ${profile?.break_minutes ?? 15} minutes
User instruction: ${data.prompt?.trim() || "Not specified"}

OPEN TASKS (JSON):
${JSON.stringify(tasks)}

Prioritise by urgency, importance, deadline, estimated duration and dependencies.
Return JSON:
{"summary":"",
"blocks":[{"start":"HH:MM","end":"HH:MM","title":"","type":"task|break|buffer","reason":""}],
"warnings":["overdue / conflict / overload / unrealistic-duration warnings"],
"postpone_suggestions":[{"task":"","reason":""}],
"next_best_action":""}`,
    });
    if (!result.ok) fail(result.error);

    await context.supabase.from("plans").insert({
      user_id: context.userId,
      kind: data.kind,
      plan_date: data.date,
      prompt: data.prompt ?? null,
      content: result.data as never,
    });

    return result.data;
  });

/* ---------------------------------- Research --------------------------------- */

export type ResearchOverview = {
  topic_understanding: string;
  key_questions: string[];
  themes: string[];
  gaps: string[];
  further_questions: string[];
  uncertainties: string[];
};

export const buildResearchOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ researchProjectId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }): Promise<ResearchOverview> => {
    const { data: rp } = await context.supabase
      .from("research_projects")
      .select("*")
      .eq("id", data.researchProjectId)
      .single();
    if (!rp) fail("Research project not found.");
    const { data: sources } = await context.supabase
      .from("sources")
      .select("title,authors,publisher,publication_date,source_type,relevance,credibility")
      .eq("research_project_id", rp.id);
    const { data: notes } = await context.supabase
      .from("notes")
      .select("title,content")
      .eq("research_project_id", rp.id);

    const result = await callAiJson<ResearchOverview>({
      system:
        "You help a researcher structure their own topic. Use only the supplied topic, question, saved sources and notes. Never fabricate sources, statistics or findings. Frame framings/questions as suggestions.",
      prompt: `Title: ${rp.title}
Topic: ${rp.topic ?? "Not specified"}
Research question: ${rp.research_question ?? "Not specified"}
Saved sources (metadata only): ${JSON.stringify(sources ?? [])}
Saved notes: ${JSON.stringify(notes ?? [])}

Return JSON:
{"topic_understanding":"","key_questions":[],"themes":[],"gaps":[],"further_questions":[],"uncertainties":[]}`,
    });
    if (!result.ok) fail(result.error);

    await context.supabase
      .from("research_projects")
      .update({ overview: result.data as never })
      .eq("id", rp.id);
    return result.data;
  });

export type SourceAnalysis = {
  summary: string;
  main_argument: string;
  key_evidence: string[];
  methodology: string;
  strengths: string[];
  weaknesses: string[];
  bias: string;
  relevance: string;
  verification_advice: string;
};

export const analyzeSource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ sourceId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }): Promise<SourceAnalysis> => {
    const { data: source } = await context.supabase.from("sources").select("*").eq("id", data.sourceId).single();
    if (!source) fail("Source not found.");
    if (!source.content || source.content.trim().length < 40)
      fail("Paste the source text, abstract or your excerpt before analysing — the AI must not guess its content.");

    const result = await callAiJson<SourceAnalysis>({
      system:
        "Analyse ONLY the supplied source material. Never invent quotations, statistics, authors or findings. If something is not present in the supplied text, write 'Not specified'.",
      prompt: `Title: ${source.title}
Authors: ${source.authors ?? "Not specified"}
Publication date: ${source.publication_date ?? "Not specified"}
Publisher / journal / site: ${source.publisher ?? "Not specified"}
Type: ${source.source_type}
Supplied material:
"""
${source.content}
"""

Return JSON:
{"summary":"","main_argument":"","key_evidence":[],"methodology":"","strengths":[],"weaknesses":[],"bias":"","relevance":"","verification_advice":""}`,
    });
    if (!result.ok) fail(result.error);

    await context.supabase
      .from("sources")
      .update({ analysis: result.data as never })
      .eq("id", source.id);
    return result.data;
  });

export type SourceComparison = {
  agreements: string[];
  conflicts: { claim: string; sources: string[]; note: string }[];
  gaps: string[];
  verification_advice: string;
};

export const compareSources = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ researchProjectId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }): Promise<SourceComparison> => {
    const { data: sources } = await context.supabase
      .from("sources")
      .select("title,authors,publication_date,publisher,source_type,credibility,content,analysis")
      .eq("research_project_id", data.researchProjectId);
    if (!sources || sources.length < 2) fail("Save at least two sources with content before comparing them.");

    const result = await callAiJson<SourceComparison>({
      system:
        "Compare ONLY the supplied sources. Identify agreement and conflicting evidence. Never invent claims or citations. Reference sources by their exact supplied title.",
      prompt: `SOURCES:\n${JSON.stringify(sources)}\n\nReturn JSON:
{"agreements":[],"conflicts":[{"claim":"","sources":[],"note":""}],"gaps":[],"verification_advice":""}`,
    });
    if (!result.ok) fail(result.error);
    return result.data;
  });

export type ResearchAnswer = {
  answer: string;
  facts: string[];
  opinions_or_interpretation: string[];
  uncertainty: string[];
  citations: { source_title: string; supports: string }[];
  suggested_next_research: string[];
};

export const researchChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ researchProjectId: z.string().uuid(), question: z.string().min(2).max(2000) }).parse(d),
  )
  .handler(async ({ data, context }): Promise<ResearchAnswer> => {
    const { data: rp } = await context.supabase
      .from("research_projects")
      .select("title,topic,research_question")
      .eq("id", data.researchProjectId)
      .single();
    const { data: sources } = await context.supabase
      .from("sources")
      .select("title,authors,publication_date,publisher,credibility,content,analysis")
      .eq("research_project_id", data.researchProjectId);
    const { data: notes } = await context.supabase
      .from("notes")
      .select("title,content")
      .eq("research_project_id", data.researchProjectId);

    const result = await callAiJson<ResearchAnswer>({
      system:
        "Answer using ONLY the supplied research context and saved sources. Cite the saved source titles that support each claim. Separate facts from interpretation, state uncertainty plainly, and suggest verification. If the context cannot answer, say so.",
      prompt: `Research project: ${rp?.title ?? "Not specified"}
Topic: ${rp?.topic ?? "Not specified"}
Research question: ${rp?.research_question ?? "Not specified"}
Saved sources: ${JSON.stringify(sources ?? [])}
Saved notes: ${JSON.stringify(notes ?? [])}

USER QUESTION: ${data.question}

Return JSON:
{"answer":"","facts":[],"opinions_or_interpretation":[],"uncertainty":[],"citations":[{"source_title":"","supports":""}],"suggested_next_research":[]}`,
    });
    if (!result.ok) fail(result.error);
    return result.data;
  });

export type WritingDraft = { title: string; sections: { heading: string; content: string }[]; citations_used: string[]; caveats: string[] };

export const draftDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        researchProjectId: z.string().uuid(),
        docType: z.enum(["essay", "report", "literature_review", "proposal", "executive_summary", "presentation_outline"]),
        instruction: z.string().max(2000).optional(),
        style: z.enum(["apa7", "harvard", "mla", "chicago"]).default("apa7"),
      })
      .parse(d),
  )
  .handler(async ({ data, context }): Promise<WritingDraft> => {
    const { data: rp } = await context.supabase
      .from("research_projects")
      .select("title,topic,research_question,overview")
      .eq("id", data.researchProjectId)
      .single();
    const { data: sources } = await context.supabase
      .from("sources")
      .select("title,authors,publication_date,publisher,content,analysis")
      .eq("research_project_id", data.researchProjectId);
    const { data: notes } = await context.supabase
      .from("notes")
      .select("title,content")
      .eq("research_project_id", data.researchProjectId);

    const result = await callAiJson<WritingDraft>({
      system:
        "Draft structured academic/professional writing using ONLY the supplied research context, saved notes and saved sources. Tie every substantive claim to a saved source using in-text citations in the requested style. Never fabricate references, quotes or data. Where evidence is missing, write '[evidence needed]'.",
      prompt: `Document type: ${data.docType}
Citation style: ${data.style}
Extra instruction: ${data.instruction?.trim() || "Not specified"}
Research project: ${JSON.stringify(rp ?? {})}
Saved notes: ${JSON.stringify(notes ?? [])}
Saved sources: ${JSON.stringify(sources ?? [])}

Return JSON:
{"title":"","sections":[{"heading":"","content":""}],"citations_used":[],"caveats":[]}`,
    });
    if (!result.ok) fail(result.error);
    return result.data;
  });

/* ------------------------------ Global assistant ----------------------------- */

export type AssistantReply = { answer: string; suggestions: string[]; uncertainty: string[] };

export const assistantAsk = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ question: z.string().min(2).max(2000), page: z.string().max(200).optional() }).parse(d),
  )
  .handler(async ({ data, context }): Promise<AssistantReply> => {
    const [tasks, meetings, research, projects] = await Promise.all([
      context.supabase
        .from("tasks")
        .select("title,status,priority,due_date,estimated_minutes")
        .order("due_date", { ascending: true })
        .limit(60),
      context.supabase.from("meetings").select("title,meeting_date").order("meeting_date", { ascending: false }).limit(20),
      context.supabase.from("research_projects").select("title,topic,status,deadline").limit(20),
      context.supabase.from("projects").select("name,status,deadline").limit(20),
    ]);

    const result = await callAiJson<AssistantReply>({
      system:
        "You are the in-app assistant for this private workspace. Answer using ONLY the user's own workspace data supplied below plus general how-to knowledge about using the app. Never invent tasks, meetings, deadlines or data. Label recommendations as suggestions.",
      prompt: `Current page: ${data.page ?? "Not specified"}
Tasks: ${JSON.stringify(tasks.data ?? [])}
Meetings: ${JSON.stringify(meetings.data ?? [])}
Research projects: ${JSON.stringify(research.data ?? [])}
Projects: ${JSON.stringify(projects.data ?? [])}

QUESTION: ${data.question}

Return JSON: {"answer":"","suggestions":[],"uncertainty":[]}`,
    });
    if (!result.ok) fail(result.error);
    return result.data;
  });

export type DashboardSuggestions = { suggestions: { title: string; detail: string }[] };

export const dashboardSuggestions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DashboardSuggestions> => {
    const { data: tasks } = await context.supabase
      .from("tasks")
      .select("title,status,priority,due_date,estimated_minutes")
      .neq("status", "done")
      .limit(60);
    if (!tasks || tasks.length === 0) return { suggestions: [] };

    const result = await callAiJson<DashboardSuggestions>({
      system:
        "Give at most 4 short, practical suggestions based only on the supplied open tasks. Never invent tasks or deadlines. Each suggestion is advice, not a fact.",
      prompt: `Today: ${new Date().toISOString().slice(0, 10)}\nOpen tasks: ${JSON.stringify(tasks)}\nReturn JSON: {"suggestions":[{"title":"","detail":""}]}`,
    });
    if (!result.ok) return { suggestions: [] };
    return result.data;
  });
