export interface Fact {
  id: string;
  text: string;
  category: string;
  storedAt: number; // unix ms
  lastVerifiedAt: number; // unix ms, same as storedAt when first created
}
