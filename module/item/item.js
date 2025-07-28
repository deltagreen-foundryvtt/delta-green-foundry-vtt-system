import { DGDamageRoll, DGLethalityRoll } from "../roll/roll.js";

/**
 * Extend the basic Item with some very simple modifications.
 * @extends {Item}
 */
export default class DeltaGreenItem extends Item {
  /**
   * Augment the basic Item data model with additional dynamic data.
   */
  prepareData() {
    super.prepareData();

    // Get the Item's data
    const itemData = this;
    const actorData = this.actor || {};
    const { system } = itemData;
  }

  /**
   * Handle clickable rolls.
   * @param {Event} event   The originating click event
   * @private
   */
  async roll(isCrit = false) {
    // Basic template rendering data
    const item = this;
    const { actor } = this;
    const actorSystemData = this.actor.system || {};

    let roll;
    if (item.system.isLethal) {
      roll = new DGLethalityRoll(
        "1D100",
        {},
        { rollType: "lethality", actor, item },
      );
    } else {
      // regular damage roll
      let diceFormula = item.system.damage;
      const skillType = item.system.skill;

      if (skillType === "unarmed_combat" || skillType === "melee_weapons") {
        diceFormula += actorSystemData.statistics.str.meleeDamageBonusFormula;
      }

      if (isCrit) {
        diceFormula = `2*(${diceFormula})`;
      }

      roll = new DGDamageRoll(
        diceFormula,
        {},
        { rollType: "damage", actor, item },
      );
    }
    return actor.sheet.processRoll({}, roll);
  }
}
