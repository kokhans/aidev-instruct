import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { defaultCacheDir, loadFeeds, parseSource, readFeedManifest } from "../src/feeds.ts";
import { extractTarGz } from "../src/tar.ts";
import {
  tarEntry as entry,
  feedArchive,
  githubFetch as github,
  manifestJson as manifest,
  paxRecord,
  tarGz,
} from "./feed-fixtures.ts";

const created: string[] = [];
afterEach(() => {
  for (const dir of created.splice(0)) rmSync(dir, { recursive: true, force: true });
});
const temp = () => {
  const dir = mkdtempSync(join(tmpdir(), "aidev-feeds-"));
  created.push(dir);
  return dir;
};

/** A feed layout on disk. */
function feedFolder(name = "acme", extra: Record<string, string> = {}): string {
  const dir = temp();
  const files: Record<string, string> = {
    "feed.json": JSON.stringify({ name, version: "1.0.0", cli: ">=0.1.0" }),
    [`packs/${name}-api/pack.json`]: manifest(`${name}-api`),
    [`packs/${name}-api/rules/${name}-api.md`]: "---\ndescription: API rules.\n---\n\n# API\n",
    [`packs/${name}-react/pack.json`]: manifest(`${name}-react`, { requires: ["react"] }),
    [`packs/${name}-react/rules/${name}-react.md`]:
      "---\ndescription: React rules.\n---\n\n# React\n",
    [`stacks/${name}-site.json`]: JSON.stringify({
      name: `${name}-site`,
      description: "Site.",
      version: "1.0.0",
      packs: [`${name}-api`],
    }),
    ...extra,
  };
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), content);
  }
  return dir;
}

const noFetch = (async () => {
  throw new Error("no fetch expected");
}) as unknown as typeof fetch;

const options = (root: string, overrides: Record<string, unknown> = {}) => ({
  root,
  mode: "latest" as const,
  lock: {},
  cliVersion: "0.6.0",
  fetch: noFetch,
  ...overrides,
});

describe("sources", () => {
  it("reads GitHub addresses and folder paths", () => {
    expect(parseSource("github:acme/aidev-instruct")).toEqual({
      kind: "github",
      owner: "acme",
      repo: "aidev-instruct",
    });
    expect(parseSource("https://github.com/acme/aidev-instruct")).toEqual({
      kind: "github",
      owner: "acme",
      repo: "aidev-instruct",
    });
    expect(parseSource("https://github.com/acme/aidev-instruct.git/")).toEqual({
      kind: "github",
      owner: "acme",
      repo: "aidev-instruct",
    });
    expect(parseSource("../acme-aidev-instruct")).toEqual({
      kind: "folder",
      path: "../acme-aidev-instruct",
    });
  });

  it("puts the cache under the user folder", () => {
    expect(defaultCacheDir({})).toMatch(/aidev-instruct$/);
    expect(defaultCacheDir({ AIDEV_INSTRUCT_CACHE: "/tmp/acme" })).toBe("/tmp/acme");
  });
});

