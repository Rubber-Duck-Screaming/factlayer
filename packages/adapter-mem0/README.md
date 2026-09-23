# @factlayer/adapter-mem0

A [FactLayer](https://github.com/Rubber-Duck-Screaming/factlayer) adapter for [mem0](https://mem0.ai): pulls a user's memories, maps them to FactLayer facts, persists them locally (keyed by mem0's own id), and checks each one for freshness.

## Install

```bash
bun add @factlayer/adapter-mem0
```

## Usage

```ts
import { createMem0Client, scanMem0 } from "@factlayer/adapter-mem0";

const client = createMem0Client(process.env.MEM0_API_KEY!);
const results = await scanMem0(client, { filters: { user_id: "alice" } });
// each result: { fact, result: { status: "fresh" | "needs-verification", ... } }
```

Mem0 memories don't carry a category of their own, so this adapter runs each memory's text through FactLayer's `classify()` to assign one before checking freshness.

See the [main repo](https://github.com/Rubber-Duck-Screaming/factlayer) for the full architecture, the freshness model, and how this adapter fits alongside `@factlayer/core`, `@factlayer/cli`, and `@factlayer/mcp-server`.
