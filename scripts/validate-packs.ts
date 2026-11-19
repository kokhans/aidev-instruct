/**
 * Checks pack and stack format and writing style.
 * Usage: `bun scripts/validate-packs.ts [pack...]`. With no names it checks every pack.
 */
import { fileURLToPath } from "node:url";
import { validateRepository } from "../src/validate.ts";

const problems = validateRepository(
  fileURLToPath(new URL("..", import.meta.url)),
  process.argv.slice(2),
);
for (const problem of problems) console.log(problem);
console.log(problems.length ? `${problems.length} problem(s).` : "No problems.");
process.exit(problems.length ? 1 : 0);
