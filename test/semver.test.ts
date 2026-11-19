import { describe, expect, it } from "vitest";
import {
  bumpVersion,
  changeKind,
  compareVersions,
  isPin,
  isRange,
  isSemver,
  largest,
  parseVersion,
  satisfies,
} from "../src/versions.ts";

describe("version parsing", () => {
  it("reads numbers, a prerelease and rejects anything else", () => {
    expect(parseVersion("1.2.3")).toEqual({ major: 1, minor: 2, patch: 3 });
    expect(parseVersion("1.2.3-rc.1")).toEqual({
      major: 1,
      minor: 2,
      patch: 3,
      prerelease: "rc.1",
    });
    expect(parseVersion(" 1.2.3 ")).toEqual({ major: 1, minor: 2, patch: 3 });
    expect(parseVersion("1.2")).toBeUndefined();
    expect(parseVersion("v1.2.3")).toBeUndefined();
    expect(isSemver("1.2.3")).toBe(true);
    expect(isSemver("1.2")).toBe(false);
  });

  it("compares every part and prereleases", () => {
    expect(compareVersions("1.0.0", "1.0.0")).toBe(0);
    expect(compareVersions("2.0.0", "1.9.9")).toBeGreaterThan(0);
    expect(compareVersions("1.2.0", "1.1.9")).toBeGreaterThan(0);
    expect(compareVersions("1.1.1", "1.1.2")).toBeLessThan(0);
    expect(compareVersions("1.0.0", "1.0.0-rc.1")).toBeGreaterThan(0);
    expect(compareVersions("1.0.0-rc.1", "1.0.0")).toBeLessThan(0);
    expect(compareVersions("1.0.0-alpha", "1.0.0-beta")).toBeLessThan(0);
    expect(compareVersions("1.0.0-beta", "1.0.0-alpha")).toBeGreaterThan(0);
    expect(() => compareVersions("1.0.0", "x")).toThrow('Cannot compare "1.0.0" with "x"');
    expect(() => compareVersions("x", "1.0.0")).toThrow('Cannot compare "x" with "1.0.0"');
  });
});

describe("bumps", () => {
  it("names the part that changed", () => {
    expect(changeKind("1.2.3", "2.0.0")).toBe("major");
    expect(changeKind("1.2.3", "1.3.0")).toBe("minor");
    expect(changeKind("1.2.3", "1.2.4")).toBe("patch");
    expect(changeKind("1.2.3-rc.1", "1.2.3")).toBe("patch");
    expect(changeKind("1.2.3", "1.2.3")).toBe("none");
    expect(changeKind("x", "1.2.3")).toBe("none");
  });

  it("raises a version and keeps the larger kind", () => {
    expect(bumpVersion("1.2.3", "major")).toBe("2.0.0");
    expect(bumpVersion("1.2.3", "minor")).toBe("1.3.0");
    expect(bumpVersion("1.2.3", "patch")).toBe("1.2.4");
    expect(bumpVersion("1.2.3", "none")).toBe("1.2.3");
    expect(bumpVersion("x", "patch")).toBe("0.0.1");
    expect(largest("patch", "minor")).toBe("minor");
    expect(largest("major", "patch")).toBe("major");
    expect(largest("none", "patch")).toBe("patch");
    expect(largest("none", "none")).toBe("none");
  });
});

