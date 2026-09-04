export type CitationStyle = "apa7" | "harvard" | "mla" | "chicago";

export const CITATION_STYLES: { value: CitationStyle; label: string }[] = [
  { value: "apa7", label: "APA 7" },
  { value: "harvard", label: "Harvard" },
  { value: "mla", label: "MLA 9" },
  { value: "chicago", label: "Chicago" },
];

export type SourceMeta = {
  title: string;
  authors?: string | null;
  publication_date?: string | null;
  publisher?: string | null;
  url?: string | null;
};

const NS = "Not specified";

function year(date?: string | null) {
  if (!date) return "n.d.";
  const match = /\d{4}/.exec(date);
  return match ? match[0] : date;
}

function firstAuthorSurname(authors?: string | null) {
  if (!authors?.trim()) return NS;
  const first = authors.split(/[,;&]| and /)[0]!.trim();
  const parts = first.split(/\s+/);
  return parts[parts.length - 1] ?? first;
}

/** Builds citations strictly from the metadata the user saved — nothing is invented. */
export function buildCitation(source: SourceMeta, style: CitationStyle) {
  const authors = source.authors?.trim() || NS;
  const y = year(source.publication_date);
  const publisher = source.publisher?.trim() || NS;
  const url = source.url?.trim();
  const surname = firstAuthorSurname(source.authors);

  switch (style) {
    case "harvard":
      return {
        in_text: `(${surname}, ${y})`,
        reference: `${authors} (${y}) '${source.title}'. ${publisher}.${url ? ` Available at: ${url}` : ""}`,
      };
    case "mla":
      return {
        in_text: `(${surname})`,
        reference: `${authors}. "${source.title}." ${publisher}, ${y}.${url ? ` ${url}.` : ""}`,
      };
    case "chicago":
      return {
        in_text: `(${surname} ${y})`,
        reference: `${authors}. "${source.title}." ${publisher}, ${y}.${url ? ` ${url}.` : ""}`,
      };
    default:
      return {
        in_text: `(${surname}, ${y})`,
        reference: `${authors} (${y}). ${source.title}. ${publisher}.${url ? ` ${url}` : ""}`,
      };
  }
}
