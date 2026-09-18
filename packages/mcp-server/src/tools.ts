import { createMem0Client, scanMem0 } from "@factlayer/adapter-mem0";
import type { Mem0Client } from "@factlayer/adapter-mem0";
import { check, classify, getFact, markVerified } from "@factlayer/core";
import type { Fact } from "@factlayer/core";
import { z } from "zod";

export const checkFreshnessInputSchema = z.object({
  text: z.string(),
  category: z.string().optional(),
  storedAt: z.number(),
  lastVerifiedAt: z.number(),
  expiresAt: z.number().optional(),
});

export type CheckFreshnessInput = z.infer<typeof checkFreshnessInputSchema>;

// Checks freshness for a fact that isn't necessarily stored yet (no id is
// taken or needed -- check() itself never reads fact.id). If category is
// omitted, classify() fills it in from the text.
export async function checkFreshness(input: CheckFreshnessInput) {
  const category = input.category ?? (await classify(input.text));

  const fact: Fact = {
    id: "",
    text: input.text,
    category,
    storedAt: input.storedAt,
    lastVerifiedAt: input.lastVerifiedAt,
    expiresAt: input.expiresAt ?? null,
  };

  const result = check(fact);

  return {
    content: [{ type: "text" as const, text: JSON.stringify(result) }],
    structuredContent: result,
  };
}

export const markVerifiedInputSchema = z.object({
  id: z.string(),
});

export type MarkVerifiedInput = z.infer<typeof markVerifiedInputSchema>;

// Marks a stored fact verified as of now. Returns an error result (not a
// thrown exception) when the id doesn't exist in the local database.
export async function markVerifiedTool(input: MarkVerifiedInput) {
  const fact = getFact(input.id);
  if (!fact) {
    return {
      content: [{ type: "text" as const, text: `No fact found with id "${input.id}"` }],
      isError: true,
    };
  }

  markVerified(input.id, Date.now());

  return {
    content: [
      {
        type: "text" as const,
        text: `Verified fact "${input.id}" (${fact.category}): "${fact.text}"`,
      },
    ],
  };
}

export const scanMem0FreshnessInputSchema = z.object({
  userId: z.string(),
});

export type ScanMem0FreshnessInput = z.infer<typeof scanMem0FreshnessInputSchema>;

function defaultMem0Client(): Mem0Client {
  const apiKey = process.env.MEM0_API_KEY;
  if (!apiKey) {
    throw new Error("Set MEM0_API_KEY in the environment to use scan_mem0_freshness.");
  }
  return createMem0Client(apiKey, process.env.MEM0_HOST);
}

// Scans a mem0 user's memories end to end: pulls them via mem0, persists
// each as a local fact keyed by mem0's own id (see scanMem0), checks
// freshness, and returns results sorted with needs-verification facts
// first. The mem0Client parameter defaults to a real client built from
// MEM0_API_KEY, but tests inject a fake one directly -- same pattern as
// adapter-mem0's own scan.test.ts.
export async function scanMem0Freshness(
  input: ScanMem0FreshnessInput,
  mem0Client: Mem0Client = defaultMem0Client(),
) {
  const scanned = await scanMem0(mem0Client, { filters: { user_id: input.userId } });

  scanned.sort((a, b) => {
    if (a.result.status === b.result.status) return 0;
    return a.result.status === "needs-verification" ? -1 : 1;
  });

  return {
    content: [{ type: "text" as const, text: JSON.stringify(scanned) }],
    structuredContent: { results: scanned },
  };
}
