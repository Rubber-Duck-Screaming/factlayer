export type { Fact } from "./types.ts";
export {
  CATEGORY_HALF_LIVES_DAYS,
  DEFAULT_HALF_LIFE_DAYS,
  getThresholdDays,
} from "./categories";
export { check } from "./check";
export type { CheckResult } from "./check.ts";
export { classify } from "./classify";
export {
  addFact,
  getFact,
  listFacts,
  markVerified,
  setStorePath,
} from "./store";
export type { NewFact } from "./store";
