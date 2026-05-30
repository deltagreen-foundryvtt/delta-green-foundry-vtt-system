import { BONUS_SKILL_COUNT } from "./constants.js";
import { catalogIdToSkillRef, getBonusTrackLabel } from "./catalog.js";
import {
  getTypedGroupDisplayName,
  normalizeTypedGroup,
  normalizeTypedSkillName,
  parseProfessionSkillKey,
} from "./keys.js";

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
export function validateProfessionFormState(
  optionPicks,
  formState,
  context = {},
) {
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
  /** @type {string[]} */
  const bonusWasteTrackKeys = [];

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
    const bonusWaste = code.match(/^bonusWaste:\d+\|(\d+)\|(.+)$/);
    if (bonusWaste) {
      bonusWasteTrackKeys.push(bonusWaste[2]);
      continue;
    }

    if (code.startsWith("bonusType")) {
      needsBonusSkillType = true;
      continue;
    }
    if (/^bonus\d+$/.test(code)) {
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
  if (needsBondName) {
    push(game.i18n.localize("DG.Profession.Dialog.BondNameRequired"));
  }
  if (needsBondRelationship) {
    push(game.i18n.localize("DG.Profession.Dialog.BondRelationshipRequired"));
  }

  for (const trackKey of bonusWasteTrackKeys) {
    push(
      game.i18n.format("DG.Profession.Dialog.BonusSkillWasteTooHigh", {
        skill: getBonusTrackLabel(trackKey),
      }),
    );
  }

  return messages;
}
