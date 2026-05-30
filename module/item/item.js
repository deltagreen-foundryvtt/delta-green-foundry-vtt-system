import { getDGRollToken } from "../chat/dg-chat-card.js";
import { appendMeleeDamageBonus } from "../roll/melee-damage.js";
import { DGDamageRoll, DGLethalityRoll } from "../roll/roll.js";

/**
 * Extend the basic Item with some very simple modifications.
 * @extends {Item}
 */
export default class DeltaGreenItem extends Item {
  /**
   * Handle clickable rolls.
   * @param {Event} event   The originating click event
   * @private
   */
  async roll(isCrit = false) {
    // Basic template rendering data
    const item = this;
    const { actor } = this;
    let roll;
    if (item.system.isLethal) {
      roll = new DGLethalityRoll(
        "1D100",
        {},
        {
          rollType: "lethality",
          actor,
          item,
          token: getDGRollToken(actor, actor.sheet?.token),
        },
      );
    } else {
      // regular damage roll
      let diceFormula = appendMeleeDamageBonus(
        item.system.damage,
        actor,
        item.system.skill,
      );

      if (isCrit) {
        diceFormula = `2*(${diceFormula})`;
      }

      roll = new DGDamageRoll(
        diceFormula,
        {},
        {
          rollType: "damage",
          actor,
          item,
          token: getDGRollToken(actor, actor.sheet?.token),
        },
      );
    }
    return actor.sheet.processRoll({}, roll);
  }
}
