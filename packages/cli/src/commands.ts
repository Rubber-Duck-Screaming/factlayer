import { randomUUID } from "node:crypto";
import { addFact, check, getFact, listFacts, markVerified } from "@factlayer/core";
import type { Fact } from "@factlayer/core";

// Creates a new fact with storedAt = lastVerifiedAt = now. Returns its id.
// async because addFact() is (classify()'s embedding fallback is async).
export async function runAdd(text: string, category: string): Promise<string> {
  const now = Date.now();
  const fact: Fact = {
    id: randomUUID(),
    text,
    category,
    storedAt: now,
    lastVerifiedAt: now,
  };
  await addFact(fact);
  return fact.id;
}

// Lists every fact with its status, needs-verification facts first.
export function runScan(): string {
  const now = Date.now();
  const rows = listFacts().map((fact) => ({ fact, result: check(fact, now) }));

  rows.sort((a, b) => {
    if (a.result.status === b.result.status) return 0;
    return a.result.status === "needs-verification" ? -1 : 1;
  });

  if (rows.length === 0) {
    return "No facts stored yet.";
  }

  return rows
    .map(
      ({ fact, result }) =>
        `[${result.status}] ${fact.category} | ${Math.floor(result.ageInDays)} days old | ${fact.text}`,
    )
    .join("\n");
}

// Marks a fact verified as of now and confirms.
export function runVerify(id: string): string {
  const fact = getFact(id);
  if (!fact) {
    return `No fact found with id ${id}`;
  }
  markVerified(id, Date.now());
  return `Verified "${fact.text}" (${fact.category})`;
}
