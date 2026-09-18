#!/usr/bin/env bun
import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import { createServer } from "./server";

const server = createServer();
const transport = new StdioServerTransport();
await server.connect(transport);
