# @factlayer/adapter-cognee

A [FactLayer](https://github.com/Rubber-Duck-Screaming/factlayer) adapter for [Cognee](https://www.cognee.ai): pulls a dataset's ingested source records, maps them to FactLayer facts, persists them locally (keyed by Cognee's own data id), and checks each one for freshness.

Cognee is different from Mem0 and Zep in one important way: it's self-hosted, not a hosted service you just read from. *You* run the Cognee instance and configure your own LLM provider (any OpenAI-compatible endpoint) to do the ingestion and knowledge-graph extraction. This adapter doesn't provide an LLM and doesn't run extraction itself — it only reads records you've already fed into your own Cognee instance, tracking the freshness of that ingested source material.

## Install

```bash
bun add @factlayer/adapter-cognee
```

## Usage

```ts
import { createCogneeClient, scanCognee } from "@factlayer/adapter-cognee";

const client = await createCogneeClient({
  llmModel: "your-model-id",
  llmApiKey: process.env.YOUR_LLM_KEY,
  // llmEndpoint: process.env.YOUR_LLM_ENDPOINT, // only needed for a non-OpenAI, OpenAI-compatible provider
});

// datasetId is Cognee's own dataset UUID, not the dataset name you passed
// to Cognee's add()/remember() calls -- look it up via the underlying
// @cognee/cognee-ts SDK's datasets.list() if you only have the name.
const results = await scanCognee(client, datasetId);
// each result: { fact, result: { status: "fresh" | "needs-verification", ... } }
```

See the [main repo](https://github.com/Rubber-Duck-Screaming/factlayer) for the full architecture, the freshness model, and how this adapter fits alongside `@factlayer/core`, `@factlayer/cli`, and `@factlayer/mcp-server`.
