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

// this is the main stat call, it's exposed as part of the system itself for users to access
// call this within a world as: game.deltagreen.ParseDeltaGreenStatBlock()
function GetTypeSkillRatingsFromInput(inputText) {
  const matchStr =
    "(Art|Craft|Foreign Language|Native Language|Military Science|Pilot|Science)\\s?\\((\\w.*?)\\)\\s?(\\d?\\d)%";

  inputText = inputText.replace(/[\n\r]/g, " ");

  const re = new RegExp(matchStr, "gi");

  const matches = [];
  let match;

  try {
    // This is probably one of the few times where its recommended to assign within a while loop.
    // See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/exec
    // eslint-disable-next-line no-cond-assign
    while ((match = re.exec(inputText))) {
      matches.push({
        group: match[1],
        label: match[2],
        proficiency: parseInt(match[3]),
        failure: false,
      });
    }
  } catch (ex) {
    console.log("GetAttributeFromInput Error");
    console.log(ex);
  }

  return matches;
}

function GetSkillRatingsFromInput(inputText, skill) {
  const matchStr = `(?:${skill}\\n?\\s?\\n?)(\\d\\d?)`;
  const re = new RegExp(matchStr, "i");
  const results = inputText.match(re);
  let skillValue = 0;

  try {
    if (results != null && results.length > 1) {
      skillValue = parseInt(results[1]);
    }
  } catch (ex) {
    console.log("GetAttributeFromInput Error");
    console.log(ex);
  }

  return skillValue;
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

    if (skillInfo.typed) {
    }
  });

  actorData.system.skills.accounting = {
    label: "Accounting",
    proficiency: GetSkillRatingsFromInput(inputStr, "ACCOUNTING"),
    failure: false,
  };
  actorData.system.skills.alertness = {
    label: "Alertness",
    proficiency: GetSkillRatingsFromInput(inputStr, "ALERTNESS"),
    failure: false,
  };
  actorData.system.skills.anthropology = {
    label: "Anthropology",
    proficiency: GetSkillRatingsFromInput(inputStr, "ANTHROPOLOGY"),
    failure: false,
  };
  actorData.system.skills.archeology = {
    label: "Archeology",
    proficiency: GetSkillRatingsFromInput(inputStr, "ARCHEOLOGY|ARCHAEOLOGY"),
    failure: false,
  }; // damn you british spellings
  actorData.system.skills.artillery = {
    label: "Artillery",
    proficiency: GetSkillRatingsFromInput(inputStr, "ARTILLERY"),
    failure: false,
  };
  actorData.system.skills.athletics = {
    label: "Athletics",
    proficiency: GetSkillRatingsFromInput(inputStr, "ATHLETICS"),
    failure: false,
  };
  actorData.system.skills.bureaucracy = {
    label: "Bureaucracy",
    proficiency: GetSkillRatingsFromInput(inputStr, "BUREAUCRACY"),
    failure: false,
  };
  actorData.system.skills.computer_science = {
    label: "Computer Science",
    proficiency: GetSkillRatingsFromInput(inputStr, "COMPUTER SCIENCE"),
    failure: false,
  };
  actorData.system.skills.criminology = {
    label: "Criminology",
    proficiency: GetSkillRatingsFromInput(inputStr, "CRIMINOLOGY"),
    failure: false,
  };
  actorData.system.skills.demolitions = {
    label: "Demolitions",
    proficiency: GetSkillRatingsFromInput(inputStr, "DEMOLITIONS"),
    failure: false,
  };
  actorData.system.skills.disguise = {
    label: "Disguise",
    proficiency: GetSkillRatingsFromInput(inputStr, "DISGUISE"),
    failure: false,
  };
  actorData.system.skills.dodge = {
    label: "Dodge",
    proficiency: GetSkillRatingsFromInput(inputStr, "DODGE"),
    failure: false,
  };
  actorData.system.skills.drive = {
    label: "Drive",
    proficiency: GetSkillRatingsFromInput(inputStr, "DRIVE"),
    failure: false,
  };

  // Impossible Landscapes seems to favor 'Driving' as the name for this instead for some reason
  if (actorData.system.skills.drive.proficiency === 0) {
    actorData.system.skills.drive = {
      label: "Drive",
      proficiency: GetSkillRatingsFromInput(inputStr, "DRIVING"),
      failure: false,
    };
  }

  actorData.system.skills.firearms = {
    label: "Firearms",
    proficiency: GetSkillRatingsFromInput(inputStr, "FIREARMS"),
    failure: false,
  };
  actorData.system.skills.first_aid = {
    label: "First Aid",
    proficiency: GetSkillRatingsFromInput(inputStr, "FIRST AID"),
    failure: false,
  };
  actorData.system.skills.forensics = {
    label: "Forensics",
    proficiency: GetSkillRatingsFromInput(inputStr, "FORENSICS"),
    failure: false,
  };
  actorData.system.skills.heavy_machinery = {
    label: "Heavy Machinery",
    proficiency: GetSkillRatingsFromInput(inputStr, "HEAVY MACHINERY"),
    failure: false,
  }; // template.json has typo on heavy machinery...
  actorData.system.skills.heavy_weapons = {
    label: "Heavy Weapons",
    proficiency: GetSkillRatingsFromInput(inputStr, "HEAVY WEAPONS"),
    failure: false,
  };
  actorData.system.skills.history = {
    label: "History",
    proficiency: GetSkillRatingsFromInput(inputStr, "HISTORY"),
    failure: false,
  };
  actorData.system.skills.humint = {
    label: "HUMINT",
    proficiency: GetSkillRatingsFromInput(inputStr, "HUMINT"),
    failure: false,
  };
  actorData.system.skills.law = {
    label: "Law",
    proficiency: GetSkillRatingsFromInput(inputStr, "LAW"),
    failure: false,
  };
  actorData.system.skills.medicine = {
    label: "Medicine",
    proficiency: GetSkillRatingsFromInput(inputStr, "MEDICINE"),
    failure: false,
  };
  actorData.system.skills.melee_weapons = {
    label: "Melee Weapons",
    proficiency: GetSkillRatingsFromInput(inputStr, "MELEE WEAPONS"),
    failure: false,
  };
  actorData.system.skills.navigate = {
    label: "Navigate",
    proficiency: GetSkillRatingsFromInput(inputStr, "NAVIGATE"),
    failure: false,
  };
  actorData.system.skills.occult = {
    label: "Occult",
    proficiency: GetSkillRatingsFromInput(inputStr, "OCCULT"),
    failure: false,
  };
  actorData.system.skills.persuade = {
    label: "Persuade",
    proficiency: GetSkillRatingsFromInput(inputStr, "PERSUADE"),
    failure: false,
  };
  actorData.system.skills.pharmacy = {
    label: "Pharmacy",
    proficiency: GetSkillRatingsFromInput(inputStr, "PHARMACY"),
    failure: false,
  };
  actorData.system.skills.psychotherapy = {
    label: "Psychotherapy",
    proficiency: GetSkillRatingsFromInput(inputStr, "PSYCHOTHERAPY"),
    failure: false,
  };
  actorData.system.skills.ride = {
    label: "Ride",
    proficiency: GetSkillRatingsFromInput(inputStr, "RIDE"),
    failure: false,
  };
  actorData.system.skills.search = {
    label: "Search",
    proficiency: GetSkillRatingsFromInput(inputStr, "SEARCH"),
    failure: false,
  };
  actorData.system.skills.sigint = {
    label: "SIGINT",
    proficiency: GetSkillRatingsFromInput(inputStr, "SIGINT"),
    failure: false,
  };
  actorData.system.skills.stealth = {
    label: "Stealth",
    proficiency: GetSkillRatingsFromInput(inputStr, "STEALTH"),
    failure: false,
  };
  actorData.system.skills.surgery = {
    label: "Surgery",
    proficiency: GetSkillRatingsFromInput(inputStr, "SURGERY"),
    failure: false,
  };
  actorData.system.skills.survival = {
    label: "Survival",
    proficiency: GetSkillRatingsFromInput(inputStr, "SURVIVAL"),
    failure: false,
  };
  actorData.system.skills.swim = {
    label: "Swim",
    proficiency: GetSkillRatingsFromInput(inputStr, "SWIM"),
    failure: false,
  };
  actorData.system.skills.unarmed_combat = {
    label: "Unarmed Combat",
    proficiency: GetSkillRatingsFromInput(inputStr, "UNARMED COMBAT"),
    failure: false,
  };
  actorData.system.skills.unnatural = {
    label: "Unnatural",
    proficiency: GetSkillRatingsFromInput(inputStr, "UNNATURAL"),
    failure: false,
  };

  // some npcs/unnatural have other skills
  if (GetSkillRatingsFromInput(inputStr, "FLIGHT") > 0) {
    actorData.system.skills.flight = {
      label: "Flight",
      proficiency: GetSkillRatingsFromInput(inputStr, "FLIGHT"),
      failure: false,
    };
  }

  arr = GetTypeSkillRatingsFromInput(inputStr);

  for (let index = 0; index < arr.length; index += 1) {
    const element = arr[index];
    actorData.system.typedSkills[`tskill_${index.toString()}`] = element;
  }

  if (actorType === "npc" || actorType === "unnatural") {
    actorData.system.notes = GetNotesFromInput(inputStr);
  }

  console.log(actorData);

  const newActors = await Actor.createDocuments([actorData]);

  if (armor !== null) {
    if (armor.description === null || armor.description.trim() === "") {
      armor.description = "Armor";
    }

    await newActors[0].AddArmorItemToSheet(
      armor.name,
      armor.description,
      armor.armor,
      true,
    );
  }

  if (attacks !== null && attacks.length > 0) {
    for (const a of attacks) {
      await newActors[0].AddWeaponItemToSheet(
        a.name,
        a.description,
        a.damage,
        a.skill,
        a.skillModifier,
        a.customSkillTarget,
        a.armorPiercing,
        a.lethality,
        a.isLethal,
        a.range,
        a.killRadius,
        a.ammo,
        a.expense,
        a.equipped,
      );
    }
  }

  newActors[0].sheet.render(true);
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
