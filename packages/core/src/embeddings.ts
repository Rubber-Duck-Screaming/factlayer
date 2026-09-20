import { pipeline } from "@huggingface/transformers";
import type { FeatureExtractionPipeline } from "@huggingface/transformers";

const MODEL_NAME = "Xenova/all-MiniLM-L6-v2";

// mem0 rewrites memories into third-person canonical form ("User lives in
// Austin", "User works at Acme Corp") rather than first person, so these
// examples are phrased the same way.
const CATEGORY_EXAMPLES: Record<string, string[]> = {
  location: [
    "User lives in a city",
    "User relocated to a new place",
    "User moved to a different city",
    "User's home address changed",
    "User now resides in a new location",
  ],
  employer: [
    "User works at a company",
    "User started a new job",
    "User is employed by a company",
    "User's employer changed",
    "User began working at a new company",
  ],
  currentProject: [
    "User is working on a project",
    "User started a new project",
    "User is building something new",
    "User is currently developing an application",
    "User's current project is in progress",
  ],
  phoneNumber: [
    "User shared a phone number",
    "User's phone number changed",
    "User provided a new contact number",
    "User can be reached by phone",
    "User gave their mobile number",
  ],
};

// The model is loaded at most once per process, on first use, and reused for
// every embedding after that -- loading it (downloading + initializing the
// ONNX runtime) is by far the most expensive part of the embedding path.
let extractorPromise: Promise<FeatureExtractionPipeline> | null = null;

function getExtractor(): Promise<FeatureExtractionPipeline> {
  if (!extractorPromise) {
    extractorPromise = pipeline("feature-extraction", MODEL_NAME);
  }
  return extractorPromise;
}

export async function embed(text: string): Promise<number[]> {
  const extractor = await getExtractor();
  const output = await extractor(text, { pooling: "mean", normalize: true });
  return output.tolist()[0] as number[];
}

// Each category's example sentences are embedded once (on first use) and
// cached for the lifetime of the process -- classify() never re-embeds them.
let categoryEmbeddingsPromise: Promise<Record<string, number[][]>> | null = null;

export function getCategoryEmbeddings(): Promise<Record<string, number[][]>> {
  if (!categoryEmbeddingsPromise) {
    categoryEmbeddingsPromise = (async () => {
      const entries = await Promise.all(
        Object.entries(CATEGORY_EXAMPLES).map(async ([category, examples]) => {
          const embeddings = await Promise.all(examples.map((example) => embed(example)));
          return [category, embeddings] as const;
        }),
      );
      return Object.fromEntries(entries);
    })();
  }
  return categoryEmbeddingsPromise;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  const dot = a.reduce((sum, value, i) => sum + value * (b[i] ?? 0), 0);
  const normA = Math.sqrt(a.reduce((sum, value) => sum + value * value, 0));
  const normB = Math.sqrt(b.reduce((sum, value) => sum + value * value, 0));
  return dot / (normA * normB);
}
