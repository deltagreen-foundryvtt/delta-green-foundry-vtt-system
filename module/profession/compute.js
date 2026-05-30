import {
  BONUS_SKILL_COUNT,
  BONUS_SKILL_INCREMENT,
  SKILL_CAP,
} from "./constants.js";
import {
  catalogIdToSkillRef,
  collectBonusCapValidationErrors,
} from "./catalog.js";
import {
  formatProfessionSkillKey,
  formatProfessionSkillLabel,
  getAgentSkillDefaults,
  parseProfessionSkillKey,
} from "./keys.js";
import { validateProfessionFormState } from "./validation.js";

/**
 * @param {Record<string, number>} automaticSkills
 * @param {Record<string, number>} optionSkills
 * @param {number} optionPicks
 * @param {object} formState
 * @param {Set<string>} formState.checkedOptionKeys
 * @param {Record<string, string>} formState.chooseOneLabels - keyed by profession map key
 * @param {string[]} formState.bonusCatalogIds - length 8
 * @param {string[]} formState.bonusTypedLabels - length 8
 * @param {string[]} [formState.bondNames]
 * @param {string[]} [formState.bondRelationships]
 * @param {object} [context]
 * @param {Record<string, ProfessionSkillMeta>} [context.automaticMeta]
 * @param {Record<string, ProfessionSkillMeta>} [context.optionMeta]
 * @param {number} [context.bondCount]
 * @returns {{
 *   fixedValues: Record<string, number>,
 *   typedValues: Record<string, { group: string, label: string, value: number }>,
 *   capWarnings: { label: string, attempted: number, waste: number }[],
 *   isValid: boolean,
 *   validationErrors: string[],
 *   modifiedFixedKeys: string[],
 *   modifiedTypedKeys: string[],
 * }}
 */
