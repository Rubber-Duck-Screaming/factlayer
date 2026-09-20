# @factlayer/mcp-server

Exposes [FactLayer](https://github.com/Rubber-Duck-Screaming/factlayer) over the Model Context Protocol, so any MCP-compatible agent gets freshness-checking as a tool call: `check_freshness`, `mark_verified`, and `scan_mem0_freshness`.

## Install

```bash
bun add @factlayer/mcp-server
```

## Usage

Point an MCP client at the bin entry over stdio:

```json
{
  "mcpServers": {
    "factlayer": {
      "command": "factlayer-mcp"
    }
  }
}
```

Set `MEM0_API_KEY` (and optionally `MEM0_HOST`) in the environment to use `scan_mem0_freshness`; `check_freshness` and `mark_verified` work against the local store without it.

See the [main repo](https://github.com/Rubber-Duck-Screaming/factlayer) for the full architecture and how this server fits alongside `@factlayer/core`, `@factlayer/cli`, and `@factlayer/adapter-mem0`.
