/** An environment variable the CLI reads, and how it is read. */
export interface EnvVar {
  /** The name, as a page writes it. The token variable is named by `tokenEnv` in the config. */
  name: string;
  /** Commands that read it. */
  readBy: string;
  does: string;
}

/** Every environment variable the CLI reads. The order is the order the docs show. */
export const ENV_VARS: readonly EnvVar[] = [
  {
    name: "`NO_COLOR`",
    readBy: "Every command",
    does: "Turns color off when set, whatever its value",
  },
  {
    name: "`FORCE_COLOR`",
    readBy: "Every command",
    does: "Turns color on when the output is not a terminal",
  },
  {
    name: "`AIDEV_INSTRUCT_CACHE`",
    readBy: "Every command that reads a feed",
    does: "The cache root for downloaded releases, default `~/.cache/aidev-instruct`",
  },
  {
    name: "The variable named by `tokenEnv`",
    readBy: "`feeds add` and every command that reads a feed",
    does: "The GitHub token for a private feed",
  },
];
