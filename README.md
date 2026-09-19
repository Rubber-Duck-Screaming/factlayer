# FactLayer

**A freshness-check layer for AI agent memory plugs into Mem0, Zep, Cognee, or your own database, and catches facts before they go stale.**

A local-first fact freshness tracking system built to prevent LLM context drift and hallucinations.Your AI agent doesn't forget things. That's the problem. It remembers a customer's city, a user's job, a teammate's role and keeps repeating it with total confidence long after it's stopped being true. Nothing tells it to double-check. Nothing ever will, unless something is built to.

FactLayer is that something.

---

## The problem, in one story

Someone tells a support agent "I live in Seattle." Six months later they ask about shipping options. The agent still thinks they're in Seattle nobody ever told it otherwise, so as far as it's concerned, nothing changed. It answers confidently. It's wrong.

This isn't rare. It's the default behavior of every memory system in production today, and it has a name in the field: high-relevance facts the ones an agent uses constantly are exactly the ones that go stale silently, because "frequently used" and "still true" are treated as the same thing when they aren't.

Existing memory tools solve _adjacent_ problems well:

- **Zep / Graphiti** invalidates a fact when a _new, contradicting_ fact arrives. Excellent but only fires if something new ever comes in.

- **Cognee** decays facts based on _how often they're accessed_. Excellent but a wrong fact that's still asked about often looks perfectly healthy by that measure.

- **Mem0** now synthesizes and supersedes facts in the background a real step forward, but still reactive to new information, not proactive about facts that were simply never revisited.

None of them ask the question FactLayer exists to ask: **"nothing has contradicted this fact but it's the kind of fact that tends to change, and it's been a while. Should we trust it blindly?"**

---

## What FactLayer actually does

FactLayer is not a memory store. It doesn't compete with Mem0, Zep, or Cognee, and it doesn't ask you to replace whatever you're already using. It's a thin layer that sits on top of any of them or a plain database and does one job:

1. **Classifies facts by volatility.** A phone number and a current job title don't age the same way. FactLayer tags facts into categories, each with an expected "shelf life" job/employer (~1 year), location (~6 months), current project (~1 month), static facts (never expire), and anything custom you define.
2. **Tracks when a fact was last _verified_, not just last _accessed_.** These are different numbers, and conflating them is exactly how stale facts hide in plain sight.
3. **Flags aging, high-relevance facts before they get used.** When a fact crosses its category's threshold, FactLayer marks it `needs-verification` instead of letting it be stated as current fact without question.

Auto-classification runs in two cheap tiers before ever reaching for anything expensive: fast keyword matching first, then a local embedding model (no API key, no GPU, runs fine on modest hardware) for phrasing keywords miss. Nothing gets forced into a guess genuinely ambiguous facts stay `unknown` and default to a conservative, shorter re-check window.

---

## See it catch a stale fact

![MCP Single Check Demo](./docs/MCP.gif)

`https://github.com/Rubber-Duck-Screaming/factlayer/releases/tag/v0.4`

---

## How it compares

|                                | Zep / Graphiti             | Cognee            | Mem0                            | **FactLayer**                                 |
| ------------------------------ | -------------------------- | ----------------- | ------------------------------- | --------------------------------------------- |
| Approach to staleness          | Contradiction invalidation | Usage-based decay | Background supersede/synthesize | Volatility-aware, time-based flagging         |
| Needs new info to act?         | Yes                        | No (needs disuse) | Mostly yes                      | **No acts on elapsed time + fact type alone** |
| Is it a memory store?          | Yes                        | Yes               | Yes                             | **No a layer on top of one**                  |
| Works with other memory tools? | No                         | No                | No                              | **Yes Mem0 today, more adapters planned**     |

FactLayer isn't trying to replace any of these. It's the check none of them run.

---

## Quickstart

```bash
bun install @factlayer/core @factlayer/cli
```

Add a fact and let it auto-classify:

```bash
factcheck add "I started working at Acme Corp"
```

Scan everything for facts that need a second look:

```bash
factcheck scan
```

```
[needs-verification] employer | 412 days old | I started working at Acme Corp
[fresh]               location | 12 days old  | I moved to Denver
```

![MCP Scan Check Demo](./docs/CLI-Scan.gif)

Confirm a fact is still accurate:

```bash
factcheck verify <id>
```

### Using it with an existing memory system

```ts
import { Mem0Adapter } from "@factlayer/adapter-mem0";

const factlayer = new Mem0Adapter(mem0Client);
const results = await factlayer.scanMem0(userId);
// each result: { fact, status: "fresh" | "needs-verification" }
```

### Using it as an MCP server

Point any MCP-compatible agent (Claude Code, Claude Desktop, or your own) at FactLayer, and it gains freshness-checking as a tool call no code changes to your agent required.

```json
{
  "mcpServers": {
    "factlayer": {
      "command": "bun",
      "args": ["run", "packages/mcp-server/src/index.ts"]
    }
  }
}
```

![Mem0 MCP Loop Demo](./docs/MCP-loop.gif)

![Mem0 MCP Loop Demo](./docs/MCP-loop2.gif)

Available tools: `check_freshness`, `mark_verified`, `scan_mem0_freshness`.

---

## How the freshness model works

- **Category half-lives** each volatility tier has an expected duration a fact of that type tends to stay true. Configurable per project.
- **`expiresAt` for exact dates** some facts don't need a guess (a passport expiry, a contract end date). Set `expiresAt` directly and FactLayer skips the heuristic entirely, checking the real date instead.
- **Unknown defaults conservative, not permissive** a fact that can't be classified gets a _shorter_ re-check window than most named categories, not a longer one. Misclassification fails safe.

What FactLayer deliberately does **not** do: resolve contradictions between facts (that's Zep/Graphiti's job a good one, don't rebuild it), or know that a real-world fact changed without being told. It manages _risk based on elapsed time and fact type_ a smoke detector, not a camera.

---

## Architecture

```
factlayer/
├── packages/
│   ├── core/              check() engine, classify(), SQLite store
│   ├── cli/                factcheck command-line tool
│   ├── adapter-mem0/       read + persist bridge to Mem0
│   └── mcp-server/         exposes core over MCP (check_freshness, mark_verified, scan_mem0_freshness)
```

Bun + TypeScript throughout. Local embedding classification via `@xenova/transformers` (`all-MiniLM-L6-v2`) no external API calls, no GPU required.

---

## Roadmap

- [x] Core freshness engine + category half-lives
- [x] Exact-date (`expiresAt`) support
- [x] Two-tier auto-classification (keyword → local embedding)
- [x] Mem0 adapter read, classify, persist, and act on real Mem0 data
- [x] MCP server `check_freshness`, `mark_verified`, `scan_mem0_freshness`
- [ ] Zep adapter
- [ ] Cognee adapter
- [ ] Contradiction-aware handoff (defer to Graphiti-style detection where available, rather than reimplementing it)

---

## Contributing

Issues and PRs welcome. This is an early, actively-developed project if you're building on Mem0, Zep, Cognee, or your own memory layer and hitting the staleness problem described above, I'd genuinely like to hear about your use case.

## License

This project is licensed under the [MIT License](./LICENSE).
