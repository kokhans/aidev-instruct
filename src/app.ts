import { readFileSync } from "node:fs";
import { Command, CommanderError } from "commander";
import { add } from "./commands/add.ts";
import { check } from "./commands/check.ts";
import { clean } from "./commands/clean.ts";
import { doctor } from "./commands/doctor.ts";
import { feed } from "./commands/feed.ts";
import { feeds } from "./commands/feeds.ts";
import { info } from "./commands/info.ts";
import { init } from "./commands/init.ts";
import { list } from "./commands/list.ts";
import { remove } from "./commands/remove.ts";
import { changeStacks, listStacks } from "./commands/stacks.ts";
import { status } from "./commands/status.ts";
import { changeTargets, listTargets } from "./commands/targets.ts";
import { update } from "./commands/update.ts";
import type { IO } from "./output.ts";
import { fail } from "./output.ts";
import { type Context, type Options, optionsOf } from "./session.ts";
import { DEFAULT_TARGETS } from "./targets.ts";
import { splitList } from "./util.ts";

/** The CLI version and the Node range, read from `package.json`. */
const MANIFEST = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as {
  version: string;
  engines?: { node?: string };
};
export const VERSION = MANIFEST.version;
export const NODE_RANGE = MANIFEST.engines?.node as string;

export type { IO } from "./output.ts";
export type { Context } from "./session.ts";

/** The exit code of the last command that ran. Commander actions return nothing. */
export interface RunState {
  code: number;
}

/**
 * Builds the program. Every command defines its own options; the common ones also sit on the
 * program, so `aidev-instruct --dir x init` and `aidev-instruct init --dir x` both work.
 */
