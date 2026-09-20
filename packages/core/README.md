# @factlayer/core

The freshness-check engine at the heart of [FactLayer](https://github.com/Rubber-Duck-Screaming/factlayer): a `check()` function that flags aging facts before they're used, category-based half-lives, keyword + local-embedding auto-classification, and a SQLite-backed store.

## Install

```bash
bun add @factlayer/core
```

## Usage

```ts
import { addFact, check, getFact, markVerified, setStorePath } from "@factlayer/core";

setStorePath("factcheck.db"); // or ":memory:" for tests

const id = crypto.randomUUID();
await addFact({
  id,
  text: "I started working at Acme Corp",
  storedAt: Date.now(),
  lastVerifiedAt: Date.now(),
}); // category is auto-classified via classify() when omitted

const fact = getFact(id)!;
console.log(check(fact));
// { status: "fresh" | "needs-verification", ageInDays, thresholdInDays }

markVerified(id, Date.now());
```

See the [main repo](https://github.com/Rubber-Duck-Screaming/factlayer) for the full architecture, the freshness model, and the CLI/adapter/MCP packages built on top of this one.
