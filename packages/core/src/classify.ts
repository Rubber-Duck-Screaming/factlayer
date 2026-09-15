// Simple keyword matching to guess a fact's category from its text when the
// caller doesn't supply one. Checked in this order; the first category with
// a keyword matching as a whole word/phrase (case-insensitive) wins. Word
// boundaries keep e.g. "job" from matching inside an unrelated word, and
// keep check order from mattering for words that just happen to appear as
// substrings of each other.
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  employer: ["job", "work at", "working at", "company", "employer"],
  location: ["live", "moved to", "city", "address"],
  currentProject: ["working on", "project", "building"],
  phoneNumber: ["phone", "number", "call me"],
};

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const CATEGORY_PATTERNS: Record<string, RegExp[]> = Object.fromEntries(
  Object.entries(CATEGORY_KEYWORDS).map(([category, keywords]) => [
    category,
    keywords.map((keyword) => new RegExp(`\\b${escapeRegExp(keyword)}\\b`, "i")),
  ]),
);

export function classify(text: string): string {
  for (const [category, patterns] of Object.entries(CATEGORY_PATTERNS)) {
    if (patterns.some((pattern) => pattern.test(text))) {
      return category;
    }
  }

  return "unknown"; // the existing 90-day default handles this category
}
