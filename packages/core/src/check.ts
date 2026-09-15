import { getThresholdDays } from "./categories";
import type { Fact } from "./types.ts";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface CheckResult {
  status: "fresh" | "needs-verification";
  ageInDays: number;
  thresholdInDays: number;
}

export function check(fact: Fact, now: number = Date.now()): CheckResult {
  const ageInDays = (now - fact.lastVerifiedAt) / MS_PER_DAY;

  // An explicit expiresAt overrides the category half-life entirely: the
  // equivalent "threshold" is just the fact's age at the moment it expires,
  // so the same ageInDays > thresholdInDays comparison below still works out
  // to "now > expiresAt".
  const thresholdInDays =
    fact.expiresAt != null
      ? (fact.expiresAt - fact.lastVerifiedAt) / MS_PER_DAY
      : getThresholdDays(fact.category);

  const status = ageInDays > thresholdInDays ? "needs-verification" : "fresh";

  return { status, ageInDays, thresholdInDays };
}
