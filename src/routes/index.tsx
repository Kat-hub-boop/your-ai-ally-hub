import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarCheck, ListChecks, Microscope, ShieldCheck, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AI Productivity Suite — Meetings, Tasks & Research in one workspace" },
      {
        name: "description",
        content:
          "A private AI workspace that summarises meetings, plans your tasks and organises research with citations — all in one place.",
      },
      { property: "og:title", content: "AI Productivity Suite" },
      {
        property: "og:description",
        content: "Summarise meetings, plan your day with AI and run research projects in one private workspace.",
      },
    ],
  }),
  component: Landing,
});

const TOOLS = [
  {
    icon: CalendarCheck,
    title: "AI Meeting Notes Summarizer",
    body: "Turn transcripts into structured summaries, decisions and an action-items table — then convert them into real tasks.",
  },
  {
    icon: ListChecks,
    title: "AI Task Planner",
    body: "Full task management with Kanban, calendar and a realistic AI day plan that respects your working hours.",
  },
  {
    icon: Microscope,
    title: "AI Research Assistant",
    body: "Research workspaces with source analysis, conflict detection, citations in four styles and writing templates.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <span className="flex items-center gap-2 font-semibold">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="size-4" />
          </span>
          AI Productivity Suite
        </span>
        <Button asChild><Link to="/auth">Sign in</Link></Button>
      </header>

      <section className="mx-auto max-w-4xl px-5 py-16 text-center sm:py-24">
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
          Your private workspace for <span className="text-primary">meetings, tasks and research</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
          Three AI tools in one professional suite. Everything you create stays private to your account, and the AI
          only ever works from information you supply — it never invents facts.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button size="lg" asChild><Link to="/auth">Get started free</Link></Button>
          <Button size="lg" variant="outline" asChild><Link to="/auth">I already have an account</Link></Button>
        </div>
        <p className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="size-3.5" /> Private by design — no one else can read your data.
        </p>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-5 pb-24 md:grid-cols-3">
        {TOOLS.map((tool) => (
          <Card key={tool.title} className="transition-shadow hover:shadow-lg">
            <CardHeader>
              <tool.icon className="size-6 text-primary" />
              <CardTitle className="text-lg">{tool.title}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">{tool.body}</CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
