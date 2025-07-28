function GetAttacksFromInput(inputText) {
  const attacks = [];
  try {
    // some attacks split onto multiple lines, usually separated by semicolons,
    // try to get these back on the same line before splitting...
    const lines = inputText
      .replace("; \r\n", ";")
      .replace(";\r\n", ";")
      .replace(";\n", ";")
      .replace("; \n", ";")
      .split(/\r?\n/);

    let isInAttackSection = false;

    if (lines !== null && lines.length > 0) {
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].toString().toUpperCase().indexOf("ATTACKS:") >= 0) {
          isInAttackSection = true;
        } else if (
          isInAttackSection &&
          lines[i].toString().toUpperCase().indexOf(":") > 0
        ) {
          isInAttackSection = false;
        }

        if (isInAttackSection) {
          const attackLine = lines[i]
            .toString()
            .toUpperCase()
            .replace("ATTACKS:", "");

          console.log(attackLine);

          const weaponData = {
            type: "weapon",
            name: "New Attack",
            description: attackLine,
            system: {
              skill: "custom",
              skillModifier: 0,
              customSkillTarget: 0,
              range: "0M",
              damage: "1D10",
              armorPiercing: 0,
              lethality: 0,
              isLethal: false,
              killRadius: "N/A",
              ammo: "N/A",
              expense: "NA",
              equipped: true,
            },
          };

          // try to determine if it's a lethality attack, as those will have two % values in them
          if (attackLine.indexOf("LETHALITY") >= 0) {
            weaponData.isLethal = true;

            const lethalityMatchStr = "(\\w.*?)(\\d\\d?%)"; // test with 'Black box 50%, Lethality 40% (see BLACK BOX).'
            const re = new RegExp(lethalityMatchStr, "i");
            const lethalityResults = attackLine.match(re);

            if (
              lethalityResults !== null &&
              lethalityResults.length > 0 &&
              lethalityResults[1] !== null &&
              lethalityResults[1] !== undefined
            ) {
              weaponData.name = lethalityResults[1].toString().trim();

              weaponData.lethality = parseInt(
                lethalityResults[2]
                  .toString()
                  .replace("%", "")
                  .replace(";", ""),
              );
            }
          } else {
            // assume only percent value will be the skill test associated with it
            const skillMatchStr = `(\\w.*?)(\\d?\\d%)([\\S\\s]*?damage\\s.*?)?(\\d?d\\d?\\d?\\d([\\+\\-]\\d+)?)?`; // test with 'SIG Sauer P228 pistol 94%, damage 1D10.'
            const re1 = new RegExp(skillMatchStr, "i");
            const skillResults = attackLine.match(re1);

            if (
              skillResults !== null &&
              skillResults.length > 0 &&
              skillResults[1] !== null &&
              skillResults[1] !== undefined
            ) {
              weaponData.name = skillResults[1].toString().trim();

              if (
                skillResults.length > 2 &&
                skillResults[2] !== null &&
                skillResults[2] !== undefined
              ) {
                weaponData.customSkillTarget = parseInt(
                  skillResults[2].toString().replace("%", "").replace(";", ""),
                );
              }

              // have to be careful, some unnatural attacks don't actually deal damage, they just grab or something.
              // don't have a great way to indicate that in the system, so just set it to zero if we can't find it.
              if (
                skillResults.length > 4 &&
                skillResults[4] !== null &&
                skillResults[4] !== undefined
              ) {
                weaponData.damage = skillResults[4].toString().replace(";", "");
              } else {
                weaponData.damage = 0;
              }
            }

            // look for armor piercing
            if (attackLine.indexOf("ARMOR PIERCING") >= 0) {
              // TODO: This should do something.
            }
          }

          if (weaponData.customSkillTarget > 0 || weaponData.isLethal) {
            attacks.push(weaponData);
          }
        }
      }
    }
  } catch (ex) {
    console.log("GetAttacksFromInput Error");
    console.log(ex);
  }

  return attacks;
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

function GetArmorFromInput(inputText) {
  try {
    const armor = { name: "Armor", description: "", armor: 0 };

    const lines = inputText.split(/\r?\n/);

    if (lines !== null && lines.length > 0) {
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].toString().toUpperCase().indexOf("ARMOR:") >= 0) {
          armor.description = lines[i]
            .replace("Armor:", "")
            .replace("ARMOR:", "")
            .trim();

          const matchStr = `(\\d\\d?)`;
          const re = new RegExp(matchStr, "i");
          const results = lines[i].match(re);

          try {
            if (results != null && results.length > 0) {
              armor.armor = parseInt(results[0]);

              armor.name = armor.description
                .replace(`(Armor ${armor.armor})`, "")
                .trim();

              armor.name = armor.name
                .replace(`${armor.armor} points of`, "")
                .replace(`${armor.armor} point of`, "")
                .replace(".", "")
                .trim();
            }
          } catch (ex) {
            console.log("GetArmorFromInput Error");
            console.log(ex);
          }

          return armor;
        }
      }
    }
  } catch (ex) {
    console.log("GetArmorFromInput Error");
    console.log(ex);
  }
  return null;
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

