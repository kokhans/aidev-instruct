import { parseDocument, parse as parseYaml, stringify as stringifyYaml } from "yaml";

export type FrontmatterValue = string | boolean | string[];

export interface Document {
  data: Record<string, FrontmatterValue>;
  body: string;
}

const FENCE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

/** The YAML text between the `---` fences, or `undefined` when the file has no frontmatter. */
function fenced(source: string): string | undefined {
  return FENCE.exec(source)?.[1];
}

/** Turns one parsed YAML value into a frontmatter value, coercing numbers to strings. */
function toValue(key: string, value: unknown): FrontmatterValue {
  if (typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number" || typeof value === "bigint") return String(value);
  if (value === null) return [];
  if (Array.isArray(value)) {
    return value.map((item) => {
      if (typeof item === "string") return item;
      if (typeof item === "number" || typeof item === "bigint") return String(item);
      throw new Error(`"${key}" must be a list of strings`);
    });
  }
  throw new Error(`"${key}" must be a string, a boolean or a list of strings`);
}

/** Parses the frontmatter, which holds a top-level map, and returns it with the body. */
export function parse(source: string): Document {
  const text = source.replace(/\r\n/g, "\n");
  const match = FENCE.exec(text);
  if (!match) return { data: {}, body: text };

  let value: unknown;
  try {
    value = parseYaml(match[1] as string);
  } catch (error) {
    throw new Error((error as Error).message.split("\n")[0]);
  }
  const body = text.slice(match[0].length);
  if (value === null || value === undefined) return { data: {}, body };
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new Error("frontmatter must be a map");
  }
  const data: Record<string, FrontmatterValue> = {};
  for (const [key, item] of Object.entries(value)) data[key] = toValue(key, item);
  return { data, body };
}

/** Writes frontmatter with block lists and quotes where YAML needs them. */
export function stringify(
  data: Record<string, FrontmatterValue | undefined>,
  body: string,
): string {
  const fields: Record<string, FrontmatterValue> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) fields[key] = value;
  }
  const text = body.replace(/^\n+/, "");
  if (!Object.keys(fields).length) return text;
  const yaml = stringifyYaml(fields, { lineWidth: 0 }).trimEnd();
  return `---\n${yaml}\n---\n\n${text}`;
}

/**
 * Removes one key from the frontmatter of a file that is otherwise copied unchanged. Comments
 * and the other keys keep their text. Text without frontmatter or without the key is returned
 * as is.
 */
export function removeKey(source: string, key: string): string {
  const text = source.replace(/\r\n/g, "\n");
  const match = FENCE.exec(text);
  if (!match) return text;
  const doc = parseDocument(match[1] as string);
  if (!doc.has(key)) return text;
  doc.delete(key);
  return `---\n${doc.toString({ lineWidth: 0 })}---\n${text.slice(match[0].length)}`;
}

/** The first error a strict YAML parser reports for the frontmatter, or nothing when it parses. */
export function frontmatterError(source: string): string | undefined {
  const yaml = fenced(source.replace(/\r\n/g, "\n"));
  if (yaml === undefined) return undefined;
  return parseDocument(yaml).errors[0]?.message.split("\n")[0];
}
