import DG from "../config.js";
import { PROFESSION_OPTION_PICKS_KEY } from "../data/item/profession.js";

/** @typedef {"fixed" | "typed"} ProfessionSkillKind */

/** @typedef {{ kind: "fixed", key: string }} FixedSkillRef */

/** @typedef {{ kind: "typed", group: string, label: string }} TypedSkillRef */

/** @typedef {FixedSkillRef | TypedSkillRef} ProfessionSkillRef */

/** @typedef {{ chooseOne?: boolean }} ProfessionSkillMeta */

/** Typed skill template groups (camelCase storage keys). */
export const TYPED_SKILL_TEMPLATE_GROUPS = /** @type {const} */ ([
  "Art",
  "Craft",
  "ForeignLanguage",
  "MilitaryScience",
  "Pilot",
  "Science",
  "Other",
]);

const TYPED_GROUP_I18N = {
  Art: "DG.TypeSkills.Art",
  Craft: "DG.TypeSkills.Craft",
  ForeignLanguage: "DG.TypeSkills.ForeignLanguage",
  MilitaryScience: "DG.TypeSkills.MilitaryScience",
  Pilot: "DG.TypeSkills.Pilot",
  Science: "DG.TypeSkills.Science",
  Other: "DG.TypeSkills.Other",
};

/** Agent default skill ratings (from human-skills schema initials). */
const AGENT_SKILL_DEFAULTS = /** @type {Record<string, number>} */ ({
  accounting: 10,
  alertness: 20,
  anthropology: 0,
  archeology: 0,
  artillery: 0,
  athletics: 30,
  bureaucracy: 10,
  computer_science: 0,
  criminology: 10,
  demolitions: 0,
  disguise: 10,
  dodge: 30,
  drive: 20,
  firearms: 20,
  first_aid: 10,
  forensics: 0,
  heavy_machiner: 10,
  heavy_weapons: 0,
  history: 10,
  humint: 10,
  law: 0,
  medicine: 0,
  melee_weapons: 30,
  navigate: 10,
  occult: 10,
  persuade: 20,
  pharmacy: 0,
  psychotherapy: 10,
  ride: 10,
  search: 20,
  sigint: 0,
  stealth: 10,
  surgery: 0,
  survival: 10,
  swim: 20,
  unarmed_combat: 40,
  unnatural: 0,
});

const BONUS_SKILL_COUNT = 8;
const BONUS_SKILL_INCREMENT = 20;
const SKILL_CAP = 80;

const TYPED_KEY_PATTERN =
  /^(Art|Craft|Foreign Language|ForeignLanguage|Military Science|MilitaryScience|Pilot|Science|Other)\s*\(([^)]+)\)\s*$/i;

/** Legacy internal keys from earlier builds (`typed:ForeignLanguage:abc12345`). */
const INTERNAL_TYPED_KEY_PATTERN =
  /^typed:([A-Za-z]+):([A-Za-z0-9]{8,16})(?::(.+))?$/;

/**
 * @returns {string}
 */
export function getChooseOnePlaceholderLabel() {
  return game.i18n.localize("DG.Profession.ChooseOnePlaceholder");
}

/**
 * @param {string} label
 * @returns {string}
 */
export function normalizeTypedSkillName(label) {
  return label.trim().toLocaleLowerCase(game.i18n.lang);
}

/**
 * @param {string} label
 * @returns {boolean}
 */
export function isChooseOnePlaceholderLabel(label) {
  return (
    normalizeTypedSkillName(label) ===
    normalizeTypedSkillName(getChooseOnePlaceholderLabel())
  );
}

/**
 * @param {string} mapKey
 * @param {Record<string, ProfessionSkillMeta>} automaticMeta
 * @param {Record<string, ProfessionSkillMeta>} optionMeta
 * @returns {boolean}
 */
export function isChooseOneProfessionSkillKey(
  mapKey,
  automaticMeta = {},
  optionMeta = {},
) {
  return Boolean(
    automaticMeta[mapKey]?.chooseOne ?? optionMeta[mapKey]?.chooseOne,
  );
}

/**
 * @param {string} mapKey
 * @param {Record<string, ProfessionSkillMeta>} automaticMeta
 * @param {Record<string, ProfessionSkillMeta>} optionMeta
 * @returns {ProfessionSkillMeta}
 */
export function getProfessionSkillMeta(mapKey, automaticMeta, optionMeta) {
  return automaticMeta[mapKey] ?? optionMeta[mapKey] ?? {};
}

