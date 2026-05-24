import {
  DGRoll,
  DGPercentileRoll,
  DGLethalityRoll,
  DGDamageRoll,
  DGSanityDamageRoll,
} from "./roll-classes.js";

export {
  DGRoll,
  DGPercentileRoll,
  DGLethalityRoll,
  DGDamageRoll,
  DGSanityDamageRoll,
};

/**
 * Build a Delta Green roll from a click target's dataset.
 *
 * @param {DOMStringMap} dataset
 * @param {object} params
 * @param {Actor|null} [params.actor]
 * @param {Item|null} [params.item]
 * @param {HTMLElement} [params.element]
 * @param {"actor"|"item"} [params.sanityDamageSource]
 * @returns {Roll}
 */
export function createDGRollFromDataset(
  dataset,
  { actor = null, item = null, element = null, sanityDamageSource = "actor" } = {},
) {
  const rollOptions = {
    rollType: dataset.rolltype,
    key: dataset.key,
    actor,
    specialTrainingName: dataset?.name || null,
    item,
  };

  let roll = new Roll("1d100", {});
  switch (dataset.rolltype) {
    case "stat":
    case "skill":
    case "sanity":
    case "special-training":
    case "weapon":
    case "luck":
      roll = new DGPercentileRoll("1D100", {}, rollOptions);
      break;
    case "lethality":
      roll = new DGLethalityRoll("1D100", {}, rollOptions);
      break;
    case "damage": {
      let diceFormula = item.system.damage;
      const { skill } = item.system;
      if (
        actor &&
        (actor.type === "agent" || actor.type === "npc") &&
        (skill === "unarmed_combat" || skill === "melee_weapons")
      ) {
        diceFormula += actor.system.statistics.str.meleeDamageBonusFormula;
      }
      roll = new DGDamageRoll(diceFormula, {}, rollOptions);
      break;
    }
    case "sanity-damage": {
      let successLoss;
      let failedLoss;
      if (sanityDamageSource === "item" && item) {
        const isLearntDamage = element?.hasAttribute("data-san-on-learn");
        const sanityData = isLearntDamage
          ? item.system.learnedSanity
          : item.system.sanity;
        ({ successLoss, failedLoss } = sanityData);
      } else if (actor) {
        ({ successLoss, failedLoss } = actor.system.sanity);
      } else {
        break;
      }
      const combinedFormula = `{${successLoss}, ${failedLoss}}`;
      roll = new DGSanityDamageRoll(combinedFormula, {}, rollOptions);
      break;
    }
    default:
      break;
  }
  return roll;
}

/**
 * Show an optional modifier dialog, evaluate, and send a roll to chat.
 *
 * @param {Event|object} event
 * @param {Roll} roll
 * @returns {Promise<void>}
 */
export async function processDGRoll(event, roll) {
  const shiftKey = event?.shiftKey ?? false;
  const which = event?.which ?? 0;

  if (shiftKey || which === 3) {
    if (!(roll instanceof DGSanityDamageRoll)) {
      const dialogData = await roll.showDialog();
      if (!dialogData) return;
      if (dialogData.newFormula) {
        roll = new DGDamageRoll(dialogData.newFormula, {}, roll.options);
      }
      roll.modifier += dialogData.targetModifier;
      if (dialogData.messageMode) {
        roll.options.messageMode = dialogData.messageMode;
      }
    }
  }
  await roll.evaluate();
  await roll.toChat();
}