export function computeSkillValues(
  automaticSkills,
  optionSkills,
  optionPicks,
  formState,
  { automaticMeta = {}, optionMeta = {}, bondCount = 0 } = {},
) {
  const defaults = getAgentSkillDefaults();
  /** @type {Record<string, number>} */
  const fixedValues = { ...defaults };
  /** @type {Record<string, { group: string, label: string, value: number }>} */
  const typedValues = {};
  /** @type {Set<string>} */
  const modifiedFixedKeys = new Set();
  /** @type {Set<string>} */
  const modifiedTypedKeys = new Set();

  /**
   * @param {TypedSkillRef} ref
   * @param {string} label
   */
  const markTypedModified = (ref, label) => {
    modifiedTypedKeys.add(
      formatProfessionSkillKey({ kind: "typed", group: ref.group, label }),
    );
  };

  /**
   * @param {string} mapKey
   * @param {number} rating
   * @param {{ labelOverride?: string }} [options]
   * @returns {string | null} Merged typed storage key, if applied.
   */
  const applyOverride = (mapKey, rating, options = {}) => {
    const ref = parseProfessionSkillKey(mapKey);
    if (!ref) return null;
    const value = Number(rating);
    if (ref.kind === "fixed") {
      fixedValues[ref.key] = value;
      return null;
    }

    const label = options.labelOverride?.trim() ?? ref.label?.trim() ?? "";
    if (!label) return null;

    const storageKey = formatProfessionSkillKey({
      kind: "typed",
      group: ref.group,
      label,
    });
    typedValues[storageKey] = {
      group: ref.group,
      label,
      value,
    };
    return storageKey;
  };

  for (const [key, rating] of Object.entries(automaticSkills ?? {})) {
    const ref = parseProfessionSkillKey(key);
    if (!ref) continue;

    let labelOverride;
    if (ref.kind === "typed" && automaticMeta[key]?.chooseOne) {
      labelOverride = formState.chooseOneLabels?.[key]?.trim();
      if (!labelOverride) continue;
    }

    const storageKey = applyOverride(key, rating, { labelOverride });
    if (ref.kind === "fixed") modifiedFixedKeys.add(ref.key);
    else if (storageKey) {
      markTypedModified(ref, labelOverride ?? ref.label);
    }
  }

  for (const key of formState.checkedOptionKeys ?? []) {
    if (!optionSkills[key] && optionSkills[key] !== 0) continue;
    const ref = parseProfessionSkillKey(key);
    if (!ref) continue;

    let labelOverride;
    if (ref.kind === "typed" && optionMeta[key]?.chooseOne) {
      labelOverride = formState.chooseOneLabels?.[key]?.trim();
      if (!labelOverride) continue;
    } else if (ref.kind === "typed") {
      labelOverride = ref.label?.trim();
      if (!labelOverride) continue;
    }

    const storageKey = applyOverride(key, optionSkills[key], { labelOverride });
    if (ref.kind === "fixed") modifiedFixedKeys.add(ref.key);
    else if (storageKey) {
      markTypedModified(ref, labelOverride ?? ref.label);
    }
  }

  /** @type {Record<string, number>} */
  const bonusCounts = {};

  const bonusIds = formState.bonusCatalogIds ?? [];
  const bonusLabels = formState.bonusTypedLabels ?? [];

  for (let i = 0; i < BONUS_SKILL_COUNT; i++) {
    const catalogId = bonusIds[i];
    if (!catalogId) continue;
    const typedLabel = bonusLabels[i] ?? "";
    const ref = catalogIdToSkillRef(catalogId, typedLabel);
    if (!ref) continue;

    if (ref.kind === "fixed") modifiedFixedKeys.add(ref.key);
    else modifiedTypedKeys.add(formatProfessionSkillKey(ref));

    let trackKey;
    if (ref.kind === "fixed") {
      trackKey = `fixed:${ref.key}`;
    } else {
      trackKey = formatProfessionSkillKey(ref);
    }
    bonusCounts[trackKey] = (bonusCounts[trackKey] ?? 0) + 1;
  }

  /** Pre-bonus base for cap warnings */
  const baseFixed = { ...fixedValues };
  const baseTyped = foundry.utils.deepClone(typedValues);

  for (const [trackKey, count] of Object.entries(bonusCounts)) {
    const bonus = count * BONUS_SKILL_INCREMENT;
    if (trackKey.startsWith("fixed:")) {
      const key = trackKey.slice(6);
      fixedValues[key] = (fixedValues[key] ?? defaults[key] ?? 0) + bonus;
    } else {
      const ref = parseProfessionSkillKey(trackKey);
      if (ref?.kind !== "typed") continue;

      const base = typedValues[trackKey]?.value ?? 0;
      typedValues[trackKey] = {
        group: ref.group,
        label: ref.label,
        value: base + bonus,
      };
    }
  }

  /** @type {{ label: string, attempted: number, waste: number }[]} */
  const capWarnings = [];

  const checkCap = (label, base, final) => {
    if (final > SKILL_CAP) {
      capWarnings.push({
        label,
        attempted: final,
        waste: final - SKILL_CAP,
      });
    }
  };

  for (const [key, final] of Object.entries(fixedValues)) {
    const base = baseFixed[key] ?? defaults[key] ?? 0;
    const ref = /** @type {FixedSkillRef} */ ({ kind: "fixed", key });
    checkCap(formatProfessionSkillLabel(ref), base, final);
  }

  for (const [storageKey, data] of Object.entries(typedValues)) {
    const base = baseTyped[storageKey]?.value ?? 0;
    const ref = /** @type {TypedSkillRef} */ ({
      kind: "typed",
      group: data.group,
      label: data.label,
    });
    checkCap(formatProfessionSkillLabel(ref), base, data.value);
  }

  /** Apply cap for display (values shown capped at 80) */
  for (const key of Object.keys(fixedValues)) {
    if (fixedValues[key] > SKILL_CAP) fixedValues[key] = SKILL_CAP;
  }
  for (const data of Object.values(typedValues)) {
    if (data.value > SKILL_CAP) data.value = SKILL_CAP;
  }

  const validationErrors = validateProfessionFormState(optionPicks, formState, {
    automaticSkills,
    optionSkills,
    automaticMeta,
    optionMeta,
    bondCount,
  });

  validationErrors.push(
    ...collectBonusCapValidationErrors(
      baseFixed,
      baseTyped,
      bonusIds,
      bonusLabels,
    ),
  );

  return {
    fixedValues,
    typedValues,
    capWarnings,
    isValid: validationErrors.length === 0,
    validationErrors,
    modifiedFixedKeys: [...modifiedFixedKeys],
    modifiedTypedKeys: [...modifiedTypedKeys],
  };
}
