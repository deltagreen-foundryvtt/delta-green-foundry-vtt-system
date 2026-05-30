/**
 * Append STR melee damage bonus to a weapon damage formula when applicable.
 *
 * @param {string} diceFormula
 * @param {Actor|null} actor
 * @param {string|null|undefined} skill Weapon skill key from item system
 * @returns {string}
 */
export default function appendMeleeDamageBonus(diceFormula, actor, skill) {
  if (
    !actor ||
    (actor.type !== "agent" && actor.type !== "npc") ||
    (skill !== "unarmed_combat" && skill !== "melee_weapons")
  ) {
    return diceFormula;
  }

  const bonus = actor.system?.statistics?.str?.meleeDamageBonusFormula;
  if (!bonus) return diceFormula;
  return `${diceFormula}${bonus}`;
}
