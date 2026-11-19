/**
 * Writes `docs/PACKS.md`, `docs/STACKS.md` and the generated sections of `docs/CLI.md`.
 * Usage: `bun run docs`. The content test fails when the files are out of date.
 */
import { fileURLToPath } from "node:url";
import { writeDocs } from "../src/docs.ts";

writeDocs(fileURLToPath(new URL("..", import.meta.url)));
console.log("Wrote docs/PACKS.md, docs/STACKS.md and the generated sections of docs/CLI.md.");