function GetAttributeFromInput(inputText, attribute) {
  const matchStr = `(?:${attribute}\\s)(\\d\\d?)`;
  const re = new RegExp(matchStr, "i");
  const results = inputText.match(re);
  let attributeScore = 10;

  try {
    if (results != null && results.length > 1) {
      attributeScore = parseInt(results[1]);
    } else {
      attributeScore = 0;
    }
  } catch (ex) {
    console.log("GetAttributeFromInput Error");
    console.log(ex);
  }

  return attributeScore;
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

  let shortDescription = "";

  actorData.type = actorType;
  actorData.system = {};
  actorData.system.statistics = {};
  actorData.system.skills = {};
  actorData.system.typedSkills = {};
  actorData.system.physical = {};

  actorData.system.health = { value: 10, min: 0, max: 10 };
  actorData.system.wp = { value: 10, min: 0, max: 10 };

  let tempStr = "";
  let arr = [];

  tempStr = inputStr.split(/\r?\n/);

  if (tempStr.length > 0) {
    [actorData.name] = tempStr;

    // set the alternate description/profession/etc.
    // if this doesn't exist, the next line should be the attributes starting with strength
    // so if the second line starts with "STR" then just leave it be.
    if (
      tempStr.length > 1 &&
      tempStr[1].substring(0, 3) !== "STR" &&
      tempStr[1].substring(0, 3) !== "CON" &&
      tempStr[1].substring(0, 3) !== "DEX" &&
      tempStr[1].substring(0, 3) !== "INT" &&
      tempStr[1].substring(0, 3) !== "POW" &&
      tempStr[1].substring(0, 3) !== "CHA"
    ) {
      [, shortDescription] = tempStr;
    }
  } else {
    actorData.name = "Unknown";
  }

  const armor = GetArmorFromInput(inputStr);

  const attacks = GetAttacksFromInput(inputStr);

  if (armor !== null) {
    console.log(armor);
  }

  if (actorType === "agent") {
    actorData.system.physical = {
      description: shortDescription,
      wounds: "",
      firstAidAttempted: false,
    };
  } else if (actorType === "npc" || actorType === "unnatural") {
    actorData.system.shortDescription = shortDescription;
  }

  actorData.system.statistics.str = {
    value: GetAttributeFromInput(inputStr, "STR"),
    distinguishing_feature: "",
  };
  actorData.system.statistics.con = {
    value: GetAttributeFromInput(inputStr, "CON"),
    distinguishing_feature: "",
  };
  actorData.system.statistics.dex = {
    value: GetAttributeFromInput(inputStr, "DEX"),
    distinguishing_feature: "",
  };
  actorData.system.statistics.int = {
    value: GetAttributeFromInput(inputStr, "INT"),
    distinguishing_feature: "",
  };
  actorData.system.statistics.pow = {
    value: GetAttributeFromInput(inputStr, "POW"),
    distinguishing_feature: "",
  };
  actorData.system.statistics.cha = {
    value: GetAttributeFromInput(inputStr, "CHA"),
    distinguishing_feature: "",
  };

  if (actorType === "npc" || actorType === "unnatural") {
    // don't want to try to set HP/SAN for player characters
    actorData.system.health = {
      min: 0,
      max: GetAttributeFromInput(inputStr, "HP"),
      value: GetAttributeFromInput(inputStr, "HP"),
    };
    actorData.system.sanity = {
      max: actorData.system.statistics.pow.value * 5,
      value: GetAttributeFromInput(inputStr, "SAN"),
      currentBreakingPoint: GetAttributeFromInput(inputStr, "BREAKING POINT"),
    };
    actorData.system.wp = {
      max: actorData.system.statistics.pow.value,
      value: GetAttributeFromInput(inputStr, "WP"),
      min: 0,
    };
  }

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
    label: "First Adi",
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

  new foundry.applications.api.DialogV2({
    window: { title: "Stat Block Parser" },
    content,
    buttons: [
      {
        label: "PARSE",
        action: "roll",
        callback: (event, button, dialog) => {
          const textInput =
            dialog.element.querySelector("[name=parse-input]")?.value;

          const actorType =
            dialog.element.querySelector("[name=actor-type]")?.value;

          RegexParseNpcStatBlock(textInput, actorType);
        },
      },
    ],
  }).render(true);
}

export default async function ParseDeltaGreenStatBlock() {
  GetUserInput();
}
