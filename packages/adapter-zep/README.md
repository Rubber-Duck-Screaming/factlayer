# @factlayer/adapter-zep

A [FactLayer](https://github.com/Rubber-Duck-Screaming/factlayer) adapter for [Zep](https://www.getzep.com): pulls a user's graph facts, maps them to FactLayer facts, persists them locally (keyed by Zep's own edge uuid), and checks each one for freshness.

## Install

```bash
bun add @factlayer/adapter-zep
```

## Usage

```ts
import { createZepClient, scanZep } from "@factlayer/adapter-zep";

const client = createZepClient(process.env.ZEP_API_KEY!);
const results = await scanZep(client, "alice");
// each result: { fact, result: { status: "fresh" | "needs-verification", ... } }
```

Zep's bi-temporal fact model can flag an edge as no longer current via `invalidAt` or `expiredAt`. When either is present, this adapter maps it straight to the fact's `expiresAt`, so `check()` reports `needs-verification` immediately -- it never runs the category half-life math on a fact Zep has already flagged as outdated itself.

See the [main repo](https://github.com/Rubber-Duck-Screaming/factlayer) for the full architecture, the freshness model, and how this adapter fits alongside `@factlayer/core`, `@factlayer/cli`, and `@factlayer/mcp-server`.
