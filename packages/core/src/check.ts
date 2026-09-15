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
  const thresholdInDays = getThresholdDays(fact.category);
  const status = ageInDays > thresholdInDays ? "needs-verification" : "fresh";

  return { status, ageInDays, thresholdInDays };
}
