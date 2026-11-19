import { styleText } from "node:util";
import type { Action, SyncResult } from "./sync.ts";

/** Where the CLI prints. `stream` is the terminal that decides whether output gets colors. */
export interface IO {
  out: (line: string) => void;
  err: (line: string) => void;
  stream?: NodeJS.WriteStream;
}

/**
 * Styles text with `styleText`, which leaves it plain when the stream is not a terminal or
 * `NO_COLOR` is set. Without a stream, as in tests and scripts, the text stays plain.
 */
export function style(io: IO, format: Parameters<typeof styleText>[0], text: string): string {
  return io.stream ? styleText(format, text, { stream: io.stream }) : text;
}

/** Shows commands in backticks in cyan without the backticks, or the note as written. */
export function noteText(io: IO, note: string): string {
  if (style(io, "cyan", "x") === "x") return note;
  return note.replace(/`([^`]+)`/g, (_, command: string) => style(io, "cyan", command));
}

/** Prints text and returns the success exit code. */
export function print(io: IO, text: string): number {
  io.out(text);
  return 0;
}

/** Prints an error and returns the failure exit code. */
export function fail(io: IO, message: string): number {
  io.err(message);
  return 1;
}

/** One line for a file action. */
export function describe(action: Action): string {
  return `${action.kind.padEnd(6)}  ${action.path}${explain(action)}`;
}

/** Explains a skipped file, or names the backup of a file changed by hand. */
export function explain(action: Action): string {
  if (action.kind !== "skip")
    return action.orig ? `  (your version saved as ${action.path}.orig)` : "";
  const reasons = {
    modified: "changed by hand, use --orig to keep a copy or --force to overwrite",
    unmanaged: "file exists and is not managed, use --orig or --force",
    "orig-exists": `resolve ${action.path}.orig first`,
  };
  return `  (${reasons[action.reason]})`;
}

/** Prints file changes and notices. */
export function report(io: IO, { actions, notices }: SyncResult, dryRun = false) {
  const changed = actions.filter((action) => action.kind !== "unchanged");
  for (const action of changed) io.out(describe(action));
  const prefix = dryRun ? "Dry run: " : "";
  io.out(
    changed.length
      ? `${prefix}${changed.length} change(s), ${actions.length - changed.length} file(s) up to date.`
      : `${prefix}Everything is up to date.`,
  );
  for (const notice of notices) io.out(`Note: ${notice}`);
}
