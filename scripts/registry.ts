/**
 * Writes `registry.json` for the website.
 * Usage: `bun run registry`.
 */
import { fileURLToPath } from "node:url";
import { writeRegistry } from "../src/registry.ts";

writeRegistry(fileURLToPath(new URL("..", import.meta.url)));
console.log("Wrote registry.json.");
