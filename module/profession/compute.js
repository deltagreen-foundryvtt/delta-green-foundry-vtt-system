import { SKILL_CAP } from "./constants.js";
import {
  applyBonusSkillPicks,
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
export default function computeSkillValues(
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
    if (ref) {
      let labelOverride;
      let skip = false;
      if (ref.kind === "typed" && automaticMeta[key]?.chooseOne) {
        labelOverride = formState.chooseOneLabels?.[key]?.trim();
        if (!labelOverride) skip = true;
      }
      if (!skip) {
        const storageKey = applyOverride(key, rating, { labelOverride });
        if (ref.kind === "fixed") modifiedFixedKeys.add(ref.key);
        else if (storageKey) {
          markTypedModified(ref, labelOverride ?? ref.label);
        }
      }
    }
  }

  for (const key of formState.checkedOptionKeys ?? []) {
    if (optionSkills[key] || optionSkills[key] === 0) {
      const ref = parseProfessionSkillKey(key);
      if (ref) {
        let labelOverride;
        let skip = false;
        if (ref.kind === "typed" && optionMeta[key]?.chooseOne) {
          labelOverride = formState.chooseOneLabels?.[key]?.trim();
          if (!labelOverride) skip = true;
        } else if (ref.kind === "typed") {
          labelOverride = ref.label?.trim();
          if (!labelOverride) skip = true;
        }
        if (!skip) {
          const storageKey = applyOverride(key, optionSkills[key], {
            labelOverride,
          });
          if (ref.kind === "fixed") modifiedFixedKeys.add(ref.key);
          else if (storageKey) {
            markTypedModified(ref, labelOverride ?? ref.label);
          }
        }
      }
    }
  }

  /** Pre-bonus base for cap warnings */
  const baseFixed = { ...fixedValues };
  const baseTyped = foundry.utils.deepClone(typedValues);

  const bonusResult = applyBonusSkillPicks(baseFixed, baseTyped, formState);

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

  for (const [key, final] of Object.entries(bonusResult.fixedValues)) {
    const base = baseFixed[key] ?? defaults[key] ?? 0;
    const ref = /** @type {FixedSkillRef} */ ({ kind: "fixed", key });
    checkCap(formatProfessionSkillLabel(ref), base, final);
  }

  for (const [storageKey, data] of Object.entries(bonusResult.typedValues)) {
    const base = baseTyped[storageKey]?.value ?? 0;
    const ref = /** @type {TypedSkillRef} */ ({
      kind: "typed",
      group: data.group,
      label: data.label,
    });
    checkCap(formatProfessionSkillLabel(ref), base, data.value);
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
      formState.bonusCatalogIds ?? [],
      formState.bonusTypedLabels ?? [],
    ),
  );

  return {
    fixedValues: bonusResult.fixedValues,
    typedValues: bonusResult.typedValues,
    capWarnings,
    isValid: validationErrors.length === 0,
    validationErrors,
    modifiedFixedKeys: [
      ...new Set([...modifiedFixedKeys, ...bonusResult.modifiedFixedKeys]),
    ],
    modifiedTypedKeys: [
      ...new Set([...modifiedTypedKeys, ...bonusResult.modifiedTypedKeys]),
    ],
  };
}
