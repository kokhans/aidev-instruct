import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { walk } from "../src/fs.ts";
import {
  loadPacks,
  loadStacks,
  PACKS_DIR,
  type Pack,
  requestsFor,
  resolve,
  STACKS_DIR,
} from "../src/packs.ts";
import { createFixture, type Fixture } from "./fixtures.ts";

let fx: Fixture;
beforeEach(() => {
  fx = createFixture();
});
afterEach(() => fx.cleanup());

const fake = (name: string, requires: string[] = [], conflicts: string[] = []): Pack => ({
  name,
  description: "",
  version: "1.0.0",
  tags: [],
  authors: [],
  requires,
  conflicts,
  packVersions: {},
  notes: [],
  dir: "",
});
const map = (...packs: Pack[]) => new Map(packs.map((p) => [p.name, p]));

describe("loadPacks", () => {
  it("loads manifests with defaults and skips folders without one", () => {
    fx.write("packs/empty-folder/readme.txt", "x");
    fx.write("packs/bare/pack.json", JSON.stringify({ name: "bare" }));
    const packs = loadPacks(fx.packsDir);
    expect(packs.has("empty-folder")).toBe(false);
    expect(packs.get("bare")).toMatchObject({
      description: "",
      requires: [],
      conflicts: [],
      notes: [],
    });
    expect(packs.get("spa")?.conflicts).toEqual(["ssr"]);
    expect(packs.get("base")?.notes).toEqual(["Run `setup --now` first."]);
    fx.write(
      "packs/odd/pack.json",
      JSON.stringify({ name: "odd", packVersions: { dotnet: 1, react: ">=1.0.0" } }),
    );
    fx.write("packs/shape/pack.json", JSON.stringify({ name: "shape", packVersions: ["x"] }));
    const withTags = loadPacks(fx.packsDir);
    expect(withTags.get("odd")?.packVersions).toEqual({ react: ">=1.0.0" });
    expect(withTags.get("shape")?.packVersions).toEqual({});
  });

  it("rejects a name that does not match the folder, bad lists and bad JSON", () => {
    fx.write("packs/wrong/pack.json", JSON.stringify({ name: "other" }));
    expect(() => loadPacks(fx.packsDir)).toThrow(/"name" must be "wrong"/);
    fx.write("packs/wrong/pack.json", JSON.stringify({ name: "wrong", requires: "web" }));
    expect(() => loadPacks(fx.packsDir)).toThrow(/"requires" must be a list of names/);
    fx.write("packs/wrong/pack.json", "{ nope");
    expect(() => loadPacks(fx.packsDir)).toThrow(/is not valid JSON/);
  });

  it("finds the shipped packs by default", () => {
    expect(PACKS_DIR).toMatch(/packs$/);
    expect(loadPacks().size).toBeGreaterThan(0);
  });
});

describe("loadStacks", () => {
  it("loads stack files and ignores other files", () => {
    fx.write("stacks/readme.txt", "x");
    fx.write("stacks/bare.json", JSON.stringify({ name: "bare" }));
    const stacks = loadStacks(fx.stacksDir);
    expect([...stacks.keys()]).toEqual(["bare", "site"]);
    expect(stacks.get("bare")).toEqual({
      name: "bare",
      description: "",
      version: "",
      packs: [],
    });
  });

  it("returns no stacks for a missing folder", () => {
    expect(loadStacks(`${fx.temp}/none`).size).toBe(0);
  });

  it("rejects a name that does not match the file", () => {
    fx.write("stacks/x.json", JSON.stringify({ name: "y", packs: [] }));
    expect(() => loadStacks(fx.stacksDir)).toThrow(/"name" must be "x"/);
  });

  it("finds the shipped stacks by default", () => {
    expect(STACKS_DIR).toMatch(/stacks$/);
    expect(loadStacks().size).toBeGreaterThan(0);
  });
});

describe("requestsFor", () => {
  it("expands stacks with their folder and adds packs", () => {
    const stacks = loadStacks(fx.stacksDir);
    expect(
      requestsFor(
        [{ name: "site", path: ["apps/web"] }],
        [{ name: "db" }, { name: "auth", path: ["api"] }],
        stacks,
      ),
    ).toEqual([
      { name: "web", scope: ["apps/web"], from: { stacks: ["site"] } },
      { name: "db", scope: null, from: { config: true } },
      { name: "auth", scope: ["api"], from: { config: true } },
    ]);
  });

  it("rejects unknown stacks", () => {
    expect(() => requestsFor([{ name: "nope" }], [], new Map())).toThrow(/Unknown stack "nope"/);
  });
});

