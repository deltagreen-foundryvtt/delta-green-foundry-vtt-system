import { showDgDialog } from "../applications/dg-dialog.js";
import { ParseStatBlock } from "./stat-block-parser.js";

const NPC_ATTRIBUTES = ["hp", "san", "wp"];
const NPC = "npc";
const UNNATURAL = "unnatural";
const NPCLIKE = [NPC, UNNATURAL];

/**
 * Defines the list of skills within Delta Green.
 *
 * Definitions:
 * - Label:
 *    The label that is displayed (and localized) to the end user
 * - key:
 *    The key that is used to assign the skill on the character sheet
 * - typed:
 *    Included on skills broader skills that have additional context, such
 *    as Art, Craft or Science.
 * - npcOnly:
 *    Included on skils that are not available to Agents (i.e. Flying)
 * - alternativeSpellings:
 *    A list of one or more alternative ways the label could be spelled, such as
 *    regional spellings (Archeology vs Archaeology). __NOTE__: For compound words
 *    (i.e. Unarmed Combat, Melee Weapons) this list should include a lowercase spelling
 *    of that ability (i.e. "unarmed combat")
 *
 * The skill map is structured as follows:
 *
 * ```{
 *  Label or "Compound Label": {
 *    key: string (required)
 *    alternativeSpellings: List<String> (optional)
 *    typed: boolean (optional)
 *    npcOnly: boolean (optional)
 *  }
 * }
 *
 * */
const SKILL_MAP = {
  Accounting: {
    key: "accounting",
  },
  Alertness: {
    key: "alertness",
  },
  Anthropology: {
    key: "anthropology",
  },
  Archeology: {
    key: "archeology",
    alternativeSpellings: ["archaeology"],
  },
  Art: {
    key: "art",
    typed: true,
  },
  Artillery: {
    key: "artillery",
  },
  Athletics: {
    key: "athletics",
  },
  Bureaucracy: {
    key: "bureaucracy",
  },
  Craft: {
    key: "craft",
    typed: true,
  },
  "Computer Science": {
    key: "computer_science",
    alternativeSpellings: ["computer science"],
  },
  Criminology: {
    key: "criminology",
  },
  Demolitions: {
    key: "demolitions",
  },
  Disguise: {
    key: "disguise",
  },
  Dodge: {
    key: "dodge",
  },
  Drive: {
    key: "drive",
    alternativeSpellings: ["driving"],
  },
  Firearms: {
    key: "firearms",
  },
  "First Aid": {
    key: "first_aid",
    alternativeSpellings: ["first aid"],
  },
  Flight: {
    key: "flight",
    npcOnly: true,
  },
  "Foreign Language": {
    key: "foreign_langauge",
    alternativeSpellings: ["foreign language"],
    typed: true,
  },
  Forensics: {
    key: "forensics",
  },
  "Heavy Machinery": {
    key: "heavy_machinery",
    alternativeSpellings: ["heavy machinery"],
  },
  "Heavy Weapons": {
    key: "heavy_weapons",
    alternativeSpellings: ["heavy weapons"],
  },
  History: {
    key: "history",
  },
  HUMINT: {
    key: "humint",
  },
  Law: {
    key: "law",
  },
  Medicine: {
    key: "medicine",
  },
  "Melee Weapons": {
    key: "melee_weapons",
    alternativeSpellings: ["melee weapons"],
  },
  "Military Science": {
    key: "military_science",
    alternativeSpellings: ["military science"],
    typed: true,
  },
  "Native Language": {
    key: "native_language",
    alternativeSpellings: ["native language"],
    typed: true,
  },
  Navigate: {
    key: "navigate",
  },
  Occult: {
    key: "occult",
  },
  Persuade: {
    key: "persuade",
  },
  Pilot: {
    key: "pilot",
    typed: true,
  },
  Pharmacy: {
    key: "pharmacy",
  },
  Psychotheraphy: {
    key: "psychotherapy",
  },
  Ride: {
    key: "ride",
  },
  Science: {
    key: "science",
    typed: true,
  },
  SIGINT: {
    key: "sigint",
  },
  Stealth: {
    key: "stealth",
  },
  Surgery: {
    key: "surgery",
  },
  Survival: {
    key: "survival",
  },
  Swim: {
    key: "swim",
  },
  "Unarmed Combat": {
    key: "unarmed_combat",
    alternativeSpellings: ["unarmed combat"],
  },
  Unnatural: {
    key: "unnatural",
  },
};

function findSkillScore({ key, alternativeSpellings }, skills) {
  if (skills[key]) return skills[key];
  if (alternativeSpellings === undefined) return null;

  for (let i = 0; i < alternativeSpellings.length; i++) {
    const alternateName = alternativeSpellings[i];
    if (skills[alternateName]) return skills[alternateName];
  }

  return null;
}

/**
 *
 * @param {Object} skillDefinition - Map containing key (string) and alternativeSpellings (list)
 * @param {Object} skills - Map of character skills
 * @returns List of typed Skill names that match the skill definition
 */
function findRelevantTypedSkills({ key, alternativeSpellings }, skills) {
  return Object.keys(skills).filter((skill) => {
    if (skill.includes(key)) return true;
    return (alternativeSpellings || []).some((altSpelling) =>
      skill.includes(altSpelling),
    );
  });
}

