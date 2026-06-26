const SKILL_SECTION = "skills";
const ATTACKS_SECTION = "attacks";
const SECTION_BEGINNING = ":";
const ENTRY_END = ".";

export const States = {
  BeginStatblock: "begin-statblock",
  EndStatblock: "end-statblock",
  AttributePair: "attribute-pair",
  SkillPair: "skill-pair",
  Attack: "attack",
};

class StatblockParser {
  constructor(stream) {
    this.state = States.BeginStatblock;
    this.tokens = stream.split(/\s+/);
  }
}

export default StatblockParser;
