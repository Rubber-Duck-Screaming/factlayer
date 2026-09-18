import { McpServer } from "@modelcontextprotocol/server";
import {
  checkFreshness,
  checkFreshnessInputSchema,
  markVerifiedInputSchema,
  markVerifiedTool,
  scanMem0FreshnessInputSchema,
  scanMem0Freshness,
} from "./tools";

export function createServer(): McpServer {
  const server = new McpServer({ name: "factlayer-mcp", version: "0.0.1" });

  server.registerTool(
    "check_freshness",
    {
      title: "Check freshness",
      description:
        "Checks whether a fact is fresh or needs re-verification, using factlayer's " +
        "category half-lives (or an explicit expiresAt when given). Category is " +
        "auto-classified from the text when omitted.",
      inputSchema: checkFreshnessInputSchema,
    },
    checkFreshness,
  );

  server.registerTool(
    "mark_verified",
    {
      title: "Mark verified",
      description: "Marks a stored fact as verified as of now, in factlayer's local SQLite database.",
      inputSchema: markVerifiedInputSchema,
    },
    markVerifiedTool,
  );

  server.registerTool(
    "scan_mem0_freshness",
    {
      title: "Scan mem0 freshness",
      description:
        "Scans a mem0 user's memories, persists each as a local fact (keyed by mem0's own id " +
        "so mark_verified can act on it afterward), checks freshness, and returns results " +
        "sorted with needs-verification facts first.",
      inputSchema: scanMem0FreshnessInputSchema,
    },
    // Wrapped so the MCP framework's own second (context) argument never
    // reaches scanMem0Freshness's mem0Client override parameter.
    (args) => scanMem0Freshness(args),
  );

  return server;
}
