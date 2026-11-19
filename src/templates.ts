import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import Mustache from "mustache";

/** The tags the templates use. `{{ }}` stays literal, as in GitHub Actions expressions. */
export const TAGS: [string, string] = ["<%", "%>"];

/**
 * Renders a template from `src/templates/`, or from `dist/templates/` in the packed CLI.
 * Markdown and YAML are not HTML-escaped.
 */
export function renderTemplate(name: string, view: object): string {
  const path = fileURLToPath(new URL(`templates/${name}`, import.meta.url));
  let template: string;
  try {
    template = readFileSync(path, "utf8").replace(/\r\n/g, "\n");
  } catch {
    throw new Error(`Template ${path} is missing. Templates ship next to the CLI.`);
  }
  return Mustache.render(template, view, undefined, {
    tags: TAGS,
    escape: (text: string) => text,
  });
}