describe("tar", () => {
  const out = () => join(temp(), "out");

  it("extracts files, directories, a prefix and a GNU long name", async () => {
    const dir = out();
    const files = await extractTarGz(
      tarGz(
        entry("acme-abc/plain.md", "# Plain\n"),
        entry("acme-abc/folder/", "", { type: "5" }),
        entry("acme-abc/folder/nested.md", "# Nested\n"),
        entry("short", "acme-abc/renamed.md", { type: "L" }),
        entry("acme-abc/ignored.md", "# Renamed\n"),
        entry("file.md", "# Prefixed\n", { prefix: "acme-abc/folder" }),
      ),
      dir,
      1,
    );
    expect(files.sort()).toEqual(["folder/file.md", "folder/nested.md", "plain.md", "renamed.md"]);
    expect(readFileSync(join(dir, "renamed.md"), "utf8")).toBe("# Renamed\n");
    expect(readFileSync(join(dir, "folder/file.md"), "utf8")).toBe("# Prefixed\n");
  });

  it("applies a pax header to the next entry and keeps the folder contents", async () => {
    const dir = out();
    const files = await extractTarGz(
      tarGz(
        entry("pax", paxRecord("path", "acme-abc/pax/named.md"), { type: "x" }),
        entry("acme-abc/short.md", "# Pax\n"),
      ),
      dir,
    );
    expect(files).toEqual(["pax/named.md"]);
    expect(readFileSync(join(dir, "pax/named.md"), "utf8")).toBe("# Pax\n");
  });

  it("skips entries outside the folder and every link", async () => {
    const base = temp();
    const dir = join(base, "out");
    const files = await extractTarGz(
      tarGz(
        entry("acme-abc/../evil.md", "# Evil\n"),
        entry("/absolute.md", "# Absolute\n"),
        entry("acme-abc/link.md", "", { type: "2", linkname: "/etc/passwd" }),
        entry("acme-abc/hard.md", "", { type: "1", linkname: "acme-abc/ok.md" }),
        entry("acme-abc/ok.md", "# Ok\n"),
      ),
      dir,
    );
    expect(files).toEqual(["ok.md"]);
    expect(existsSync(join(base, "evil.md"))).toBe(false);
    expect(existsSync(join(dir, "absolute.md"))).toBe(false);
    expect(existsSync(join(dir, "link.md"))).toBe(false);
    expect(existsSync(join(dir, "hard.md"))).toBe(false);
  });

  it("returns nothing for an empty archive", async () => {
    const dir = out();
    expect(await extractTarGz(Buffer.alloc(0), dir)).toEqual([]);
    expect(existsSync(dir)).toBe(false);
  });
});

describe("readFeedManifest", () => {
  it("reads a feed.json and checks the CLI range", () => {
    const dir = feedFolder();
    expect(readFeedManifest(dir)).toEqual({ name: "acme", version: "1.0.0", cli: ">=0.1.0" });
    expect(() => readFeedManifest(dir, "0.0.1")).toThrow(
      'Feed "acme" needs aidev-instruct >=0.1.0. This CLI is 0.0.1.',
    );
  });

  it("accepts a full range for the CLI and names it when the CLI is outside it", () => {
    const dir = temp();
    writeFileSync(
      join(dir, "feed.json"),
      JSON.stringify({ name: "acme", version: "1.0.0", cli: ">=0.1.0 <1" }),
    );
    expect(readFeedManifest(dir, "0.9.0").cli).toBe(">=0.1.0 <1");
    expect(() => readFeedManifest(dir, "1.0.0")).toThrow(
      'Feed "acme" needs aidev-instruct >=0.1.0 <1. This CLI is 1.0.0.',
    );
  });

  it("fails on a missing or invalid file and on missing fields", () => {
    const missing = temp();
    expect(() => readFeedManifest(missing)).toThrow(/feed\.json is missing/);
    writeFileSync(join(missing, "feed.json"), "{ nope");
    expect(() => readFeedManifest(missing)).toThrow(/not valid JSON/);
    writeFileSync(join(missing, "feed.json"), JSON.stringify({ name: "acme" }));
    expect(() => readFeedManifest(missing)).toThrow(/"version" is required/);
  });
});

