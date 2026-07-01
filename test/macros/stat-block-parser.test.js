import { describe, expect, test } from "@jest/globals";
import fs from "node:fs";

import {
  StatblockParser,
  ExtractAttributes,
  tokenize,
} from "../../module/macros/stat-block-parser.js";

describe("StatblockParser", () => {
  const readStatblock = (name) =>
    fs.readFileSync(`${__dirname}/statblocks/${name}.txt`, "utf8");

  describe("new", () => {
    test("tokenizing a basic stat block", () => {
      const parser = new StatblockParser(readStatblock("basic-stats"));
      expect(parser.tokens.length).toBeGreaterThan(0);
    });
  });
});

describe("ExtractAttributes", () => {
  const validAttributes =
    "STR 10 con 10 Dex 13 Int 10 pOW 14 ChA 10\n\nHp 10 wp 14\n\t\nsaN 10\nSKILLS:";
  const invalidAttributes = "Bear 10 Criminal 2 STr 10 con 11 Int 10";
  const incompleteAttributes = "Str 10 con 10 Dex 10 10 Int";

  test("extracting valid attributes", () => {
    const [result, rest] = ExtractAttributes(tokenize(validAttributes));
    expect(rest).toEqual(["SKILLS:"]);
    expect(result).toEqual({
      str: 10,
      dex: 13,
      con: 10,
      int: 10,
      pow: 14,
      cha: 10,
      hp: 10,
      wp: 14,
      san: 10,
    });
  });

  test("extracting invalid attributes", () => {
    const tokens = tokenize(invalidAttributes);
    const [result, rest] = ExtractAttributes(tokens);
    expect(rest).toEqual(tokens);
    expect(result).toEqual({ incomplete: true });
  });

  test("extracting incomplete attributes", () => {
    const [result, rest] = ExtractAttributes(tokenize(incompleteAttributes));
    expect(rest).toEqual(["10", "Int"]);
    expect(result).toEqual({
      str: 10,
      con: 10,
      dex: 10,
      incomplete: true,
    });
  });
});
