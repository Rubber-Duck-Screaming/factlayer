export interface Fact {
  id: string;
  text: string;
  category: string;
  storedAt: number; // unix ms
  lastVerifiedAt: number; // unix ms, same as storedAt when first created
  expiresAt?: number | null; // unix ms; when set, overrides the category half-life
}