describe("ranges", () => {
  it("accepts the operators a feed writes", () => {
    expect(satisfies("1.2.3", "*")).toBe(true);
    expect(satisfies("1.2.3", ">=0.8.0")).toBe(true);
    expect(satisfies("0.7.0", ">=0.8.0")).toBe(false);
    expect(satisfies("1.2.3", ">=0.8.0 <2.0.0")).toBe(true);
    expect(satisfies("2.0.0", ">=0.8.0 <2.0.0")).toBe(false);
    expect(satisfies("1.2.3", "<=1.2.3")).toBe(true);
    expect(satisfies("1.2.3", ">1.2.3")).toBe(false);
    expect(satisfies("1.2.4", ">1.2.3")).toBe(true);
    expect(satisfies("1.2.3", "<2.0.0")).toBe(true);
    expect(satisfies("1.2.3", "=1.2.3")).toBe(true);
    expect(satisfies("1.2.3", "1.2.3")).toBe(true);
    expect(satisfies("1.2.3", "1.2.4")).toBe(false);
  });

  it("handles caret and tilde ranges", () => {
    expect(satisfies("1.5.0", "^1.2.3")).toBe(true);
    expect(satisfies("2.0.0", "^1.2.3")).toBe(false);
    expect(satisfies("0.2.5", "^0.2.3")).toBe(true);
    expect(satisfies("0.3.0", "^0.2.3")).toBe(false);
    expect(satisfies("0.0.3", "^0.0.3")).toBe(true);
    expect(satisfies("0.0.4", "^0.0.3")).toBe(false);
    expect(satisfies("1.2.9", "~1.2.3")).toBe(true);
    expect(satisfies("1.3.0", "~1.2.3")).toBe(false);
  });

  it("rejects an invalid version or clause", () => {
    expect(satisfies("x", ">=1.0.0")).toBe(false);
    expect(satisfies("1.0.0", ">=x")).toBe(false);
    expect(satisfies("1.0.0", "nope")).toBe(false);
    expect(satisfies("1.0.0", "")).toBe(false);
  });

  it("accepts or, hyphen and x ranges", () => {
    expect(satisfies("1.0.0", "1.0.0 || 2.0.0")).toBe(true);
    expect(satisfies("3.0.0", "1.0.0 || 2.0.0")).toBe(false);
    expect(satisfies("16.2.0", "16 - 20")).toBe(true);
    expect(satisfies("21.0.0", "16 - 20")).toBe(false);
    expect(satisfies("1.5.0", "1.x")).toBe(true);
    expect(satisfies("2.0.0", "1.x")).toBe(false);
    expect(satisfies("7.3.1", "7.3.x")).toBe(true);
    expect(satisfies("19.0.0", ">=16 <20")).toBe(true);
    expect(satisfies("20.0.0", ">=16 <20")).toBe(false);
  });

  it("pads a bare technology version before checking it", () => {
    expect(satisfies("19", ">=18")).toBe(true);
    expect(satisfies("7.3", "~7.3.0")).toBe(true);
    expect(satisfies("7.4", "~7.3.0")).toBe(false);
  });

  it("follows the prerelease rules of semver", () => {
    expect(satisfies("1.2.3-rc.1", ">=1.2.3-rc.0")).toBe(true);
    expect(satisfies("1.2.3-rc.1", ">=1.2.3")).toBe(false);
    expect(satisfies("1.2.3", ">=1.2.3-rc.0")).toBe(true);
  });

  it("checks whether a range is valid", () => {
    expect(isRange("*")).toBe(true);
    expect(isRange(">=0.8.0")).toBe(true);
    expect(isRange(">=0.8.0 <1.0.0")).toBe(true);
    expect(isRange("^1.2.3")).toBe(true);
    expect(isRange("~1.2.3")).toBe(true);
    expect(isRange("1.0.0 || 2.0.0")).toBe(true);
    expect(isRange("16 - 20")).toBe(true);
    expect(isRange("1.x")).toBe(true);
    expect(isRange("=19")).toBe(true);
    expect(isRange("")).toBe(false);
    expect(isRange("nope")).toBe(false);
    expect(isRange(">=x")).toBe(false);
  });

  it("treats a bare version as a pin, not a range", () => {
    expect(isPin("19")).toBe(true);
    expect(isPin("7.3")).toBe(true);
    expect(isPin(">=19")).toBe(false);
    expect(isRange("19")).toBe(false);
    expect(isRange("7.3")).toBe(false);
    expect(isRange("1.2.3")).toBe(false);
  });
});
