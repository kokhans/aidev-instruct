import { describe, expect, it } from "vitest";
import { frontmatterError, parse, removeKey, stringify } from "../src/frontmatter.ts";

describe("parse", () => {
  it("returns the whole text as body without frontmatter", () => {
    expect(parse("# Title\r\n")).toEqual({ data: {}, body: "# Title\n" });
  });

  it("reads scalars, booleans, inline lists and block lists", () => {
    const text = [
      "---",
      "name: x",
      'quoted: "a: b"',
      "single: 'c'",
      "on: true",
      "off: false",
      'inline: ["a", "b"]',
      "block:",
      '  - "one"',
      "  - two",
      "",
      "# a comment",
      "after: y",
      "---",
      "# Body",
    ].join("\r\n");
    expect(parse(text)).toEqual({
      data: {
        name: "x",
        quoted: "a: b",
        single: "c",
        on: true,
        off: false,
        inline: ["a", "b"],
        block: ["one", "two"],
        after: "y",
      },
      body: "# Body",
    });
  });

  it("reads a quoted colon, a multi-line value and a flow map as YAML", () => {
    const text = [
      "---",
      'description: "Use this: that"',
      "multiline: |",
      "  line one",
      "  line two",
      "globs: [a, b]",
      "---",
      "# Body",
    ].join("\n");
    expect(parse(text).data).toEqual({
      description: "Use this: that",
      multiline: "line one\nline two\n",
      globs: ["a", "b"],
    });
  });

  it("turns a scalar number into its string form and keeps a list of numbers as strings", () => {
    expect(parse("---\nversion: 19\n---\n").data).toEqual({ version: "19" });
    expect(parse('---\nversion: "19"\n---\n').data).toEqual({ version: "19" });
    expect(parse("---\nglobs: [1, 2]\n---\n").data).toEqual({ globs: ["1", "2"] });
  });

  it("reads an empty value as an empty list and an empty document as no data", () => {
    expect(parse("---\nglobs:\n---\n").data).toEqual({ globs: [] });
    expect(parse("---\n\n---\n# Body\n")).toEqual({ data: {}, body: "# Body\n" });
  });

  it("rejects values the frontmatter cannot hold", () => {
    expect(() => parse("---\nglobs: [[a]]\n---\n")).toThrow(/"globs" must be a list of strings/);
    expect(() => parse("---\nglobs:\n  - [a]\n---\n")).toThrow(/"globs" must be a list of strings/);
    expect(() => parse("---\nnested:\n  a: b\n---\n")).toThrow(/"nested" must be a string/);
  });

  it("rejects malformed YAML, duplicate keys and a top-level list", () => {
    expect(() => parse("---\ndescription: [unclosed\n---\n")).toThrow(/Flow sequence/);
    expect(() => parse("---\na: 1\na: 2\n---\n")).toThrow(/Map keys must be unique/);
    expect(() => parse("---\n- a\n- b\n---\n")).toThrow(/frontmatter must be a map/);
  });
});

describe("stringify", () => {
  it("writes block lists, booleans and quotes only where YAML needs them", () => {
    expect(
      stringify(
        {
          name: "Plain text, (ok) it's/fine",
          description: "Needs: quotes",
          padded: " x",
          on: false,
          list: ["a"],
          globs: ["**/*.tsx"],
          missing: undefined,
        },
        "\n\n# Body\n",
      ),
    ).toBe(
      [
        "---",
        "name: Plain text, (ok) it's/fine",
        'description: "Needs: quotes"',
        'padded: " x"',
        "on: false",
        "list:",
        "  - a",
        "globs:",
        '  - "**/*.tsx"',
        "---",
        "",
        "# Body",
        "",
      ].join("\n"),
    );
  });

  it("keeps a long description and a list of strings on one line", () => {
    const long = "A description with more than eighty characters keeps going on one single line.";
    const out = stringify({ description: long, globs: ["a", "b"] }, "# Body\n");
    expect(out).toBe(`---\ndescription: ${long}\nglobs:\n  - a\n  - b\n---\n\n# Body\n`);
  });

  it("returns only the body when there is no data", () => {
    expect(stringify({ paths: undefined }, "\n# Body\n")).toBe("# Body\n");
  });

  it("round-trips every field a pack item holds", () => {
    const data = {
      name: "x",
      description: "a: b",
      globs: ["**/*.tsx", "**/*.jsx"],
      with: ["db"],
      version: "19",
      tools: ["Read", "Grep"],
      readonly: true,
    };
    expect(parse(stringify(data, "# Body\n")).data).toEqual(data);
  });
});

describe("removeKey", () => {
  it("removes a scalar or block list key and keeps the rest", () => {
    expect(removeKey('---\nname: a\nwith: ["db"]\nb: 1\n---\n# A\n', "with")).toBe(
      "---\nname: a\nb: 1\n---\n# A\n",
    );
    expect(removeKey("---\nwith:\n  - db\n  - api\nname: a\n---\n# A\n", "with")).toBe(
      "---\nname: a\n---\n# A\n",
    );
  });

  it("keeps comments and the other lines", () => {
    const source = [
      "---",
      "# Keep me",
      "name: a",
      "with:",
      "  - db",
      "after: b",
      "---",
      "# A",
    ].join("\n");
    expect(removeKey(source, "with")).toBe(
      ["---", "# Keep me", "name: a", "after: b", "---", "# A"].join("\n"),
    );
  });

  it("returns text unchanged without frontmatter or without the key", () => {
    expect(removeKey("# A\r\n", "with")).toBe("# A\n");
    expect(removeKey("---\nname: a\n---\n# A\n", "with")).toBe("---\nname: a\n---\n# A\n");
  });
});

describe("frontmatterError", () => {
  it("names the first YAML error and accepts text without frontmatter", () => {
    expect(frontmatterError("---\ndescription: [unclosed\n---\n")).toMatch(/Flow sequence/);
    expect(frontmatterError("# A\n")).toBeUndefined();
    expect(frontmatterError("---\nname: a\n---\n")).toBeUndefined();
  });
});
