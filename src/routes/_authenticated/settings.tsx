import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AiSafetyNote, EmptyState, LoadingBlock, PageHeader } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/lib/theme";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — AI Productivity Suite" },
      { name: "description", content: "Working hours, notification preferences, appearance and your notifications." },
      { property: "og:title", content: "Settings — AI Productivity Suite" },
      { property: "og:description", content: "Working hours, notification preferences and appearance." },
    ],
  }),
  component: SettingsPage,
});

const NOTIFY_FIELDS = [
  { key: "notify_deadlines", label: "Deadline reminders" },
  { key: "notify_overdue", label: "Overdue task alerts" },
  { key: "notify_meeting_followups", label: "Meeting follow-up reminders" },
  { key: "notify_daily_planning", label: "Daily planning reminder" },
  { key: "notify_weekly_planning", label: "Weekly planning reminder" },
] as const;

function SettingsPage() {
  const qc = useQueryClient();
  const { theme, setTheme } = useTheme();
  const [form, setForm] = useState<Record<string, string | boolean | number>>({});

  const profile = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const { data, error } = await supabase.from("profiles").select("*").eq("id", auth.user!.id).single();
      if (error) throw error;
      return data;
    },
  });

  const notifications = useQuery({
    queryKey: ["notifications", "list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(30);
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (profile.data) {
      const { id: _id, created_at: _c, updated_at: _u, avatar_url: _a, ...rest } = profile.data;
      setForm(rest as Record<string, string | boolean | number>);
    }
  }, [profile.data]);

  const save = useMutation({
    mutationFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: String(form.full_name ?? ""),
          work_start: String(form.work_start ?? "09:00"),
          work_end: String(form.work_end ?? "17:00"),
          break_minutes: Number(form.break_minutes ?? 15),
          notify_deadlines: Boolean(form.notify_deadlines),
          notify_overdue: Boolean(form.notify_overdue),
          notify_meeting_followups: Boolean(form.notify_meeting_followups),
          notify_daily_planning: Boolean(form.notify_daily_planning),
          notify_weekly_planning: Boolean(form.notify_weekly_planning),
        })
        .eq("id", auth.user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Settings saved.");
      void qc.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notifications").update({ read: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  if (profile.isLoading) return <LoadingBlock rows={3} />;

  return (
    <div className="max-w-3xl">
      <PageHeader title="Settings" description="Your profile, working hours, notifications and appearance." />

      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Profile & working hours</CardTitle>
            <CardDescription>The AI planner schedules only inside these hours.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="fn">Full name</Label>
              <Input id="fn" value={String(form.full_name ?? "")} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            </div>
            <div><Label htmlFor="ws">Work starts</Label><Input id="ws" type="time" value={String(form.work_start ?? "09:00").slice(0, 5)} onChange={(e) => setForm({ ...form, work_start: e.target.value })} /></div>
            <div><Label htmlFor="we">Work ends</Label><Input id="we" type="time" value={String(form.work_end ?? "17:00").slice(0, 5)} onChange={(e) => setForm({ ...form, work_end: e.target.value })} /></div>
            <div><Label htmlFor="bm">Break length (minutes)</Label><Input id="bm" type="number" min={0} value={String(form.break_minutes ?? 15)} onChange={(e) => setForm({ ...form, break_minutes: Number(e.target.value) })} /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Notifications</CardTitle>
            <CardDescription>In-app reminders shown inside this workspace.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {NOTIFY_FIELDS.map((f) => (
              <div key={f.key} className="flex items-center justify-between">
                <Label htmlFor={f.key}>{f.label}</Label>
                <Switch id={f.key} checked={Boolean(form[f.key])} onCheckedChange={(v) => setForm({ ...form, [f.key]: v })} />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Appearance</CardTitle></CardHeader>
          <CardContent className="flex items-center justify-between">
            <Label htmlFor="dark">Dark mode</Label>
            <Switch id="dark" checked={theme === "dark"} onCheckedChange={(v) => setTheme(v ? "dark" : "light")} />
          </CardContent>
        </Card>

        <Button disabled={save.isPending} onClick={() => save.mutate()}>{save.isPending ? "Saving…" : "Save settings"}</Button>

        <Card>
          <CardHeader><CardTitle className="text-base">Your notifications</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {notifications.isLoading ? (
              <LoadingBlock rows={2} />
            ) : (notifications.data ?? []).length === 0 ? (
              <EmptyState title="Nothing yet" description="Reminders about deadlines, overdue tasks and follow-ups appear here." />
            ) : (
              (notifications.data ?? []).map((n) => (
                <div key={n.id} className="flex items-start justify-between gap-3 rounded-lg border border-border p-3 text-sm">
                  <div>
                    <p className={n.read ? "text-muted-foreground" : "font-medium"}>{n.title}</p>
                    {n.body && <p className="text-xs text-muted-foreground">{n.body}</p>}
                  </div>
                  {!n.read && <Button size="sm" variant="outline" onClick={() => markRead.mutate(n.id)}>Mark read</Button>}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <AiSafetyNote>
          Your data stays private to your account. AI features only read your own workspace content and never invent facts.
        </AiSafetyNote>
      </div>
    </div>
  );
}
