export type { Fact } from "./types.ts";
export {
  CATEGORY_HALF_LIVES_DAYS,
  DEFAULT_HALF_LIFE_DAYS,
  getThresholdDays,
} from "./categories";
export { check } from "./check";
export type { CheckResult } from "./check.ts";
export {
  addFact,
  getFact,
  listFacts,
  markVerified,
  setStorePath,
} from "./store";
