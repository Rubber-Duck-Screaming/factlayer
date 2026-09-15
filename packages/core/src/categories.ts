// Half-lives are in days. When the age of a fact's last verification exceeds
// its category's half-life, the fact is due for re-verification.
export const CATEGORY_HALF_LIVES_DAYS: Record<string, number> = {
  employer: 365,
  location: 180,
  currentProject: 30,
  phoneNumber: 3650,
  staticFact: Infinity, // never flagged
};

// Applied when a fact's category isn't in the table above.
export const DEFAULT_HALF_LIFE_DAYS = 90;

export function getThresholdDays(category: string): number {
  return CATEGORY_HALF_LIVES_DAYS[category] ?? DEFAULT_HALF_LIFE_DAYS;
}
