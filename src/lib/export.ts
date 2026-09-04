import { saveAs } from "file-saver";

export type DocSection = { heading: string; lines: string[] };

export function summaryToSections(title: string, summary: Record<string, unknown>): DocSection[] {
  const list = (v: unknown) =>
    Array.isArray(v) && v.length ? (v as unknown[]).map((x) => `• ${stringify(x)}`) : ["Not specified"];
  const s = summary as Record<string, never>;
  const overview = (summary["overview"] ?? {}) as Record<string, string>;
  return [
    {
      heading: "Overview",
      lines: [
        `Title: ${overview["title"] || title}`,
        `Date: ${overview["date"] || "Not specified"}`,
        `Participants: ${overview["participants"] || "Not specified"}`,
        `Purpose: ${overview["purpose"] || "Not specified"}`,
      ],
    },
    { heading: "Executive summary", lines: [String(summary["executive_summary"] ?? "Not specified")] },
    { heading: "Discussion points", lines: list(s["discussion_points"]) },
    { heading: "Decisions", lines: list(s["decisions"]) },
    { heading: "Suggestions (not decided)", lines: list(s["suggestions"]) },
    {
      heading: "Action items",
      lines: Array.isArray(summary["action_items"]) && (summary["action_items"] as unknown[]).length
        ? (summary["action_items"] as Record<string, string>[]).map(
            (a) =>
              `• ${a["task"] || "Not specified"} — Responsible: ${a["responsible"] || "Not specified"}; Deadline: ${a["deadline"] || "Not specified"}; Priority: ${a["priority"] || "Not specified"}`,
          )
        : ["Not specified"],
    },
    { heading: "Issues / concerns", lines: list(s["issues"]) },
    { heading: "Next steps", lines: list(s["next_steps"]) },
    { heading: "Follow-up", lines: list(s["follow_up"]) },
    { heading: "Gaps in the source material", lines: list(s["notes_on_gaps"]) },
  ];
}

function stringify(value: unknown) {
  return typeof value === "string" ? value : JSON.stringify(value);
}

export function sectionsToText(title: string, sections: DocSection[]) {
  return [
    title,
    "",
    ...sections.flatMap((s) => [s.heading.toUpperCase(), ...s.lines, ""]),
  ].join("\n");
}

export async function downloadPdf(title: string, sections: DocSection[]) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 48;
  const width = doc.internal.pageSize.getWidth() - margin * 2;
  let y = margin;

  const write = (text: string, size: number, bold: boolean) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    for (const line of doc.splitTextToSize(text, width) as string[]) {
      if (y > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += size + 4;
    }
  };

  write(title, 18, true);
  y += 8;
  for (const section of sections) {
    y += 6;
    write(section.heading, 13, true);
    for (const line of section.lines) write(line, 10.5, false);
  }
  doc.save(`${slug(title)}.pdf`);
}

export async function downloadDocx(title: string, sections: DocSection[]) {
  const { Document, Packer, Paragraph, HeadingLevel, TextRun } = await import("docx");
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({ text: title, heading: HeadingLevel.HEADING_1 }),
          ...sections.flatMap((s) => [
            new Paragraph({ text: s.heading, heading: HeadingLevel.HEADING_2 }),
            ...s.lines.map((l) => new Paragraph({ children: [new TextRun(l)] })),
          ]),
        ],
      },
    ],
  });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${slug(title)}.docx`);
}

export function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]!);
  const escape = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
  saveAs(new Blob([csv], { type: "text/csv;charset=utf-8" }), `${slug(filename)}.csv`);
}

function slug(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "export";
}
