import DG from "../config/index.js";
import AGENT_SKILL_DEFAULTS from "../data/actor/base/agent-skill-defaults.js";
import { PROFESSION_OPTION_PICKS_KEY } from "../data/item/profession.js";
import {
  INTERNAL_TYPED_KEY_PATTERN,
  TYPED_KEY_PATTERN,
  TYPED_GROUP_I18N,
} from "./constants.js";
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
        const [, , , fallbackLabel] = internalMatch;
        label = fallbackLabel;
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
      if (mapKey !== excludeKey && mapKey !== PROFESSION_OPTION_PICKS_KEY) {
        const ref = parseProfessionSkillKey(mapKey);
        if (
          ref &&
          ref.kind === "typed" &&
          normalizeTypedGroup(ref.group) === normalizedGroup &&
          !metaMap[mapKey]?.chooseOne &&
          normalizeTypedSkillName(ref.label) === normalizedNew
        ) {
          return mapKey;
        }
      }
    }
  }

  return null;
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
export function allocateProfessionSkillStorageKey(
  ref,
  { chooseOne = false } = {},
) {
  if (ref.kind === "fixed") return ref.key;
  if (chooseOne) {
    return `typed:${normalizeTypedGroup(ref.group)}:${foundry.utils.randomID(
      8,
    )}`;
  }
  const label = ref.label?.trim() ?? "";
  return formatProfessionSkillKey({
    kind: "typed",
    group: ref.group,
    label,
  });
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
    if (key !== PROFESSION_OPTION_PICKS_KEY) {
      skills[key] = Number(value);
    }
  }
  return { optionPicks, skills };
}
