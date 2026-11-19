import { listItems } from "../items.ts";
import type { IO } from "../output.ts";
import { fail } from "../output.ts";
import type { Pack } from "../packs.ts";
import { loadConfig, type Options, type World, world } from "../session.ts";

/** Prints one pack or stack from the official packs and every feed, without writing. */
export async function info(
  io: IO,
  options: Options,
  [name]: string[],
  version: string,
): Promise<number> {
  if (!name) return fail(io, 'Use "info <pack or stack>".');
  const config = loadConfig(options);
  const current = await world(io, options, config, "latest", version);
  const pack = current.packs.get(name);
  if (pack) {
    printPackInfo(io, pack, current);
    return 0;
  }
  const stack = current.stacks.get(name);
  if (stack) {
    io.out(stack.name);
    io.out(`  Feed: ${current.origins.get(stack.name) ?? "official"}`);
    io.out(`  Description: ${stack.description}`);
    io.out(`  Packs: ${stack.packs.join(", ")}`);
    io.out(`  Install: aidev-instruct init -s ${stack.name}`);
    return 0;
  }
  const feeds = [
    "the official packs",
    ...(config?.feeds ?? []).map((feed) => `feed "${feed.name}"`),
  ];
  return fail(io, `Unknown pack or stack "${name}". Searched ${feeds.join(", ")}.`);
}

/** Prints a pack's metadata, its versioned items and its install command. */
function printPackInfo(io: IO, pack: Pack, current: World) {
  const versions = listItems(pack.dir, pack.name)
    .filter((item) => item.version !== undefined)
    .map((item) => item.name);
  io.out(pack.name);
  io.out(`  Feed: ${current.origins.get(pack.name) ?? "official"}`);
  io.out(`  Description: ${pack.description}`);
  io.out(`  Tags: ${pack.tags.join(", ")}`);
  if (pack.latest) io.out(`  Latest: ${pack.latest}`);
  io.out(`  Versioned items: ${versions.join(", ") || "none"}`);
  io.out(`  Requires: ${pack.requires.join(", ") || "none"}`);
  io.out(`  Conflicts: ${pack.conflicts.join(", ") || "none"}`);
  for (const note of pack.notes) io.out(`  Note: ${note}`);
  io.out(`  Authors: ${pack.authors.join(", ") || "none"}`);
  io.out(`  Install: aidev-instruct add ${pack.name}`);
}
