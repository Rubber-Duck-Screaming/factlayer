import { cosineSimilarity, embed, getCategoryEmbeddings } from "./embeddings";

// classify() tries keyword matching first (cheap, synchronous under the
// hood), then -- only when that comes up empty -- falls back to embedding
// similarity against a handful of example sentences per category. This
// keeps the common case fast and avoids paying any model-loading cost for
// text that keyword matching already handles.
//
// Checked in this order; the first category with a keyword matching as a
// whole word/phrase (case-insensitive) wins. Word boundaries keep e.g. "job"
// from matching inside an unrelated word, and keep check order from
// mattering for words that just happen to appear as substrings of each
// other.
//
// mem0 rewrites memories into third-person canonical form ("User lives in
// Austin", "User works at Acme Corp") rather than the first-person phrasing
// a sentence would normally use ("I live in...", "I work at..."). So each
// category's list needs to cover the conjugated verb forms that show up in
// that phrasing, not just the base form.
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  employer: [
    "job",
    "work at",
    "works at",
    "worked at",
    "working at",
    "company",
    "employer",
  ],
  location: ["live", "lives", "lived", "living", "moved to", "city", "address"],
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

function classifyByKeywords(text: string): string {
  for (const [category, patterns] of Object.entries(CATEGORY_PATTERNS)) {
    if (patterns.some((pattern) => pattern.test(text))) {
      return category;
    }
  }

  return "unknown";
}

// Above this average cosine similarity to a category's example sentences,
// we're confident enough to return that category. Below it, the input is
// genuinely ambiguous and stays "unknown" rather than forcing a guess.
const SIMILARITY_THRESHOLD = 0.5;

async function classifyByEmbedding(text: string): Promise<string> {
  const inputEmbedding = await embed(text);
  const categoryEmbeddings = await getCategoryEmbeddings();

  let bestCategory = "unknown";
  let bestSimilarity = -Infinity;

  for (const [category, examples] of Object.entries(categoryEmbeddings)) {
    const averageSimilarity =
      examples.reduce((sum, example) => sum + cosineSimilarity(inputEmbedding, example), 0) /
      examples.length;

    if (averageSimilarity > bestSimilarity) {
      bestSimilarity = averageSimilarity;
      bestCategory = category;
    }
  }

  return bestSimilarity > SIMILARITY_THRESHOLD ? bestCategory : "unknown";
}

export async function classify(text: string): Promise<string> {
  const keywordMatch = classifyByKeywords(text);
  if (keywordMatch !== "unknown") {
    return keywordMatch;
  }

  // Keyword matching found nothing -- fall back to comparing this text's
  // embedding against each category's cached example embeddings.
  return classifyByEmbedding(text);
}
