#!/usr/bin/env bun
import { resolve } from "node:path";
import { classify, setStorePath } from "@factlayer/core";
import { runAdd, runScan, runVerify } from "./commands";

setStorePath(resolve(process.cwd(), "factcheck.db"));

const [command, ...args] = process.argv.slice(2);

switch (command) {
  case "add": {
    const [text, categoryArg] = args;
    if (!text) {
      console.error('Usage: factcheck add "<text>" [category]');
      process.exit(1);
    }
    const category = categoryArg ?? (await classify(text));
    console.log(await runAdd(text, category));
    break;
  }

  case "scan": {
    console.log(runScan());
    break;
  }

  case "verify": {
    const [id] = args;
    if (!id) {
      console.error("Usage: factcheck verify <id>");
      process.exit(1);
    }
    console.log(runVerify(id));
    break;
  }

  default: {
    console.error(`Unknown command: ${command ?? "(none)"}`);
    console.error("Usage: factcheck <add|scan|verify> [args]");
    process.exit(1);
  }
}