/**
 * @param {object} params
 * @param {string} params.group
 * @param {string} params.label
 * @param {boolean} params.chooseOne
 * @param {Record<string, number>} params.automaticSkills
 * @param {Record<string, number>} params.optionSkills
 * @param {Record<string, ProfessionSkillMeta>} [params.automaticMeta]
 * @param {Record<string, ProfessionSkillMeta>} [params.optionMeta]
 * @param {string} [params.excludeKey]
 * @returns {string | null} Conflicting map key, if any.
 */
export function findTypedSkillNameConflict({
  group,
  label,
  chooseOne,
  automaticSkills,
  optionSkills,
  automaticMeta = {},
  optionMeta = {},
  excludeKey = null,
}) {
  // Multiple choose-one slots per category are allowed on the profession item.
  if (chooseOne) return null;
  if (!group) return null;

  const normalizedGroup = normalizeTypedGroup(group);
  const normalizedNew = normalizeTypedSkillName(label);
  if (!normalizedNew) return "__empty__";

  const maps = [
    [automaticSkills, automaticMeta],
    [optionSkills, optionMeta],
  ];

  for (const [skillMap, metaMap] of maps) {
    for (const mapKey of Object.keys(skillMap ?? {})) {
      if (mapKey === excludeKey || mapKey === PROFESSION_OPTION_PICKS_KEY) continue;

      const ref = parseProfessionSkillKey(mapKey);
      if (!ref || ref.kind !== "typed") continue;
      if (normalizeTypedGroup(ref.group) !== normalizedGroup) continue;

      // Unresolved choose-one slots have no fixed name yet.
      if (metaMap[mapKey]?.chooseOne) continue;

      if (normalizeTypedSkillName(ref.label) === normalizedNew) return mapKey;
    }
  }

  return null;
}

/**
 * @returns {Record<string, number>}
 */
export function getAgentSkillDefaults() {
  return { ...AGENT_SKILL_DEFAULTS };
}

/**
 * @param {string} group
 * @returns {string}
 */
export function normalizeTypedGroup(group) {
  if (group == null) return "";
  const trimmed = String(group).trim();
  const map = {
    "Foreign Language": "ForeignLanguage",
    "Military Science": "MilitaryScience",
  };
  return map[trimmed] ?? trimmed.replace(/\s+/g, "");
}

/**
 * @param {string} group
 * @returns {string}
 */
export function getTypedGroupDisplayName(group) {
  const key = normalizeTypedGroup(group);
  const i18nKey = TYPED_GROUP_I18N[key];
  if (i18nKey) return game.i18n.localize(i18nKey);
  return group;
}

/**
 * @param {ProfessionSkillRef} ref
 * @returns {string}
 */
export function formatProfessionSkillKey(ref) {
  if (ref.kind === "fixed") return ref.key;
  const groupLabel = getTypedGroupDisplayName(ref.group);
  return `${groupLabel} (${ref.label.trim()})`;
}

/**
 * Storage key for a profession skill map entry.
 *
 * @param {ProfessionSkillRef} ref
 * @param {{ chooseOne?: boolean }} [options]
 * @returns {string}
 */
export function allocateProfessionSkillStorageKey(ref, { chooseOne = false } = {}) {
  if (ref.kind === "fixed") return ref.key;
  if (chooseOne) {
    return `typed:${normalizeTypedGroup(ref.group)}:${foundry.utils.randomID(8)}`;
  }
  const label = ref.label?.trim() ?? "";
  return formatProfessionSkillKey({
    kind: "typed",
    group: ref.group,
    label,
  });
}

/**
 * @param {string} key
 * @returns {ProfessionSkillRef | null}
 */
export function parseProfessionSkillKey(key) {
  if (!key || key === PROFESSION_OPTION_PICKS_KEY) return null;
  if (DG.skills.includes(key)) return { kind: "fixed", key };

  const internalMatch = key.match(INTERNAL_TYPED_KEY_PATTERN);
  if (internalMatch) {
    let label = "";
    if (internalMatch[3] !== undefined) {
      try {
        label = decodeURIComponent(internalMatch[3]);
      } catch {
        label = internalMatch[3];
      }
    }
    return {
      kind: "typed",
      group: internalMatch[1],
      label,
    };
  }

  const match = key.match(TYPED_KEY_PATTERN);
  if (match) {
    return {
      kind: "typed",
      group: normalizeTypedGroup(match[1]),
      label: match[2].trim(),
    };
  }
  return null;
}

