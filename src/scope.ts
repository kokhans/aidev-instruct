/**
 * Where a pack applies in a project. `null` means the whole project. A list holds folders
 * relative to the project root, written with forward slashes and no trailing slash.
 */
export type Scope = string[] | null;

/** Cleans a folder from the config: forward slashes, no `./`, no leading or trailing slash. */
export function normalizePath(path: string): string {
  const slashed = path.replace(/\\/g, "/");
  if (slashed.startsWith("/") || /^[a-zA-Z]:/.test(slashed)) {
    throw new Error(`Path "${path}" must stay inside the project.`);
  }
  const clean = slashed
    .split("/")
    .filter((part) => part !== "" && part !== ".")
    .join("/");
  if (clean.split("/").includes(".."))
    throw new Error(`Path "${path}" must stay inside the project.`);
  return clean;
}

/** Returns the folder scope of a list of paths, or the whole project when it is empty. */
export function scopeOf(paths: string[] | undefined): Scope {
  const clean = [...new Set((paths ?? []).map(normalizePath).filter(Boolean))];
  return clean.length ? clean : null;
}

/** True when `path` is `folder` or inside it. */
function within(path: string, folder: string): boolean {
  return path === folder || path.startsWith(`${folder}/`);
}

/** Drops folders already covered by another folder in the list, and sorts the rest. */
function simplify(paths: string[]): string[] {
  const unique = [...new Set(paths)];
  return unique.filter((p) => !unique.some((q) => q !== p && within(p, q))).sort();
}

/** Where either scope applies. */
export function union(a: Scope, b: Scope): Scope {
  if (a === null || b === null) return null;
  return simplify([...a, ...b]);
}

/** Where both scopes apply. An empty list means nowhere. */
export function intersect(a: Scope, b: Scope): Scope {
  if (a === null) return b;
  if (b === null) return a;
  const paths: string[] = [];
  for (const p of a) {
    for (const q of b) {
      if (within(p, q)) paths.push(p);
      else if (within(q, p)) paths.push(q);
    }
  }
  return simplify(paths);
}

/**
 * Prefixes globs with each folder of a scope. Without globs, the result covers every file in
 * the folders. The whole project keeps the globs unchanged.
 */
export function scopeGlobs(globs: string[], scope: Scope): string[] {
  if (scope === null) return globs;
  const patterns = globs.length ? globs : ["**"];
  return scope.flatMap((folder) =>
    patterns.map((glob) => `${folder}/${glob.replace(/^\.?\//, "")}`),
  );
}

/** True when `outer` applies everywhere `inner` applies. */
export function covers(outer: Scope, inner: Scope): boolean {
  if (outer === null) return true;
  if (inner === null) return false;
  return inner.every((p) => outer.some((q) => within(p, q)));
}

/** True when two scopes share at least one folder. */
export function overlaps(a: Scope, b: Scope): boolean {
  const shared = intersect(a, b);
  return shared === null || shared.length > 0;
}

/** Names a scope in a message. */
export function describeScope(scope: Scope): string {
  return scope === null ? "the whole project" : scope.join(", ");
}
