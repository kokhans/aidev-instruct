import { compare, inc, satisfies as inRange, parse, type SemVer, valid, validRange } from "semver";

/** A parsed semantic version. Prerelease text is kept as written. */
export interface Version {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
}

/** A bare technology version such as `19` or `7.3`: a pin, never a range. */
const PIN = /^\d+(\.\d+)*$/;

/** A version as the CLI writes one: exactly three numbers, an optional prerelease and build. */
const STRICT = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

/** One clause of a range. An operator needs a version; `x` and `*` stand alone. */
const CLAUSES = [
  /^[<>=^~]+\d+(?:\.(?:\d+|x|X|\*)){0,2}(?:-[0-9A-Za-z.-]+)?$/,
  /^\d+(?:\.(?:\d+|x|X|\*)){0,2}(?:-[0-9A-Za-z.-]+)?$/,
  /^[xX*]$/,
  /^-$/,
  /^\|\|$/,
];

/** Parses `1.2.3` or `1.2.3-rc.1`, or returns undefined when the text is not a version. */
export function parseVersion(text: string): Version | undefined {
  const trimmed = text.trim();
  if (!STRICT.test(trimmed)) return undefined;
  const parsed = parse(trimmed) as SemVer;
  return {
    major: parsed.major,
    minor: parsed.minor,
    patch: parsed.patch,
    ...(parsed.prerelease.length ? { prerelease: parsed.prerelease.join(".") } : {}),
  };
}

/** True when the text is a semantic version. */
export function isSemver(text: string): boolean {
  return parseVersion(text) !== undefined;
}

/** True when the text is a bare technology version, which is a pin and not a range. */
export function isPin(text: string): boolean {
  return PIN.test(text.trim());
}

/** Pads a technology version such as `19` or `7.3` to `19.0.0` or `7.3.0`. */
function padded(version: string): string {
  const text = version.trim();
  return PIN.test(text) ? `${text}${".0".repeat(3 - text.split(".").length)}` : text;
}

/** Compares two versions. A prerelease sorts before its release. */
export function compareVersions(a: string, b: string): number {
  const left = parse(a.trim());
  const right = parse(b.trim());
  if (!left || !right) throw new Error(`Cannot compare "${a}" with "${b}"`);
  return compare(left, right);
}

/** The kind of change between two versions: `major`, `minor`, `patch` or `none`. */
export type Kind = "major" | "minor" | "patch" | "none";

/** Names the largest part that changed between two versions. */
export function changeKind(from: string, to: string): Kind {
  const left = parseVersion(from);
  const right = parseVersion(to);
  if (!left || !right) return "none";
  if (left.major !== right.major) return "major";
  if (left.minor !== right.minor) return "minor";
  if (left.patch !== right.patch || left.prerelease !== right.prerelease) return "patch";
  return "none";
}

/** Raises a version by one part. A release drops the prerelease text. */
export function bumpVersion(version: string, kind: Kind): string {
  if (kind === "none") return version;
  return inc(isSemver(version) ? version : "0.0.0", kind) as string;
}

/** The larger of two kinds, so a list of changes gives its largest bump. */
export function largest(a: Kind, b: Kind): Kind {
  const order: Kind[] = ["none", "patch", "minor", "major"];
  return order.indexOf(a) >= order.indexOf(b) ? a : b;
}

/** True when every clause of the range has the shape the CLI accepts. */
function clausesAllowed(range: string): boolean {
  return range.split(/\s+/).every((clause) => CLAUSES.some((pattern) => pattern.test(clause)));
}

/** True when a version satisfies a range such as `>=0.8.0`, `^1.2.3` or `>=0.8.0 <1`. */
export function satisfies(version: string, range: string): boolean {
  const wanted = padded(version);
  if (valid(wanted) === null) return false;
  const text = range.trim();
  if (!text || !clausesAllowed(text)) return false;
  const allowed = validRange(text);
  return allowed !== null && inRange(wanted, allowed);
}

/**
 * True when the text is a range the CLI understands, from `*` to `||`, hyphen ranges and `x`.
 * A bare version such as `19`, `7.3` or `1.2.3` is a pin, not a range.
 */
export function isRange(range: string): boolean {
  const text = range.trim();
  if (!text || isPin(text) || valid(text) !== null) return false;
  return clausesAllowed(text) && validRange(text) !== null;
}
