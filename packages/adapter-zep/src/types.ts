// The minimal slice of @getzep/zep-cloud's client shape that this adapter
// depends on. Matches the real ZepClient's graph.edge.getByUserId() (see
// client.ts for the real wrapper); tests inject a fake object with this
// same shape instead of hitting the network.
//
// Verified against node_modules/@getzep/zep-cloud@3.28.0's own .d.ts files:
// - api/resources/graph/resources/edge/client/Client.d.mts:
//   getByUserId(userId, request) returns all edges for a user directly as
//   an HttpResponsePromise<EntityEdge[]> (HttpResponsePromise extends
//   Promise, so it awaits like a normal one) -- unlike graph.search(),
//   which is relevance-ranked against a query rather than a full listing.
// - api/types/EntityEdge.d.mts: the "fact" (Zep's unit of stored knowledge)
//   is the `fact: string` field, id is `uuid`, and Zep's bi-temporal model
//   exposes four separate timestamps: `createdAt` (when Zep recorded the
//   edge), `validAt` (when the fact became true), `invalidAt` (when the
//   fact stopped being true), and `expiredAt` (when the edge itself was
//   invalidated/superseded in the graph).
export interface ZepEntityEdge {
  uuid: string;
  fact: string;
  createdAt: string;
  validAt?: string;
  invalidAt?: string;
  expiredAt?: string;
}

export interface ZepGraphEdgesRequest {
  cursor?: string;
  limit?: number;
}

export interface ZepClient {
  getByUserId(userId: string, request: ZepGraphEdgesRequest): Promise<ZepEntityEdge[]>;
}
