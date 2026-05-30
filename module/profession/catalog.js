import DG from "../config/index.js";
import {
  BONUS_SKILL_CATALOG_EXCLUDED_FIXED,
  BONUS_SKILL_COUNT,
  BONUS_SKILL_INCREMENT,
  MAX_ALLOWED_BONUS_WASTE,
  SKILL_CAP,
  TYPED_SKILL_TEMPLATE_GROUPS,
} from "./constants.js";
import {
  formatProfessionSkillKey,
  formatProfessionSkillLabel,
  getAgentSkillDefaults,
  getTypedGroupDisplayName,
  parseProfessionSkillKey,
} from "./keys.js";

/**
 * @typedef {object} SkillCatalogEntry
 * @property {string} id - Select value (`fixed:accounting` or `typed:Craft`)
 * @property {ProfessionSkillRef} ref
 * @property {string} label
 * @property {string} sortLabel
 */

/**
 * @returns {SkillCatalogEntry[]}
 */
export function buildSkillCatalog() {
  /** @type {SkillCatalogEntry[]} */
  const entries = [];

  for (const key of DG.skills) {
    const ref = /** @type {FixedSkillRef} */ ({ kind: "fixed", key });
    const label = formatProfessionSkillLabel(ref);
    entries.push({
      id: `fixed:${key}`,
      ref,
      label,
      sortLabel: label,
    });
  }

  for (const group of TYPED_SKILL_TEMPLATE_GROUPS) {
    const ref = /** @type {TypedSkillRef} */ ({
      kind: "typed",
      group,
      label: "",
    });
    const label = getTypedGroupDisplayName(group);
    entries.push({
      id: `typed:${group}`,
      ref,
      label,
      sortLabel: label,
    });
  }

  entries.sort((a, b) =>
    a.sortLabel.localeCompare(b.sortLabel, game.i18n.lang),
  );
  return entries;
}

/**
 * Skill catalog for character-creation bonus picks (excludes Unnatural).
 *
 * @returns {SkillCatalogEntry[]}
 */
export function buildBonusSkillCatalog() {
  return buildSkillCatalog().filter(
    (entry) =>
      entry.ref.kind !== "fixed" ||
      !BONUS_SKILL_CATALOG_EXCLUDED_FIXED.has(entry.ref.key),
  );
}

/**
 * @param {string} catalogId
 * @param {string} [typedLabel]
 * @param {{ allowEmptyTypedLabel?: boolean }} [options]
 * @returns {ProfessionSkillRef | null}
 */
export function catalogIdToSkillRef(
  catalogId,
  typedLabel = "",
  { allowEmptyTypedLabel = false } = {},
) {
  if (!catalogId) return null;
  if (catalogId.startsWith("fixed:")) {
    const key = catalogId.slice(6);
    if (!DG.skills.includes(key)) return null;
    return { kind: "fixed", key };
  }
  if (catalogId.startsWith("typed:")) {
    const group = catalogId.slice(6);
    if (!TYPED_SKILL_TEMPLATE_GROUPS.includes(group)) return null;
    const label = typedLabel.trim();
    if (!label && !allowEmptyTypedLabel) return null;
    return { kind: "typed", group, label };
  }
  return null;
}

/**
 * @param {ProfessionSkillRef} ref
 * @returns {string}
 */
function getBonusTrackKey(ref) {
  if (ref.kind === "fixed") return `fixed:${ref.key}`;
  return formatProfessionSkillKey(ref);
}

/**
 * @param {string} trackKey
 * @returns {string}
 */
export function getBonusTrackLabel(trackKey) {
  if (trackKey.startsWith("fixed:")) {
    const key = trackKey.slice(6);
    return formatProfessionSkillLabel(
      /** @type {FixedSkillRef} */ ({ kind: "fixed", key }),
    );
  }
  const ref = parseProfessionSkillKey(trackKey);
  if (ref) return formatProfessionSkillLabel(ref);
  return trackKey;
}

/**
 * @param {string} trackKey
 * @param {Record<string, number>} baseFixed
 * @param {Record<string, { group: string, label: string, value: number }>} baseTyped
 * @param {Record<string, number>} defaults
 * @returns {number}
 */
function getBonusTrackBaseValue(trackKey, baseFixed, baseTyped, defaults) {
  if (trackKey.startsWith("fixed:")) {
    const key = trackKey.slice(6);
    return baseFixed[key] ?? defaults[key] ?? 0;
  }
  return baseTyped[trackKey]?.value ?? 0;
}

/**
 * Bonus skill slots that would waste 20+ points or raise a skill already at the creation cap.
 *
 * @param {Record<string, number>} baseFixed
 * @param {Record<string, { group: string, label: string, value: number }>} baseTyped
 * @param {string[]} bonusCatalogIds
 * @param {string[]} bonusTypedLabels
 * @returns {string[]}
 */
export function collectBonusCapValidationErrors(
  baseFixed,
  baseTyped,
  bonusCatalogIds,
  bonusTypedLabels,
) {
  const defaults = getAgentSkillDefaults();
  /** @type {Record<string, number>} */
  const counts = {};
  /** @type {(string | null)[]} */
  const slotTrackKeys = [];

  for (let i = 0; i < BONUS_SKILL_COUNT; i++) {
    const catalogId = bonusCatalogIds?.[i];
    if (!catalogId) {
      slotTrackKeys.push(null);
      continue;
    }
    const ref = catalogIdToSkillRef(catalogId, bonusTypedLabels?.[i] ?? "");
    if (!ref) {
      slotTrackKeys.push(null);
      continue;
    }
    const trackKey = getBonusTrackKey(ref);
    slotTrackKeys.push(trackKey);
    counts[trackKey] = (counts[trackKey] ?? 0) + 1;
  }

  /** @type {Set<string>} */
  const violatingTrackKeys = new Set();

  for (const [trackKey, count] of Object.entries(counts)) {
    const base = getBonusTrackBaseValue(
      trackKey,
      baseFixed,
      baseTyped,
      defaults,
    );
    const final = base + count * BONUS_SKILL_INCREMENT;
    const waste = Math.max(0, final - SKILL_CAP);
    if (base >= SKILL_CAP || waste >= MAX_ALLOWED_BONUS_WASTE) {
      violatingTrackKeys.add(trackKey);
    }
  }

  /** @type {string[]} */
  const errors = [];
  for (let i = 0; i < BONUS_SKILL_COUNT; i++) {
    const trackKey = slotTrackKeys[i];
    if (!trackKey || !violatingTrackKeys.has(trackKey)) continue;

    const base = getBonusTrackBaseValue(
      trackKey,
      baseFixed,
      baseTyped,
      defaults,
    );
    const count = counts[trackKey] ?? 0;
    const final = base + count * BONUS_SKILL_INCREMENT;
    const waste = Math.max(0, final - SKILL_CAP);

    if (base >= SKILL_CAP) {
      errors.push(`bonusAtCap:${i}|${trackKey}`);
    } else {
      errors.push(`bonusWaste:${i}|${waste}|${trackKey}`);
    }
  }

  return errors;
}
