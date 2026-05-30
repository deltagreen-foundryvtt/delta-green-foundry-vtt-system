import {
  formatProfessionSkillKeyLabel,
  formatProfessionSkillLabel,
} from "./keys.js";

/**
 * Sorted fixed skill rows for display.
 * @param {Record<string, number>} fixedValues
 * @returns {{ key: string, label: string, value: number }[]}
 */
export function buildSortedFixedSkillRows(fixedValues) {
  const rows = Object.entries(fixedValues).map(([key, value]) => {
    const ref = /** @type {FixedSkillRef} */ ({ kind: "fixed", key });
    return {
      key,
      label: formatProfessionSkillLabel(ref),
      value,
      sortLabel: formatProfessionSkillLabel(ref),
    };
  });
  rows.sort((a, b) => a.sortLabel.localeCompare(b.sortLabel, game.i18n.lang));
  return rows;
}

/**
 * Sorted typed skill rows for display.
 * @param {Record<string, { group: string, label: string, value: number }>} typedValues
 * @returns {{ storageKey: string, label: string, value: number, sortLabel: string }[]}
 */
export function buildSortedTypedSkillRows(typedValues) {
  const rows = Object.entries(typedValues).map(([storageKey, data]) => {
    const ref = {
      kind: "typed",
      group: data.group,
      label: data.label,
    };
    const label = formatProfessionSkillLabel(ref);
    return {
      storageKey,
      label,
      value: data.value,
      sortLabel: label,
    };
  });
  rows.sort((a, b) => a.sortLabel.localeCompare(b.sortLabel, game.i18n.lang));
  return rows;
}

/**
 * Prepare sorted skill rows from profession item maps.
 * @param {Record<string, number>} skillMap
 * @param {Record<string, ProfessionSkillMeta>} [skillMeta]
 * @returns {{ key: string, label: string, rating: number }[]}
 */
export function prepareProfessionSkillRows(skillMap, skillMeta = {}) {
  const rows = Object.entries(skillMap ?? {}).map(([key, rating]) => {
    const label = formatProfessionSkillKeyLabel(key, {
      automaticMeta: skillMeta,
      optionMeta: skillMeta,
    });
    return {
      key,
      label,
      rating: Number(rating),
      sortLabel: label,
    };
  });
  rows.sort((a, b) => a.sortLabel.localeCompare(b.sortLabel, game.i18n.lang));
  return rows;
}
