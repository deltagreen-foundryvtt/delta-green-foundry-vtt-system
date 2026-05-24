import DG from "../config.js";

/**
 * @param {"1"|"d3"|"d4"|"d4-1"} baseFormula
 * @returns {string}
 */
export function getSkillImprovementFormulaAsPercent(baseFormula) {
  const flat = baseFormula === "1";
  const formula = flat ? "1" : `1${baseFormula}`;
  return `${formula}%`.toUpperCase();
}

/**
 * Generates and evaluates skill improvement rolls for failed skills.
 *
 * @param {Actor} actor
 * @param {string} baseFormula
 * @param {object[]} failedSkills
 * @param {object[]} failedTypedSkills
 * @returns {Promise<Record<string, number>>}
 */
export async function evaluateSkillImprovementRolls(
  actor,
  baseFormula,
  failedSkills,
  failedTypedSkills,
) {
  const totalFailures = failedSkills.length + failedTypedSkills.length;

  if (!Object.keys(DG.skillImprovementFormulas).includes(baseFormula)) {
    throw new Error(`Unknown roll formula: ${baseFormula}`);
  }

  const resultObj = {};
  if (baseFormula === "1") {
    return resultObj;
  }

  const rollPromises = [];
  for (let i = 0; i < totalFailures; i++) {
    rollPromises.push(new Roll(baseFormula, actor.system).evaluate());
  }
  const rolls = await Promise.all(rollPromises);

  [...failedSkills, ...failedTypedSkills].forEach((skill, index) => {
    resultObj[skill.key] = rolls[index].total;
  });

  return resultObj;
}

/**
 * @param {object} params
 * @param {Actor} params.actor
 * @param {TokenDocument|null} [params.token]
 * @param {string} params.baseFormula
 * @param {object[]} params.failedSkills
 * @param {object[]} params.failedTypedSkills
 * @param {Record<string, number>} params.resultObj
 * @returns {Promise<ChatMessage>}
 */
export async function createSkillImprovementChatMessage({
  actor,
  token = null,
  baseFormula,
  failedSkills,
  failedTypedSkills,
  resultObj,
}) {
  const localizeFailedSkills = (skillsArray) => {
    return skillsArray.map((skill) => {
      const increment = resultObj[skill.key] ?? 1;
      const label =
        skill.label ?? game.i18n.localize(`DG.Skills.${skill.key}`);
      const groupLabel = skill.group
        ? `${game.i18n.localize(
            `DG.TypeSkills.${skill.group.replace(/\s+/g, "")}`,
          )} (${label})`
        : label;

      return `${groupLabel}: <b>+${increment}%</b>`;
    });
  };

  const failedSkillNames = localizeFailedSkills(failedSkills);
  const failedTypedSkillNames = localizeFailedSkills(failedTypedSkills);

  const content = [...failedSkillNames, ...failedTypedSkillNames].join(", ");
  const flavor = game.i18n.format(
    "DG.Skills.ApplySkillImprovements.ChatFlavor",
    {
      formula: getSkillImprovementFormulaAsPercent(baseFormula),
    },
  );

  return ChatMessage.create({
    speaker: ChatMessage.getSpeaker({
      actor,
      token,
      alias: actor.name,
    }),
    content,
    flavor,
    messageMode: game.settings.get("core", "messageMode"),
  });
}
