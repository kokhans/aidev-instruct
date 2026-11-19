import { readLock } from "../config.ts";
import type { IO } from "../output.ts";
import { requestsFor, resolve } from "../packs.ts";
import { loadConfig, type Options, world } from "../session.ts";

/** Prints every pack with its state in this project. */
export async function list(io: IO, options: Options, version: string): Promise<number> {
  const config = loadConfig(options);
  const current = await world(io, options, config, "locked", version);
  const lock = readLock(options.root);
  const packs = current.packs;
  const installed = Object.keys(lock?.packs ?? {});
  const requests = config ? requestsFor(config.stacks, config.packs, current.stacks) : [];
  const direct = requests.map((r) => r.name);
  const wanted = config ? resolve(requests, packs).map((p) => p.name) : installed;
  const width = Math.max(...[...packs.keys()].map((name) => name.length));
  const showFeed = (config?.feeds.length ?? 0) > 0;
  const feeds = [...packs.keys()].map((name) => current.origins.get(name) ?? "official");
  const feedWidth = Math.max(0, ...feeds.map((feed) => feed.length));

  for (const pack of packs.values()) {
    const mark = packMark(pack.name, direct, installed, wanted);
    const origin = showFeed
      ? `  ${(current.origins.get(pack.name) ?? "official").padEnd(feedWidth)}`
      : "";
    const requires = pack.requires.length ? ` (requires ${pack.requires.join(", ")})` : "";
    io.out(`${mark} ${pack.name.padEnd(width)}${origin}  ${pack.description}${requires}`);
  }
  if (installed.length || wanted.length) {
    io.out("\n* installed  + installed as a requirement  > pending add  - pending remove");
  }
  return 0;
}

/** Marks a pack: installed, required, or waiting for `update`. */
function packMark(name: string, direct: string[], installed: string[], wanted: string[]): string {
  const isInstalled = installed.includes(name);
  const isWanted = wanted.includes(name);
  if (isInstalled && !isWanted) return "-";
  if (!isInstalled && isWanted) return ">";
  if (!isInstalled) return " ";
  return direct.includes(name) ? "*" : "+";
}