describe("resolve", () => {
  it("orders dependencies first and merges folders from every request", () => {
    const packs = map(fake("a"), fake("b", ["a"]), fake("c", ["a"]));
    const result = resolve(
      [
        { name: "b", scope: ["x"] },
        { name: "c", scope: ["y"] },
        { name: "b", scope: ["x"] },
      ],
      packs,
    );
    expect(result.map((p) => [p.name, p.scope])).toEqual([
      ["a", ["x", "y"]],
      ["b", ["x"]],
      ["c", ["y"]],
    ]);
  });

  it("widens a dependency to the whole project when any request needs it there", () => {
    const packs = map(fake("a"), fake("b", ["a"]));
    const result = resolve(
      [
        { name: "b", scope: ["x"] },
        { name: "a", scope: null },
      ],
      packs,
    );
    expect(result.find((p) => p.name === "a")?.scope).toBeNull();
    expect(result.find((p) => p.name === "b")?.scope).toEqual(["x"]);
  });

  it("names the pack that requires an unknown pack", () => {
    expect(() => resolve([{ name: "nope", scope: null }], map())).toThrow(/Unknown pack "nope"\./);
    expect(() => resolve([{ name: "b", scope: null }], map(fake("b", ["gone"])))).toThrow(
      /Unknown pack "gone" \(required by b\)/,
    );
  });

  it("reports circular requires", () => {
    const packs = map(fake("a", ["b"]), fake("b", ["a"]));
    expect(() => resolve([{ name: "a", scope: null }], packs)).toThrow(
      /Circular requires: a -> b -> a/,
    );
  });

  it("rejects conflicting packs in one folder, and allows them in separate folders", () => {
    const packs = map(fake("spa", [], ["ssr"]), fake("ssr", [], ["spa"]));
    const error = () =>
      resolve(
        [
          { name: "spa", scope: null },
          { name: "ssr", scope: null },
        ],
        packs,
      );
    expect(error).toThrow(
      "Packs spa and ssr cannot be installed together in the whole project. Give each one its own folder with --path.",
    );
    expect(() =>
      resolve(
        [
          { name: "spa", scope: ["src/spa"] },
          { name: "ssr", scope: ["src/ssr"] },
        ],
        packs,
      ),
    ).not.toThrow();
    expect(() =>
      resolve(
        [
          { name: "spa", scope: ["src/app"] },
          { name: "ssr", scope: ["src/app"] },
        ],
        packs,
      ),
    ).toThrow("cannot be installed together in src/app.");
    expect(() =>
      resolve(
        [
          { name: "spa", scope: ["src"] },
          { name: "ssr", scope: ["src/ssr"] },
        ],
        packs,
      ),
    ).toThrow("cannot be installed together in src/ssr.");
    expect(resolve([{ name: "spa", scope: null }], packs)).toHaveLength(1);
  });

  it("makes a required pack conflict through the pack that requires it", () => {
    const packs = map(
      fake("start", ["router"], ["other"]),
      fake("router", [], ["other"]),
      fake("other", [], ["router"]),
    );
    expect(() =>
      resolve(
        [
          { name: "start", scope: null },
          { name: "other", scope: null },
        ],
        packs,
      ),
    ).toThrow(/Packs router and other cannot be installed together/);
  });

  it("checks packVersions against the release version of the pack", () => {
    const current = map(
      { ...fake("web", ["dotnet"]), packVersions: { dotnet: ">=1.4.2" } },
      { ...fake("dotnet"), version: "1.4.2" },
    );
    expect(resolve([{ name: "web", scope: null }], current)).toHaveLength(2);
    const older = map(
      { ...fake("web", ["dotnet"]), packVersions: { dotnet: ">=1.4.2" } },
      { ...fake("dotnet"), version: "1.3.0" },
    );
    expect(() => resolve([{ name: "web", scope: null }], older)).toThrow(
      "Pack web needs dotnet >=1.4.2, but dotnet here is 1.3.0.",
    );
    const absent = map({ ...fake("web"), packVersions: { ghost: ">=1.0.0" } });
    expect(resolve([{ name: "web", scope: null }], absent)).toHaveLength(1);
  });

  it("warns when a config version overrides a requires pin", () => {
    const packs = map(fake("web", ["react@18"]), { ...fake("react"), latest: "19" });
    const overridden = resolve(
      [
        { name: "web", scope: null, from: { config: true } },
        { name: "react", scope: null, version: "19", from: { config: true } },
      ],
      packs,
    );
    expect(overridden.find((pack) => pack.name === "web")?.warnings).toEqual([
      "web requires react@18; the config sets react@19 in the whole project.",
    ]);
    expect(resolve([{ name: "web", scope: null }], packs)[0]?.warnings).toEqual([]);
    const same = resolve(
      [
        { name: "web", scope: null, from: { config: true } },
        { name: "react", scope: null, version: "18", from: { config: true } },
      ],
      packs,
    );
    expect(same.find((pack) => pack.name === "web")?.warnings).toEqual([]);
  });
});

describe("walk", () => {
  it("lists nested files with forward slashes, and nothing for a missing folder", () => {
    expect(walk(`${fx.packsDir}/web/skills`)).toEqual([
      "web-spec/SKILL.md",
      "web-spec/references/seo.md",
    ]);
    expect(walk(`${fx.temp}/none`)).toEqual([]);
  });
});
