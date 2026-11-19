import { mkdirSync, type Stats } from "node:fs";
import { Readable } from "node:stream";
import { type ReadEntry, x } from "tar";
import { walk } from "./fs.ts";

/** True for a path that would leave the target folder or point at another disk. */
function escapes(path: string): boolean {
  const clean = path.replace(/\\/g, "/");
  return clean.startsWith("/") || /^[a-zA-Z]:/.test(clean) || clean.split("/").includes("..");
}

/**
 * Extracts a gzipped tarball into `dir` and returns the files it wrote, relative to `dir`.
 * Only regular files and directories are written: absolute paths, any `..` and links are
 * skipped, so an archive can never write outside `dir`. `strip` drops the leading folders,
 * which is how a GitHub release tarball loses its `<owner>-<repo>-<sha>/` folder.
 */
export async function extractTarGz(archive: Buffer, dir: string, strip = 1): Promise<string[]> {
  if (!archive.length) return [];
  mkdirSync(dir, { recursive: true });
  const filter = (path: string, entry: ReadEntry | Stats): boolean => {
    const { type } = entry as ReadEntry;
    return (type === "File" || type === "Directory") && !escapes(path);
  };
  const parser = x({ cwd: dir, strip, gzip: true, filter });
  await new Promise<void>((resolve, reject) => {
    parser.on("end", resolve);
    parser.on("error", reject);
    Readable.from(archive).pipe(parser);
  });
  return walk(dir);
}
