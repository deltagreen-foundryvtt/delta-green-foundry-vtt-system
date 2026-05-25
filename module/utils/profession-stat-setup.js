import DG from "../config.js";
import { showDiceSoNicePooledRolls } from "./dice-so-nice.js";

export const STAT_KEYS = DG.statistics;
export const POINT_BUY_TOTAL = 72;
export const STAT_MIN = 3;
export const STAT_MAX = 18;
export const ROLL_STAT_FORMULA = "4d6dl";

/**
 * @param {string} key
 * @returns {string}
 */
export function getStatisticLabel(key) {
  return game.i18n.localize(`DG.Attributes.${key}`);
}

/**
 * @returns {{ key: string, label: string }[]}
 */
export function buildStatisticRows() {
  return STAT_KEYS.map((key) => ({
    key,
    label: getStatisticLabel(key),
  }));
}

/**
 * @param {Actor} actor
 * @param {Record<string, number>} valuesByKey
 * @returns {Promise<void>}
 */
export async function applyAgentStatistics(actor, valuesByKey) {
  const updateData = {};
  for (const key of STAT_KEYS) {
    updateData[`system.statistics.${key}.value`] = valuesByKey[key];
  }
  await actor.update(updateData);
}

/**
 * @param {Record<string, number>} values
 * @returns {{ isValid: boolean, remaining: number }}
 */
export function validatePointBuyValues(values) {
  let sum = 0;
  for (const key of STAT_KEYS) {
    const value = Number(values[key]);
    if (
      !Number.isInteger(value) ||
      value < STAT_MIN ||
      value > STAT_MAX
    ) {
      return { isValid: false, remaining: POINT_BUY_TOTAL - sum };
    }
    sum += value;
  }
  const remaining = POINT_BUY_TOTAL - sum;
  return { isValid: remaining === 0, remaining };
}

/**
 * @param {object} [options]
 * @param {Actor|null} [options.actor]
 * @param {TokenDocument|null} [options.token]
 * @param {boolean} [options.animate=true]
 * @returns {Promise<{ total: number, roll: Roll }[]>}
 */
export async function rollStatisticScores({
  actor = null,
  token = null,
  animate = true,
} = {}) {
  const rollPromises = [];
  for (let i = 0; i < STAT_KEYS.length; i++) {
    rollPromises.push(new Roll(ROLL_STAT_FORMULA).evaluate());
  }
  const rolls = await Promise.all(rollPromises);

  if (animate) {
    await showDiceSoNicePooledRolls(rolls, { actor, token });
  }

  return rolls.map((roll, index) => ({
    index,
    total: roll.total,
    roll,
  }));
}

/**
 * @param {{ total: number }[]} rolls
 * @returns {string}
 */
export function buildRollStatsChatContent(rolls) {
  const cells = rolls.map(
    (entry) =>
      `<td class="roll-stats-chat-value">${foundry.utils.escapeHTML(String(entry.total))}</td>`,
  );
  const rows = [];
  for (let i = 0; i < cells.length; i += 3) {
    rows.push(`<tr>${cells.slice(i, i + 3).join("")}</tr>`);
  }
  return `<table class="roll-stats-chat-table"><tbody>${rows.join("")}</tbody></table>`;
}

/**
 * @returns {Record<string, number>}
 */
export function getDefaultPointBuyValues() {
  return Object.fromEntries(STAT_KEYS.map((key) => [key, STAT_MIN]));
}
