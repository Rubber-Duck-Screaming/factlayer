# FactLayer

Yooooooooooooo It's been a long time since my last project. and i hate writing README's 🙂.

Anyways here's what im Building.

A freshness-policy layer for AI memory systems.

"WHAT IS THAT??". well, glad you asked. and keep it down:

A local-first fact freshness tracking system built to prevent LLM context drift and hallucinations.

FactLayer manages the "shelf-life" of contextual information by tracking decay rates (half-lives) on facts. When facts go stale, FactLayer flags them for re-verification.It doesn't store or retrieve facts that's a solved problem, and Mem0, Zep,and Cognee already do it well.

FactLayer sits on top of whatever store you're
already using and answers one question they don't. is this fact still likely
to be true?

## Why this exists

Memory stores are good at recall. None of them track whether what they're
recalling has gone stale. An LLM pulling "user's job title" from six months
ago has no way to know it's outdated unless something upstream flags it.

FactLayer adds three things on top of your existing store:

**Volatility taxonomy** classifies facts by how fast that type of fact
tends to change (a passport expiry date and a favorite color don't decay
at the same rate, or in the same way).

**Last-verified clock** separate from last-accessed. Tracks when a fact
was actually confirmed true, and how.

**Retrieval-time gate** checks a fact against its volatility class before
it's served, and flags or blocks it if it's aging out.

## Status

Very Early - Core types and interfaces exist. Adapters (Mem0, Zep, Cognee,
Postgres) and the gate logic are still being built. Not usable for a real
integration yet.

## Install

```
bun install
```

## Stack

TypeScript, Bun.

## License

TBD.

I'll keep u updated.