/**
 * @param {ProfessionSkillRef} ref
 * @returns {string}
 */
export function formatProfessionSkillLabel(ref) {
  if (ref.kind === "fixed") {
    if (game.i18n.lang === "ja") {
      const ja = game.i18n.localize(`DG.Skills.ruby.${ref.key}`);
      if (ja && ja !== `DG.Skills.ruby.${ref.key}`) return ja;
    }
    const label = game.i18n.localize(`DG.Skills.${ref.key}`);
    if (label && label !== `DG.Skills.${ref.key}`) return label;
    return ref.key;
  }
  if (!ref.label?.trim()) return getTypedGroupDisplayName(ref.group);
  return formatProfessionSkillKey(ref);
}

/**
 * @param {string} key
 * @param {object} [metaContext]
 * @param {Record<string, ProfessionSkillMeta>} [metaContext.automaticMeta]
 * @param {Record<string, ProfessionSkillMeta>} [metaContext.optionMeta]
 * @returns {string}
 */
export function formatProfessionSkillKeyLabel(
  key,
  { automaticMeta = {}, optionMeta = {} } = {},
) {
  const ref = parseProfessionSkillKey(key);
  if (!ref) return key;
  if (
    ref.kind === "typed" &&
    isChooseOneProfessionSkillKey(key, automaticMeta, optionMeta)
  ) {
    return formatProfessionSkillKey({
      kind: "typed",
      group: ref.group,
      label: getChooseOnePlaceholderLabel(),
    });
  }
  if (ref.kind === "typed" && !ref.label?.trim()) {
    return getTypedGroupDisplayName(ref.group);
  }
  return formatProfessionSkillLabel(ref);
}

/**
 * @param {Record<string, number>} obj
 * @returns {{ optionPicks: number, skills: Record<string, number> }}
 */
export function splitProfessionSkillMap(obj) {
  const source = obj ?? {};
  const optionPicks = Number(source[PROFESSION_OPTION_PICKS_KEY]) || 0;
  /** @type {Record<string, number>} */
  const skills = {};
  for (const [key, value] of Object.entries(source)) {
    if (key === PROFESSION_OPTION_PICKS_KEY) continue;
    skills[key] = Number(value);
  }
  return { optionPicks, skills };
}

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
    const ref = /** @type {TypedSkillRef} */ ({ kind: "typed", group, label: "" });
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

    const label =
      options.labelOverride?.trim() ?? ref.label?.trim() ?? "";
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

/**
 * @param {number} optionPicks
 * @param {object} formState
 * @param {object} [context]
 * @param {Record<string, number>} [context.automaticSkills]
 * @param {Record<string, number>} [context.optionSkills]
 * @param {Record<string, ProfessionSkillMeta>} [context.automaticMeta]
 * @param {Record<string, ProfessionSkillMeta>} [context.optionMeta]
 * @param {number} [context.bondCount]
 * @returns {string[]}
 */
export function validateProfessionFormState(optionPicks, formState, context = {}) {
  const errors = [];
  const checked = formState.checkedOptionKeys ?? new Set();
  const picks = Number(optionPicks) || 0;
  const {
    automaticSkills = {},
    optionSkills = {},
    automaticMeta = {},
    optionMeta = {},
    bondCount = 0,
  } = context;

  if (checked.size !== picks) {
    errors.push("optionPicks");
  }

  for (let i = 0; i < bondCount; i++) {
    if (!formState.bondNames?.[i]?.trim()) errors.push(`bondName${i}`);
    if (!formState.bondRelationships?.[i]?.trim()) {
      errors.push(`bondRelationship${i}`);
    }
  }

  for (let i = 0; i < BONUS_SKILL_COUNT; i++) {
    const catalogId = formState.bonusCatalogIds?.[i];
    if (!catalogId) {
      errors.push(`bonus${i}`);
      continue;
    }
    const ref = catalogIdToSkillRef(
      catalogId,
      formState.bonusTypedLabels?.[i] ?? "",
    );
    if (!ref) {
      errors.push(`bonus${i}`);
      continue;
    }
    if (ref.kind === "typed" && !formState.bonusTypedLabels?.[i]?.trim()) {
      errors.push(`bonusType${i}`);
    }
  }

  /** @type {Map<string, Set<string>>} */
  const resolvedByGroup = new Map();

  const registerResolvedName = (ref, rawLabel) => {
    const label = rawLabel?.trim();
    if (!label) {
      errors.push(`typedNameRequired:${ref.group}`);
      return;
    }
    const group = normalizeTypedGroup(ref.group);
    const normalized = normalizeTypedSkillName(label);
    if (!resolvedByGroup.has(group)) resolvedByGroup.set(group, new Set());
    const names = resolvedByGroup.get(group);
    if (names.has(normalized)) {
      errors.push(`typedNameConflict:${group}:${label}`);
      return;
    }
    names.add(normalized);
  };

  for (const [key] of Object.entries(automaticSkills)) {
    const ref = parseProfessionSkillKey(key);
    if (!ref || ref.kind !== "typed") continue;
    if (automaticMeta[key]?.chooseOne) {
      registerResolvedName(ref, formState.chooseOneLabels?.[key]);
    } else {
      registerResolvedName(ref, ref.label);
    }
  }

  for (const key of checked) {
    const ref = parseProfessionSkillKey(key);
    if (!ref || ref.kind !== "typed") continue;
    if (optionMeta[key]?.chooseOne) {
      registerResolvedName(ref, formState.chooseOneLabels?.[key]);
    } else {
      registerResolvedName(ref, ref.label);
    }
  }

  return errors;
}