describe("loadFeeds", () => {
  it("loads packs and stacks from a folder feed and resolves an official requirement", () => {
    const dir = feedFolder();
    return loadFeeds([{ name: "acme", source: dir }], options(temp())).then((loaded) => {
      expect([...loaded.packs.keys()]).toEqual(["acme-api", "acme-react"]);
      expect([...loaded.stacks.keys()]).toEqual(["acme-site"]);
      expect(loaded.origins.get("acme-api")).toBe("acme");
      expect(loaded.lock).toEqual({});
      expect(loaded.packs.get("acme-react")?.requires).toEqual(["react"]);
    });
  });

  it("fails a missing folder, a wrong name and a name without the feed prefix", async () => {
    await expect(loadFeeds([{ name: "acme", source: "../nope" }], options(temp()))).rejects.toThrow(
      /does not exist/,
    );

    const other = feedFolder("other");
    await expect(loadFeeds([{ name: "acme", source: other }], options(temp()))).rejects.toThrow(
      'Feed "acme" points to a feed named "other".',
    );

    const unprefixed = feedFolder("acme", {
      "packs/plain/pack.json": manifest("plain"),
    });
    await expect(
      loadFeeds([{ name: "acme", source: unprefixed }], options(temp())),
    ).rejects.toThrow('Feed "acme" ships "plain"');
  });

  it("fails a name that an official pack or another feed already has", async () => {
    const shared = { "packs/acme-api-x/pack.json": manifest("acme-api-x") };
    const first = feedFolder("acme", shared);
    await expect(
      loadFeeds(
        [{ name: "acme", source: first }],
        options(temp(), { officialPacks: ["acme-api-x"] }),
      ),
    ).rejects.toThrow('acme-api-x comes from the official packs and feed "acme".');

    const second = feedFolder("acme-api", shared);
    await expect(
      loadFeeds(
        [
          { name: "acme", source: first },
          { name: "acme-api", source: second },
        ],
        options(temp()),
      ),
    ).rejects.toThrow('acme-api-x comes from feed "acme" and feed "acme-api"');
  });

  it("stops when the CLI is outside the feed's range", async () => {
    const dir = feedFolder();
    await expect(
      loadFeeds([{ name: "acme", source: dir }], options(temp(), { cliVersion: "0.0.1" })),
    ).rejects.toThrow("needs aidev-instruct >=0.1.0");
  });

  it("reads a GitHub feed, caches it by commit and locks the release", async () => {
    const cacheDir = temp();
    const root = temp();
    const archive = feedArchive({
      "feed.json": JSON.stringify({ name: "acme", version: "1.0.0", cli: ">=0.1.0" }),
      "packs/acme-api/pack.json": manifest("acme-api"),
      "packs/acme-api/rules/acme-api.md": "---\ndescription: API rules.\n---\n\n# API\n",
    });
    const fake = github({ tag: "v1.2.0", commit: "abc123", archive });
    const loaded = await loadFeeds(
      [{ name: "acme", source: "github:acme/aidev-instruct" }],
      options(root, { cacheDir, fetch: fake.fn }),
    );
    expect(loaded.lock).toEqual({ acme: { tag: "v1.2.0", commit: "abc123" } });
    expect(existsSync(join(cacheDir, "acme", "abc123", "feed.json"))).toBe(true);
    expect(loaded.packs.get("acme-api")?.version).toBe("1.0.0");
    expect(fake.calls[0]?.url).toBe(
      "https://api.github.com/repos/acme/aidev-instruct/releases/latest",
    );
    expect(
      fake.calls.find((call) => call.url === "https://codeload.test/archive")?.headers,
    ).toBeUndefined();

    const again = github({ down: true });
    const cached = await loadFeeds(
      [{ name: "acme", source: "github:acme/aidev-instruct" }],
      options(root, {
        mode: "locked",
        lock: loaded.lock,
        cacheDir,
        fetch: again.fn,
      }),
    );
    expect(again.calls).toEqual([]);
    expect(cached.lock).toEqual(loaded.lock);
  });

  it("sends the token to the GitHub API and names a missing variable", async () => {
    const cacheDir = temp();
    const feed = {
      name: "acme",
      source: "github:acme/aidev-instruct",
      tokenEnv: "ACME_FEED_TOKEN",
    };
    const archive = feedArchive({
      "feed.json": JSON.stringify({ name: "acme", version: "1.0.0", cli: ">=0.1.0" }),
    });
    const fake = github({ tag: "v1.0.0", commit: "abc", archive });
    await loadFeeds(
      [feed],
      options(temp(), { cacheDir, fetch: fake.fn, env: { ACME_FEED_TOKEN: "t" } }),
    );
    expect(fake.calls[0]?.headers?.Authorization).toBe("Bearer t");

    await expect(
      loadFeeds([feed], options(temp(), { cacheDir: temp(), fetch: fake.fn, env: {} })),
    ).rejects.toThrow(/Set ACME_FEED_TOKEN/);
  });

  it("warns when a tag moves, and names the release when GitHub fails", async () => {
    const cacheDir = temp();
    const root = temp();
    const archive = feedArchive({
      "feed.json": JSON.stringify({ name: "acme", version: "1.0.0", cli: ">=0.1.0" }),
    });
    const locked = { acme: { tag: "v1.0.0", commit: "old" } };
    const moved = await loadFeeds([{ name: "acme", source: "github:acme/aidev-instruct" }], {
      ...options(root, { cacheDir, fetch: github({ tag: "v1.0.0", commit: "new", archive }).fn }),
      lock: locked,
    });
    expect(moved.notices[0]).toContain("tag v1.0.0 moved from old to new");

    const cachedDir = join(cacheDir, "acme", "old");
    mkdirSync(cachedDir, { recursive: true });
    writeFileSync(
      join(cachedDir, "feed.json"),
      JSON.stringify({ name: "acme", version: "1.0.0", cli: ">=0.1.0" }),
    );
    const offline = await loadFeeds([{ name: "acme", source: "github:acme/aidev-instruct" }], {
      ...options(root, { cacheDir, fetch: github({ down: true }).fn }),
      lock: locked,
    });
    expect(offline.notices[0]).toContain("GitHub is unreachable");
    expect(offline.lock).toEqual(locked);
  });

  it("fails a 404, another HTTP error, a release without a tag and a commit without a sha", async () => {
    const feed = { name: "acme", source: "github:acme/aidev-instruct" };
    await expect(
      loadFeeds(
        [feed],
        options(temp(), { cacheDir: temp(), fetch: github({ status: 404, down: false }).fn }),
      ),
    ).rejects.toThrow(/HTTP 404/);
    await expect(
      loadFeeds([feed], options(temp(), { cacheDir: temp(), fetch: github({ status: 500 }).fn })),
    ).rejects.toThrow(/HTTP 500/);
    await expect(
      loadFeeds(
        [feed],
        options(temp(), { cacheDir: temp(), fetch: github({ tag: undefined, commit: "a" }).fn }),
      ),
    ).rejects.toThrow(/no published release/);
    await expect(
      loadFeeds(
        [feed],
        options(temp(), { cacheDir: temp(), fetch: github({ tag: "v1", commit: undefined }).fn }),
      ),
    ).rejects.toThrow(/tag v1 has no commit/);
  });

  it("shows the cache notice and fails without one when GitHub is down", async () => {
    const feed = { name: "acme", source: "github:acme/aidev-instruct" };
    await expect(
      loadFeeds([feed], options(temp(), { cacheDir: temp(), fetch: github({ down: true }).fn })),
    ).rejects.toThrow("offline");
  });

  it("fails an archive response that is neither a redirect nor a success", async () => {
    const feed = { name: "acme", source: "github:acme/aidev-instruct" };
    const fetchFn = (async (input: string | URL | Request) => {
      const url = String(input);
      if (url.endsWith("/releases/latest")) return new Response(JSON.stringify({ tag_name: "v1" }));
      if (url.includes("/commits/")) return new Response(JSON.stringify({ sha: "c" }));
      return new Response("boom", { status: 500 });
    }) as unknown as typeof fetch;
    await expect(
      loadFeeds([feed], options(temp(), { cacheDir: temp(), fetch: fetchFn })),
    ).rejects.toThrow("HTTP 500 for the release archive.");
  });

  it("names the feed and the commit when the archive cannot be extracted", async () => {
    const feed = { name: "acme", source: "github:acme/aidev-instruct" };
    const fetchFn = (async (input: string | URL | Request) => {
      const url = String(input);
      if (url.endsWith("/releases/latest")) return new Response(JSON.stringify({ tag_name: "v1" }));
      if (url.includes("/commits/")) return new Response(JSON.stringify({ sha: "c0ffee" }));
      if (url.includes("/tarball/")) {
        return new Response(null, {
          status: 302,
          headers: { location: "https://codeload.test/x" },
        });
      }
      return new Response("not a tarball", { status: 200 });
    }) as unknown as typeof fetch;
    await expect(
      loadFeeds([feed], options(temp(), { cacheDir: temp(), fetch: fetchFn })),
    ).rejects.toThrow(/Feed "acme": the release archive for c0ffee could not be extracted/);
  });

  it("fails when the download host returns an error", async () => {
    const feed = { name: "acme", source: "github:acme/aidev-instruct" };
    const fetchFn = (async (input: string | URL | Request) => {
      const url = String(input);
      if (url.endsWith("/releases/latest")) return new Response(JSON.stringify({ tag_name: "v1" }));
      if (url.includes("/commits/")) return new Response(JSON.stringify({ sha: "c" }));
      if (url.includes("/tarball/")) {
        return new Response(null, {
          status: 302,
          headers: { location: "https://codeload.test/x" },
        });
      }
      return new Response("nope", { status: 500 });
    }) as unknown as typeof fetch;
    await expect(
      loadFeeds([feed], options(temp(), { cacheDir: temp(), fetch: fetchFn })),
    ).rejects.toThrow("HTTP 500 for https://codeload.test/x");
  });

  it("skips archive entries outside the release folder", async () => {
    const cacheDir = temp();
    const archive = tarGz(
      entry("top-level.md", "# Top\n"),
      entry("acme-abc/../evil.md", "# Evil\n"),
      entry("acme-abc/feed.json", JSON.stringify({ name: "acme", version: "1", cli: "*" })),
    );
    const loaded = await loadFeeds(
      [{ name: "acme", source: "github:acme/aidev-instruct" }],
      options(temp(), { cacheDir, fetch: github({ tag: "v1", commit: "c", archive }).fn }),
    );
    expect(loaded.lock).toEqual({ acme: { tag: "v1", commit: "c" } });
    expect(existsSync(join(cacheDir, "acme", "c", "feed.json"))).toBe(true);
    expect(existsSync(join(cacheDir, "acme", "c", "evil.md"))).toBe(false);
    expect(existsSync(join(cacheDir, "acme", "c", "top-level.md"))).toBe(false);
  });

  it("falls back to AIDEV_INSTRUCT_CACHE when no cache folder is passed", async () => {
    const cache = temp();
    const archive = feedArchive({
      "feed.json": JSON.stringify({ name: "acme", version: "1.0.0", cli: ">=0.1.0" }),
    });
    await loadFeeds([{ name: "acme", source: "github:acme/aidev-instruct" }], {
      ...options(temp(), {
        fetch: github({ tag: "v1", commit: "c", archive }).fn,
        env: { AIDEV_INSTRUCT_CACHE: cache },
      }),
    });
    expect(existsSync(join(cache, "acme", "c", "feed.json"))).toBe(true);
  });

  it("reads a release archive that comes without a redirect", async () => {
    const cacheDir = temp();
    const archive = feedArchive({
      "feed.json": JSON.stringify({ name: "acme", version: "1.0.0", cli: ">=0.1.0" }),
    });
    const fetchFn = (async (input: string | URL | Request) => {
      const url = String(input);
      if (url.endsWith("/releases/latest")) return new Response(JSON.stringify({ tag_name: "v1" }));
      if (url.includes("/commits/")) return new Response(JSON.stringify({ sha: "c" }));
      return new Response(archive, { status: 200 });
    }) as unknown as typeof fetch;
    const loaded = await loadFeeds(
      [{ name: "acme", source: "github:acme/aidev-instruct" }],
      options(temp(), { cacheDir, fetch: fetchFn }),
    );
    expect(loaded.lock).toEqual({ acme: { tag: "v1", commit: "c" } });
  });

  it("reads a feed pack that requires an official pack", async () => {
    const dir = feedFolder();
    const loaded = await loadFeeds([{ name: "acme", source: dir }], options(temp()));
    const react = loaded.packs.get("acme-react");
    expect(react?.requires).toEqual(["react"]);
    const text = readFileSync(join(react?.dir ?? "", "rules", "acme-react.md"), "utf8");
    expect(text).toContain("# React");
  });
});
