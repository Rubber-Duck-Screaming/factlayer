import { randomUUID } from "node:crypto";
import { createMem0Client, scanMem0 } from "@factlayer/adapter-mem0";
import type { Mem0Client } from "@factlayer/adapter-mem0";
import { createZepClient, scanZep } from "@factlayer/adapter-zep";
import type { ZepClient } from "@factlayer/adapter-zep";
import { addFact, check, classify, getFact, listFacts, markVerified } from "@factlayer/core";
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

export const addFactInputSchema = z.object({
  text: z.string(),
  category: z.string().optional(),
  expiresAt: z.number().optional(),
});

export type AddFactInput = z.infer<typeof addFactInputSchema>;

// Adds a new fact to factlayer's local store: generates its id, classifies
// its category from the text when omitted (same as the CLI's `add`
// command), and sets storedAt = lastVerifiedAt = now since it's being
// recorded for the first time.
export async function addFactTool(input: AddFactInput) {
  const category = input.category ?? (await classify(input.text));
  const now = Date.now();

  const fact: Fact = {
    id: randomUUID(),
    text: input.text,
    category,
    storedAt: now,
    lastVerifiedAt: now,
    expiresAt: input.expiresAt ?? null,
  };

  await addFact(fact);

  return {
    content: [{ type: "text" as const, text: `Added fact "${fact.id}" (${category}): "${fact.text}"` }],
    structuredContent: { id: fact.id, category },
  };
}

export const scanFactsInputSchema = z.object({});

export type ScanFactsInput = z.infer<typeof scanFactsInputSchema>;

// Lists every locally stored fact and checks each for freshness, sorted
// with needs-verification facts first -- the same behavior as the CLI's
// `scan` command (see runScan in packages/cli/src/commands.ts), just
// returned as MCP tool content instead of a formatted string.
export async function scanFacts(_input: ScanFactsInput) {
  const now = Date.now();
  const rows = listFacts().map((fact) => ({ fact, result: check(fact, now) }));

  rows.sort((a, b) => {
    if (a.result.status === b.result.status) return 0;
    return a.result.status === "needs-verification" ? -1 : 1;
  });

  return {
    content: [{ type: "text" as const, text: JSON.stringify(rows) }],
    structuredContent: { results: rows },
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

export const scanZepFreshnessInputSchema = z.object({
  userId: z.string(),
});

export type ScanZepFreshnessInput = z.infer<typeof scanZepFreshnessInputSchema>;

function defaultZepClient(): ZepClient {
  const apiKey = process.env.ZEP_API_KEY;
  if (!apiKey) {
    throw new Error("Set ZEP_API_KEY in the environment to use scan_zep_freshness.");
  }
  return createZepClient(apiKey);
}

// Scans a Zep user's graph facts end to end: pulls them via graph.search()
// (see scanZep), persists each as a local fact keyed by Zep's own edge uuid,
// checks freshness, and returns results sorted with needs-verification
// facts first. The zepClient parameter defaults to a real client built from
// ZEP_API_KEY, but tests inject a fake one directly -- same pattern as
// adapter-zep's own scan.test.ts.
export async function scanZepFreshness(
  input: ScanZepFreshnessInput,
  zepClient: ZepClient = defaultZepClient(),
) {
  const scanned = await scanZep(zepClient, input.userId);

  scanned.sort((a, b) => {
    if (a.result.status === b.result.status) return 0;
    return a.result.status === "needs-verification" ? -1 : 1;
  });

  return {
    content: [{ type: "text" as const, text: JSON.stringify(scanned) }],
    structuredContent: { results: scanned },
  };
}
