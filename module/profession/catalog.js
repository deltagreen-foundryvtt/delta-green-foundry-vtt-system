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
 * @typedef {object} BonusPickOptions
 * @property {number} [count]
 * @property {number} [increment]
 * @property {number} [cap]
 * @property {number} [maxWaste]
 */

/**
 * Bonus skill slots that would waste points over the creation cap.
 *
 * @param {Record<string, number>} baseFixed
 * @param {Record<string, { group: string, label: string, value: number }>} baseTyped
 * @param {string[]} bonusCatalogIds
 * @param {string[]} bonusTypedLabels
 * @param {BonusPickOptions} [options]
 * @returns {string[]}
 */
export function collectBonusCapValidationErrors(
  baseFixed,
  baseTyped,
  bonusCatalogIds,
  bonusTypedLabels,
  {
    count = BONUS_SKILL_COUNT,
    increment = BONUS_SKILL_INCREMENT,
    cap = SKILL_CAP,
    maxWaste = MAX_ALLOWED_BONUS_WASTE,
  } = {},
) {
  const defaults = getAgentSkillDefaults();
  /** @type {Record<string, number>} */
  const counts = {};
  /** @type {(string | null)[]} */
  const slotTrackKeys = [];

  for (let i = 0; i < count; i++) {
    const catalogId = bonusCatalogIds?.[i];
    if (!catalogId) {
      slotTrackKeys.push(null);
    } else {
      const ref = catalogIdToSkillRef(catalogId, bonusTypedLabels?.[i] ?? "");
      if (!ref) {
        slotTrackKeys.push(null);
      } else {
        const trackKey = getBonusTrackKey(ref);
        slotTrackKeys.push(trackKey);
        counts[trackKey] = (counts[trackKey] ?? 0) + 1;
      }
    }
  }

  /** @type {Set<string>} */
  const violatingTrackKeys = new Set();

  for (const [trackKey, countForTrack] of Object.entries(counts)) {
    const base = getBonusTrackBaseValue(
      trackKey,
      baseFixed,
      baseTyped,
      defaults,
    );
    const final = base + countForTrack * increment;
    const waste = Math.max(0, final - cap);
    if (base < cap && waste >= maxWaste) {
      violatingTrackKeys.add(trackKey);
    }
  }

  /** @type {string[]} */
  const errors = [];
  for (let i = 0; i < count; i++) {
    const trackKey = slotTrackKeys[i];
    if (trackKey && violatingTrackKeys.has(trackKey)) {
      const base = getBonusTrackBaseValue(
        trackKey,
        baseFixed,
        baseTyped,
        defaults,
      );
      const countForTrack = counts[trackKey] ?? 0;
      const final = base + countForTrack * increment;
      const waste = Math.max(0, final - cap);

      errors.push(`bonusWaste:${i}|${waste}|${trackKey}`);
    }
  }

  return errors;
}

/**
 * @param {Record<string, number>} baseFixed
 * @param {Record<string, { group: string, label: string, value: number }>} baseTyped
 * @param {{ bonusCatalogIds?: string[], bonusTypedLabels?: string[] }} formState
 * @param {BonusPickOptions} [options]
 * @returns {{
 *   fixedValues: Record<string, number>,
 *   typedValues: Record<string, { group: string, label: string, value: number }>,
 *   modifiedFixedKeys: string[],
 *   modifiedTypedKeys: string[],
 *   validationErrors: string[],
 *   isValid: boolean,
 * }}
 */
export function applyBonusSkillPicks(
  baseFixed,
  baseTyped,
  formState,
  {
    count = BONUS_SKILL_COUNT,
    increment = BONUS_SKILL_INCREMENT,
    cap = SKILL_CAP,
    maxWaste = MAX_ALLOWED_BONUS_WASTE,
  } = {},
) {
  const defaults = getAgentSkillDefaults();
  const fixedValues = { ...baseFixed };
  const typedValues = foundry.utils.deepClone(baseTyped);
  /** @type {Set<string>} */
  const modifiedFixedKeys = new Set();
  /** @type {Set<string>} */
  const modifiedTypedKeys = new Set();
  /** @type {Record<string, number>} */
  const bonusCounts = {};

  const bonusIds = formState.bonusCatalogIds ?? [];
  const bonusLabels = formState.bonusTypedLabels ?? [];

  for (let i = 0; i < count; i++) {
    const catalogId = bonusIds[i];
    if (catalogId) {
      const typedLabel = bonusLabels[i] ?? "";
      const ref = catalogIdToSkillRef(catalogId, typedLabel);
      if (ref) {
        if (ref.kind === "fixed") modifiedFixedKeys.add(ref.key);
        else modifiedTypedKeys.add(formatProfessionSkillKey(ref));

        const trackKey = getBonusTrackKey(ref);
        bonusCounts[trackKey] = (bonusCounts[trackKey] ?? 0) + 1;
      }
    }
  }

  for (const [trackKey, pickCount] of Object.entries(bonusCounts)) {
    const bonus = pickCount * increment;
    if (trackKey.startsWith("fixed:")) {
      const key = trackKey.slice(6);
      fixedValues[key] = (fixedValues[key] ?? defaults[key] ?? 0) + bonus;
    } else {
      const ref = parseProfessionSkillKey(trackKey);
      if (ref?.kind === "typed") {
        const base = typedValues[trackKey]?.value ?? 0;
        typedValues[trackKey] = {
          group: ref.group,
          label: ref.label,
          value: base + bonus,
        };
      }
    }
  }

  for (const key of Object.keys(fixedValues)) {
    if (fixedValues[key] > cap) fixedValues[key] = cap;
  }
  for (const data of Object.values(typedValues)) {
    if (data.value > cap) data.value = cap;
  }

  /** @type {string[]} */
  const validationErrors = [];

  for (let i = 0; i < count; i++) {
    const catalogId = bonusIds[i];
    if (!catalogId) {
      validationErrors.push(`bonus${i}`);
    } else {
      const ref = catalogIdToSkillRef(catalogId, bonusLabels[i] ?? "");
      if (!ref) {
        validationErrors.push(`bonus${i}`);
      } else if (ref.kind === "typed" && !bonusLabels[i]?.trim()) {
        validationErrors.push(`bonusType${i}`);
      }
    }
  }

  validationErrors.push(
    ...collectBonusCapValidationErrors(
      baseFixed,
      baseTyped,
      bonusIds,
      bonusLabels,
      { count, increment, cap, maxWaste },
    ),
  );

  return {
    fixedValues,
    typedValues,
    modifiedFixedKeys: [...modifiedFixedKeys],
    modifiedTypedKeys: [...modifiedTypedKeys],
    validationErrors,
    isValid: validationErrors.length === 0,
  };
}
