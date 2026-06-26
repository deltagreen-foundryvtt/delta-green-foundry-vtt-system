import { describe, expect, test } from "@jest/globals";
import fs from "node:fs";

import StatblockParser from "../../module/macros/stat-block-parser.js";

describe("StatblockParser", () => {
  const readStatblock = (name) =>
    fs.readFileSync(`${__dirname}/statblocks/${name}.txt`, "utf8");

  describe("new", () => {
    test("tokenizing a basic stat block", () => {
      const parser = new StatblockParser(readStatblock("basic-stats"));
      expect(parser.tokens.length).toBeGreaterThan(0);
      console.log(parser.tokens);
    });
  });
});