export function createProgram(io: IO, context: Context = {}, state: RunState = { code: 0 }) {
  const program = new Command();
  program
    .name("aidev-instruct")
    .description("Rules, skills and agents for AI coding tools, installed per tech stack.")
    .version(VERSION, "-v, --version", "Show version")
    .allowExcessArguments(true)
    .enablePositionalOptions()
    .configureOutput({
      writeOut: (text) => io.out(text.replace(/\n$/, "")),
      writeErr: (text) => io.err(text.replace(/\n$/, "")),
    });
  common(program);

  /** Runs a command, printing the project line first when `announce` is set. */
  const perform = (
    command: Command,
    task: (options: Options, args: string[]) => Promise<number> | number,
    announce = true,
  ) =>
    command.action(async (...values: unknown[]) => {
      const args = values.slice(0, -2).flat() as string[];
      const options = optionsOf(command.optsWithGlobals(), context);
      if (announce) io.out(`Project: ${options.root}\n`);
      state.code = await task(options, args);
    });

  program.action((_, command: Command) => {
    const [name] = command.args;
    if (name === undefined) program.outputHelp();
    else state.code = fail(io, `error: unknown command '${name}'`);
  });

  const listCmd = program.command("list").description("Show available packs");
  common(listCmd);
  perform(listCmd, (options) => list(io, options, VERSION), false);

  const initCmd = program
    .command("init")
    .description("Create the config and install stacks and packs")
    .argument("[pack...]", "packs, which must be passed with -p")
    .option(
      "-t, --targets <list>",
      `Comma-separated targets (default: ${DEFAULT_TARGETS.join(",")})`,
    )
    .option("-s, --stacks <list>", "Comma-separated stacks")
    .option("-p, --packs <list>", "Comma-separated packs, added to the packs of the stacks")
    .option("--path <folder>", "Folder the stacks and packs apply to, repeatable", collectPaths);
  common(initCmd);
  perform(initCmd, (options, args) => init(io, options, args, VERSION));

  const addCmd = program
    .command("add")
    .description("Add packs to the config and install them")
    .argument("[pack...]", "pack names, or name@version")
    .option("--path <folder>", "Folder the packs apply to, repeatable", collectPaths)
    .option("--version <version>", "Technology version of the named packs");
  common(addCmd);
  perform(addCmd, (options, args) => add(io, options, args, VERSION));

  const removeCmd = program
    .command("remove")
    .description("Remove packs from the config and delete their files")
    .argument("[pack...]", "pack names")
    .option("--path <folder>", "Remove only these folders, repeatable", collectPaths);
  common(removeCmd);
  perform(removeCmd, (options, args) => remove(io, options, args, VERSION));

  const stacksCmd = program.command("stacks").description("Show available stacks");
  common(stacksCmd);
  stacksCmd.allowExcessArguments(true);
  stacksCmd.action(async () => {
    const args = stacksCmd.args;
    state.code = args.length
      ? fail(io, 'Use "stacks add <stack...>" or "stacks remove <stack...>".')
      : await listStacks(io, optionsOf(stacksCmd.optsWithGlobals(), context), VERSION);
  });
  const stacksAdd = stacksCmd
    .command("add")
    .description("Add stacks to the config and install them")
    .argument("[stack...]", "stack names")
    .option("--path <folder>", "Folder the stacks apply to, repeatable", collectPaths);
  common(stacksAdd);
  perform(stacksAdd, (options, args) => changeStacks(io, options, "add", args, VERSION));
  const stacksRemove = stacksCmd
    .command("remove")
    .description("Remove stacks from the config")
    .argument("[stack...]", "stack names")
    .option("--path <folder>", "Remove only these folders, repeatable", collectPaths);
  common(stacksRemove);
  perform(stacksRemove, (options, args) => changeStacks(io, options, "remove", args, VERSION));

  const targetsCmd = program.command("targets").description("Show available targets");
  common(targetsCmd);
  targetsCmd.allowExcessArguments(true);
  targetsCmd.action(() => {
    const args = targetsCmd.args;
    state.code = args.length
      ? fail(io, 'Use "targets add <target...>" or "targets remove <target...>".')
      : listTargets(io, optionsOf(targetsCmd.optsWithGlobals(), context));
  });
  const targetsAdd = targetsCmd
    .command("add")
    .description("Write files for more targets")
    .argument("[target...]", "target names");
  common(targetsAdd);
  perform(targetsAdd, (options, args) => changeTargets(io, options, "add", args, VERSION));
  const targetsRemove = targetsCmd
    .command("remove")
    .description("Stop writing files for targets")
    .argument("[target...]", "target names");
  common(targetsRemove);
  perform(targetsRemove, (options, args) => changeTargets(io, options, "remove", args, VERSION));

  const updateCmd = program
    .command("update")
    .description("Install what the config lists with this version");
  common(updateCmd);
  perform(updateCmd, (options) => update(io, options, VERSION));

  const statusCmd = program
    .command("status")
    .description("Show what is installed and what is pending");
  common(statusCmd);
  perform(statusCmd, (options) => status(io, options, VERSION));

  const checkCmd = program
    .command("check")
    .description("Show what update would change, exit 1 when it would");
  common(checkCmd);
  perform(checkCmd, (options) => check(io, options, VERSION));

  const cleanCmd = program
    .command("clean")
    .description("Delete every file the CLI wrote, keep the config");
  common(cleanCmd);
  perform(cleanCmd, (options) => clean(io, options, VERSION));

  const feedsCmd = program.command("feeds").description("Show the feeds in the config");
  common(feedsCmd);
  feedsCmd.allowExcessArguments(true);
  feedsCmd.action(async () => {
    state.code = await feeds(
      io,
      optionsOf(feedsCmd.optsWithGlobals(), context),
      feedsCmd.args,
      VERSION,
    );
  });
  const feedAdd = feedsCmd
    .command("add")
    .description("Add a feed or change its source or token variable")
    .argument("[name]", "feed name")
    .argument("[source]", "github:<owner>/<repo> or a folder path")
    .option("--tokenEnv <variable>", "Variable that holds the feed token");
  common(feedAdd);
  perform(feedAdd, (options, args) => feeds(io, options, ["add", ...args], VERSION));
  const feedRemove = feedsCmd
    .command("remove")
    .description("Remove a feed no pack or stack uses")
    .argument("[name]", "feed name");
  common(feedRemove);
  perform(feedRemove, (options, args) => feeds(io, options, ["remove", ...args], VERSION));

  const feedCmd = program.command("feed").description("Create, check and release a private feed");
  common(feedCmd);
  feedCmd.allowExcessArguments(true);
  perform(feedCmd, (options, args) => feed(io, options, args, VERSION));
  const feedInit = feedCmd
    .command("init")
    .description("Create a feed repository layout")
    .argument("[name]", "feed name");
  common(feedInit);
  perform(feedInit, (options, args) => feed(io, options, ["init", ...args], VERSION));
  const feedValidate = feedCmd
    .command("validate")
    .description("Check a feed's manifest, packs and stacks")
    .argument("[name...]", "no names: the current folder is the feed");
  common(feedValidate);
  perform(feedValidate, (options, args) => feed(io, options, ["validate", ...args], VERSION));
  const feedRelease = feedCmd
    .command("release")
    .description("Bump the feed's packs and tag a release")
    .argument("[name...]", "no names: the current folder is the feed")
    .option("--bump <name>=<kind>", "Raise a release bump", collect);
  common(feedRelease);
  perform(feedRelease, (options, args) => feed(io, options, ["release", ...args], VERSION));

  const infoCmd = program
    .command("info")
    .description("Show one pack or stack from every feed")
    .argument("[name]", "pack or stack name");
  common(infoCmd);
  perform(infoCmd, (options, args) => info(io, options, args, VERSION));

  const doctorCmd = program
    .command("doctor")
    .description("Check Node, the config, feeds, the cache and the lock")
    .argument("[name...]", "no names");
  common(doctorCmd);
  perform(doctorCmd, (options, args) => doctor(io, options, args, NODE_RANGE, VERSION));

  for (const command of all(program)) {
    command.exitOverride();
    if (command === program) continue;
    const takesLongVersion = command.options.some((option) => option.long === "--version");
    if (takesLongVersion) command.version(VERSION, "-v", "Show version");
    else command.version(VERSION, "-v, --version", "Show version");
  }
  return program;
}

/** Adds the options every command accepts, in either position on the command line. */
function common(command: Command) {
  command
    .option("--dir <path>", "Project folder (default: current folder)")
    .option("--orig", "Save files changed by hand as <file>.orig and write the new version")
    .option("--force", "Overwrite or delete files changed by hand")
    .option("--dry-run", "Show what would change without writing");
}

/** Collects a repeatable option into a list. */
function collect(value: string, previous: string[] | undefined): string[] {
  return [...(previous ?? []), value];
}

/** Collects `--path`, which may repeat and may hold a comma-separated list. */
function collectPaths(value: string, previous: string[] | undefined): string[] {
  return [...(previous ?? []), ...splitList(value)];
}

/** The program and every command below it, depth first. */
export function all(command: Command): Command[] {
  return [command, ...command.commands.flatMap((child) => all(child))];
}

/** Runs one command and returns the exit code. Errors are printed, never thrown. */
export async function run(argv: string[], io: IO, context: Context = {}): Promise<number> {
  const state: RunState = { code: 0 };
  try {
    await createProgram(io, context, state).parseAsync(argv, { from: "user" });
    return state.code;
  } catch (error) {
    if (error instanceof CommanderError) return error.exitCode;
    io.err((error as Error).message);
    return 1;
  }
}
