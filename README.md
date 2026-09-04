# AI Productivity Hub

Build a fully functional, responsive, professional SaaS web application named “AI Productivity Suite,” an all-in-one private productivity workspace combining: AI Meeting Notes Summarizer, AI Task Planner, and AI Research Assistant. Enable Lovable Cloud first for authentication, persistent database, file storage/uploads, server-side AI, and all needed authorization/RLS. Every user's meetings, meeting summaries/action items, tasks/subtasks, projects, research projects, notes, sources, citations, AI plans, documents, notifications/preferences must be private and inaccessible to other users. Do not build a static prototype.

Core navigation: professional responsive sidebar Dashboard, Meetings, Tasks, AI Planner, Research, Projects, Notes, Calendar, Analytics, Settings; global search across meetings/tasks/projects/research/notes/sources with filters/sorting; global contextual AI Assistant available throughout. Add accessible light/dark mode, polished blue/indigo visual system, cards/tables/search/filter interfaces, responsive desktop/tablet/mobile layouts, subtle animations, and complete loading/empty/error states.

Dashboard: welcome, high-prominence quick actions New Meeting Summary / Plan My Tasks / Start Research, recent meetings, today’s tasks, upcoming deadlines, recent research projects, productivity statistics, AI suggestions. Clearly feature three main tools.

Meetings: support title/date/participants/raw transcript-or-notes plus document/text upload. Secure AI summary must only extract supported facts and never invent information. Produce editable/saveable sections: overview including title/date/participants/purpose, executive summary, discussion points, decisions, action-items table (Task, Responsible Person, Deadline, Priority), issues/concerns, next steps, follow-up. Use “Not specified” where unavailable and distinguish decisions from suggestions. Implement search past meetings, copy, share flow, PDF download and DOCX export. Include functional “Create Tasks from Action Items” which creates user tasks while preserving action-item info.

Tasks and AI Planner: complete persistent task CRUD title/description/due date/time/priority urgent-high-medium-low/category-project/estimated duration/tags/subtasks/recurrence/dependencies where appropriate, completion/postpone/delete, search/filters. Provide list, Kanban with drag/drop, calendar, daily timeline and weekly planner. Prominent Plan My Day with AI, planning prompt, and saved daily/weekly plans. AI must plan only using known tasks/context and never invent deadlines/requirements; prioritize urgency/importance/deadline/duration/dependencies, respect user-set working hours/current schedule, include breaks, flag overdue/conflicting/unrealistic/overloaded schedules, recommend next work and realistic lower-priority postponements. Let research activities become tasks and let task sets be sent to planner.

Research: build research workspaces for topic/question, notes and source management. Use AI to help understand topic, formulate questions/themes/gaps/further questions, organize notes, analyze user-saved sources and compare/identify conflicting evidence. Source cards include title, author, publication date, site/journal, type, relevance, credibility, link and reliability warning. Source analysis generates summary/main argument/key evidence/methodology/strengths/weaknesses/bias/relevance only from supplied/source-backed material. Never fabricate quotations/statistics/authors/publications/references. Research chat must use available research context, cite supporting saved sources, distinguish facts/opinions/uncertainty and suggest verification/additional research. Create citations from user-provided verified source metadata only, APA 7/Harvard/MLA/Chicago with in-text and reference/bibliography, copy controls. Add writing assistant templates Essay, Research report, Literature review, Proposal, Executive summary, Presentation outline with structured sections and citations tied to claims. Let user create research-project task plans.

Projects: organize linked meetings/tasks/research/notes/documents under project with name, description, deadline, progress and related items. Notes management persistent.

Calendar: daily/weekly/monthly task views with task scheduling and drag/drop rescheduling. Notifications: practical optional in-app settings and deadline/overdue/scheduled/meeting follow-up/research deadline/daily and weekly planning reminder functionality within platform capability.

Analytics: task stats completed/remaining/overdue/percent/weekly productivity; meeting stats summarized/action-items created/completed; research stats projects/sources/notes/reports with charts and progress bars. Include suitable export functionality and thorough validation/error handling. Ensure all major flows and actions work end-to-end and AI safety rules are visible where relevant: no fabrication, clearly label suggestions/uncertainty, preserve supplied information, encourage verification for important research, respect privacy.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://your-ai-ally-hub.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/3b6553c5-f2d7-45cd-9fdd-fd5078020e6e).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
