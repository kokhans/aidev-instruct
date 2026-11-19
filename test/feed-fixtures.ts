import { gzipSync } from "node:zlib";

/** One tar entry. `type` 0 is a file, 5 a directory, L a long name, x a pax header, 2 a symlink. */
export function tarEntry(
  name: string,
  content: string,
  options: { type?: string; prefix?: string; linkname?: string } = {},
): Buffer {
  const body = Buffer.from(content);
  const header = Buffer.alloc(512);
  header.write(name, 0, 100);
  header.write("0000644\0", 100, 8);
  header.write("0000000\0", 108, 8);
  header.write("0000000\0", 116, 8);
  header.write(`${body.length.toString(8).padStart(11, "0")}\0`, 124, 12);
  header.write("00000000000\0", 136, 12);
  header.write("        ", 148, 8);
  header.write(options.type ?? "0", 156, 1);
  if (options.linkname) header.write(options.linkname, 157, 100);
  header.write("ustar", 257, 5);
  header.write("00", 263, 2);
  if (options.prefix) header.write(options.prefix, 345, 155);
  let sum = 0;
  for (const byte of header) sum += byte;
  header.write(`${sum.toString(8).padStart(6, "0")}\0 `, 148, 8);
  return Buffer.concat([header, body, Buffer.alloc((512 - (body.length % 512)) % 512)]);
}

/** One pax record: a length, a space, `key=value` and a newline, with the length included. */
export function paxRecord(key: string, value: string): string {
  const data = `${key}=${value}\n`;
  let length = data.length + 2;
  let record = `${length} ${data}`;
  while (record.length !== length) {
    length = record.length;
    record = `${length} ${data}`;
  }
  return record;
}

/** A gzipped tar archive of the entries. */
export const tarGz = (...entries: Buffer[]) =>
  gzipSync(Buffer.concat([...entries, Buffer.alloc(1024)]));

/** A feed repository as a GitHub tarball, with the `owner-repo-sha` first folder. */
export function feedArchive(
  files: Record<string, string>,
  prefix = "acme-aidev-instruct-abc123",
): Buffer {
  return tarGz(
    ...Object.entries(files).map(([path, content]) => tarEntry(`${prefix}/${path}`, content)),
    tarEntry("", "", { type: "5" }),
  );
}

/** A pack manifest for a feed. */
export const manifestJson = (name: string, extra: Record<string, unknown> = {}) =>
  JSON.stringify({ name, description: `${name} pack.`, version: "1.0.0", ...extra });

/** A GitHub feed answered by a fake fetch. */
export function githubFetch(options: {
  tag?: string;
  commit?: string;
  archive?: Buffer;
  status?: number;
  down?: boolean;
}) {
  const calls: { url: string; headers?: Record<string, string> }[] = [];
  const fn = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, headers: init?.headers as Record<string, string> | undefined });
    if (options.down) throw new Error("offline");
    if (options.status) return new Response("error", { status: options.status });
    if (url.endsWith("/releases/latest")) {
      return new Response(JSON.stringify({ tag_name: options.tag }), { status: 200 });
    }
    if (url.includes("/commits/")) {
      return new Response(JSON.stringify({ sha: options.commit }), { status: 200 });
    }
    if (url.includes("/tarball/")) {
      return new Response(null, {
        status: 302,
        headers: { location: "https://codeload.test/archive" },
      });
    }
    if (url === "https://codeload.test/archive") {
      return new Response(options.archive ?? Buffer.from(""), { status: 200 });
    }
    return new Response("not found", { status: 404 });
  }) as unknown as typeof fetch;
  return { fn, calls };
}
