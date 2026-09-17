// The minimal slice of mem0's client shape that this adapter depends on.
// Matches mem0ai's real MemoryClient.getAll() (see client.ts for the real
// wrapper); tests inject a fake object with this same shape instead of
// hitting the network. createdAt/updatedAt accept string as well as Date
// because mem0ai's types claim `Date` but a real HTTP JSON response hands
// back ISO strings — parsing defensively covers both.
export interface Mem0Memory {
  id: string;
  memory?: string;
  categories?: string[];
  createdAt?: Date | string;
  updatedAt?: Date | string;
  expirationDate?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface Mem0GetAllOptions {
  filters?: Record<string, unknown>;
  page?: number;
  pageSize?: number;
}

export interface Mem0Client {
  getAll(options?: Mem0GetAllOptions): Promise<{ results: Mem0Memory[] }>;
}
