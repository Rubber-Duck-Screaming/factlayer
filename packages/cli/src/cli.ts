#!/usr/bin/env bun
import { resolve } from "node:path";
import { classify, setStorePath } from "@factlayer/core";
import { runAdd, runScan, runVerify } from "./commands";

setStorePath(resolve(process.cwd(), "factcheck.db"));

const USAGE = "Usage: factcheck <add|scan|verify> [args]";

const [command, ...args] = process.argv.slice(2);

// --help/-h and no arguments are a request for usage, not a mistake -- print
// it to stdout and exit 0 so scripts can tell "asked for help" apart from
// "made a mistake" (an actually unknown command still exits non-zero below).
if (!command || command === "--help" || command === "-h") {
  console.log(USAGE);
  process.exit(0);
}

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
    console.error(`Unknown command: ${command}`);
    console.error(USAGE);
    process.exit(1);
  }
}