/**
 * User-facing messages for Add Profession validation error codes.
 * @param {string[]} errors
 * @param {object} [context]
 * @param {number} [context.optionPicks]
 * @returns {string[]}
 */
export function formatProfessionValidationMessages(
  errors,
  { optionPicks = 0 } = {},
) {
  const messages = [];
  const seen = new Set();

  const push = (msg) => {
    if (seen.has(msg)) return;
    seen.add(msg);
    messages.push(msg);
  };

  let needsOptionPicks = false;
  let needsBondName = false;
  let needsBondRelationship = false;
  let needsBonusSkill = false;
  let needsBonusSkillType = false;
  /** @type {Set<string>} */
  const typedNameRequiredGroups = new Set();

  for (const code of errors) {
    if (code === "optionPicks") {
      needsOptionPicks = true;
      continue;
    }
    if (code.startsWith("bondName")) {
      needsBondName = true;
      continue;
    }
    if (code.startsWith("bondRelationship")) {
      needsBondRelationship = true;
      continue;
    }
    if (code.startsWith("bonusType")) {
      needsBonusSkillType = true;
      continue;
    }
    if (code.startsWith("bonus")) {
      needsBonusSkill = true;
      continue;
    }

    const typedNameRequired = code.match(/^typedNameRequired:(.+)$/);
    if (typedNameRequired) {
      typedNameRequiredGroups.add(typedNameRequired[1]);
      continue;
    }

    const conflict = code.match(/^typedNameConflict:([^:]+):(.+)$/);
    if (conflict) {
      const [, group, name] = conflict;
      push(
        game.i18n.format("DG.Profession.Dialog.DuplicateTypedName", {
          type: getTypedGroupDisplayName(group),
          name,
        }),
      );
    }
  }

  if (needsOptionPicks) {
    push(
      game.i18n.format("DG.Profession.Dialog.OptionPicksRequired", {
        picks: optionPicks,
      }),
    );
  }
  if (needsBondName) {
    push(game.i18n.localize("DG.Profession.Dialog.BondNameRequired"));
  }
  if (needsBondRelationship) {
    push(game.i18n.localize("DG.Profession.Dialog.BondRelationshipRequired"));
  }
  if (needsBonusSkill) {
    push(
      game.i18n.format("DG.Profession.Dialog.BonusSkillRequired", {
        count: BONUS_SKILL_COUNT,
      }),
    );
  }
  if (needsBonusSkillType) {
    push(game.i18n.localize("DG.Profession.Dialog.BonusSkillTypeRequired"));
  }
  for (const group of typedNameRequiredGroups) {
    push(
      game.i18n.format("DG.Profession.Dialog.TypedNameRequired", {
        type: getTypedGroupDisplayName(group),
      }),
    );
  }

  return messages;
}

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
  rows.sort((a, b) =>
    a.sortLabel.localeCompare(b.sortLabel, game.i18n.lang),
  );
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
  rows.sort((a, b) =>
    a.sortLabel.localeCompare(b.sortLabel, game.i18n.lang),
  );
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
  rows.sort((a, b) =>
    a.sortLabel.localeCompare(b.sortLabel, game.i18n.lang),
  );
  return rows;
}

export { BONUS_SKILL_COUNT, BONUS_SKILL_INCREMENT, SKILL_CAP };
