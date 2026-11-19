import { describe, expect, it } from "vitest";
import { intersect, normalizePath, scopeGlobs, scopeOf, union } from "../src/scope.ts";

describe("normalizePath", () => {
  it("uses forward slashes and drops dots and outer slashes", () => {
    expect(normalizePath("./apps\\web/")).toBe("apps/web");
    expect(normalizePath("apps//api/./")).toBe("apps/api");
    expect(normalizePath(".")).toBe("");
  });

  it("rejects paths that leave the project", () => {
    expect(() => normalizePath("../other")).toThrow(/inside the project/);
    expect(() => normalizePath("apps/../../x")).toThrow(/inside the project/);
    expect(() => normalizePath("/apps/web")).toThrow(/inside the project/);
    expect(() => normalizePath("C:\\apps")).toThrow(/inside the project/);
  });

  it("turns a list of folders into a scope and de-duplicates it", () => {
    expect(scopeOf(undefined)).toBeNull();
    expect(scopeOf([])).toBeNull();
    expect(scopeOf(["./apps/web/"])).toEqual(["apps/web"]);
    expect(scopeOf(["apps/web", "apps\\admin", "apps/web"])).toEqual(["apps/web", "apps/admin"]);
  });
});

describe("scopeOf", () => {
  it("returns the whole project for a missing or empty list", () => {
    expect(scopeOf(undefined)).toBeNull();
    expect(scopeOf([])).toBeNull();
    expect(scopeOf(["./"])).toBeNull();
  });

  it("returns the folders as written", () => {
    expect(scopeOf(["apps/web/"])).toEqual(["apps/web"]);
  });
});

describe("union", () => {
  it("is the whole project when either side is", () => {
    expect(union(null, ["a"])).toBeNull();
    expect(union(["a"], null)).toBeNull();
  });

  it("merges folders, drops nested ones and sorts", () => {
    expect(union(["b", "a/x"], ["a", "b"])).toEqual(["a", "b"]);
  });
});

describe("intersect", () => {
  it("takes the other side when one is the whole project", () => {
    expect(intersect(null, ["a"])).toEqual(["a"]);
    expect(intersect(["a"], null)).toEqual(["a"]);
    expect(intersect(null, null)).toBeNull();
  });

  it("keeps the narrower folder of each overlapping pair", () => {
    expect(intersect(["apps"], ["apps/api"])).toEqual(["apps/api"]);
    expect(intersect(["apps/api"], ["apps"])).toEqual(["apps/api"]);
    expect(intersect(["a", "b"], ["b"])).toEqual(["b"]);
  });

  it("is empty when folders do not overlap", () => {
    expect(intersect(["apps/web"], ["apps/api"])).toEqual([]);
    expect(intersect(["app"], ["apps"])).toEqual([]);
  });
});

describe("scopeGlobs", () => {
  it("leaves globs unchanged for the whole project", () => {
    expect(scopeGlobs(["**/*.ts"], null)).toEqual(["**/*.ts"]);
    expect(scopeGlobs([], null)).toEqual([]);
  });

  it("prefixes every glob with every folder", () => {
    expect(scopeGlobs(["**/*.ts", "./drizzle.config.ts"], ["a", "b"])).toEqual([
      "a/**/*.ts",
      "a/drizzle.config.ts",
      "b/**/*.ts",
      "b/drizzle.config.ts",
    ]);
  });

  it("covers every file in the folders when there are no globs", () => {
    expect(scopeGlobs([], ["apps/web"])).toEqual(["apps/web/**"]);
  });
});
