# @factlayer/cli

The `factcheck` command-line tool for [FactLayer](https://github.com/Rubber-Duck-Screaming/factlayer) — add facts, scan for ones that need re-verification, and confirm them, all against a local SQLite database.

## Install

```bash
bun add -g @factlayer/cli
```

## Usage

```bash
factcheck add "I started working at Acme Corp"   # category auto-classified
factcheck scan                                    # lists facts, needs-verification first
factcheck verify <id>                             # confirms a fact is still accurate
factcheck --help
```

See the [main repo](https://github.com/Rubber-Duck-Screaming/factlayer) for the full architecture and how this fits alongside `@factlayer/core`, `@factlayer/adapter-mem0`, and `@factlayer/mcp-server`.