function normalizeTypedSkill(name) {
  name.replace(/\s+/, "_").replace(/\(|\)/, "");
}

function GetNotesFromInput(inputText) {
  const matchStr = "(?:ATTACKS:[\\S\\s]*?\\.\\n)([\\S\\s]*)";
  const re = new RegExp(matchStr, "gi");
  const results = inputText.match(re);
  let notes = "";

  try {
    if (results != null && results.length > 0) {
      let output = "";

      const lines = results[0].split(/\r?\n/);

      for (let i = 0; i < lines.length; i++) {
        output += `${lines[i]}<br>`;
      }

      notes = output;
    }
  } catch (ex) {
    console.log("GetNotesFromInput Error");
    console.log(ex);
  }

  return [notes];
}

async function RegexParseNpcStatBlock(inputStr, actorType) {
  const actorData = {};
  const isNpcLike = NPCLIKE.includes(actorType);
  const statBlock = ParseStatBlock(inputStr);

  actorData.type = actorType;
  actorData.system = {};
  actorData.system.statistics = {};
  actorData.system.skills = {};
  actorData.system.typedSkills = {};
  actorData.system.physical = {};

  actorData.system.health = { value: 10, min: 0, max: 10 };
  actorData.system.wp = { value: 10, min: 0, max: 10 };

  actorData.name = statBlock.name;
  actorData.system.physical = {
    description: "",
  };

  if (!isNpcLike) {
    actorData.system.physical = {
      ...actorData.system.physical,
      wounds: "",
      firstAidAttempted: false,
    };
  }

  const { attributes } = statBlock;
  Object.entries(attributes).forEach(([key, value]) => {
    if (isNpcLike && NPC_ATTRIBUTES.includes(key) === false) {
      actorData.system.statistics[key] = {
        value,
        distinguishing_feature: "",
      };

      return;
    }

    if (key === "hp") {
      actorData.system.health = {
        value,
        min: 0,
        max: value,
      };

      return;
    }

    if (key === "san") {
      actorData.system.sanity = {
        value,
        currentBreakingPoint: attributes.breaking_point,
        max: attributes.pow * 5,
      };

      return;
    }

    if (key === "wp") {
      actorData.system.wp = {
        value,
        min: 0,
        max: attributes.pow,
      };
    }
  });

  const { skills } = statBlock;
  Object.entries(SKILL_MAP).forEach(([label, skillInfo]) => {
    if (skillInfo.npcOnly && !isNpcLike) return;

    const proficiency = findSkillScore(skillInfo, skills);
    if (!proficiency) return;
    if (skillInfo.typed) {
      findRelevantTypedSkills(skillInfo, skills).forEach((skillName) => {
        const typedSkillKey = normalizeTypedSkill(skillName);
        const typedSkillProficiency = findSkillScore(
          { key: skillName },
          skills,
        );
        actorData.system.typedSkills[typedSkillKey] = {
          label: skillName,
          proficiency: typedSkillProficiency,
          failure: false,
        };
      });

      return;
    }

    actorData.system.skills[skillInfo.key] = {
      label,
      proficiency,
      failure: false,
    };
  });

  if (actorType === "npc" || actorType === "unnatural") {
    actorData.system.notes = GetNotesFromInput(inputStr);
  }

  const [newActor] = await Actor.createDocuments([actorData]);
  const { armor, attacks } = statBlock;

  if (armor) {
    await newActor.AddArmorItemToSheet(armor.name, "", armor.value, true);
  }

  (attacks || []).forEach(async (attack) => {
    const { name, skillModifier, damage, armorPiercing, lethality } = attack;
    const [description, attackSkill, killRadius, expense] = [
      "",
      "custom",
      "N/A",
      "N/A",
    ];
    const [range, skillMod] = [0, 0];
    const skillTarget = skillModifier;
    const equipped = true;
    const isLethal = damage === undefined && lethality !== undefined;
    await newActor.AddWeaponItemToSheet(
      name,
      description,
      damage,
      attackSkill,
      skillMod,
      skillTarget,
      armorPiercing,
      lethality,
      isLethal,
      range,
      killRadius,
      expense,
      equipped,
    );
  });

  newActor.sheet.render(true);
}

async function GetUserInput() {
  const content = `<form>
            <div class="form-group">
                <label>Output Actor Type: </label>
                <div class="form-fields">
                    <select name="actor-type">
                        <option value="npc" selected>NPC</option>
                        <option value="unnatural">Unnatural</option>
                        <option value="agent">Agent</option>
                    </select>
                </div>
            </div>
            <br>
            <label>Stat Block Text (English Only): </label>
            <div class="form-group">
                <div class="form-fields">
                    <textarea class="stat-block-input" name="parse-input"></textarea>
                </div>
            </div>
    </form>`;

  await showDgDialog({
    modifier: "stat-parser",
    content,
    window: { title: "Stat Block Parser" },
    buttons: [
      {
        label: "PARSE",
        action: "roll",
        default: true,
        callback: (_event, _button, dialog) => {
          const textInput =
            dialog.element.querySelector("[name=parse-input]")?.value;

          const actorType =
            dialog.element.querySelector("[name=actor-type]")?.value;

          RegexParseNpcStatBlock(textInput, actorType);
        },
      },
    ],
  });
}

export default async function ParseDeltaGreenStatBlock() {
  await GetUserInput();
}
