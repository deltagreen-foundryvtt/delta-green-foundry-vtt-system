/** @type {Record<string, { label: string, fields: Record<string, string> }>} */
export const EFFECT_FIELD_GROUPS = {
  statistics: {
    label: "DG.ActiveEffects.Groups.Statistics",
    fields: {
      "system.statistics.str.modifier": "DG.Attributes.str",
      "system.statistics.con.modifier": "DG.Attributes.con",
      "system.statistics.dex.modifier": "DG.Attributes.dex",
      "system.statistics.int.modifier": "DG.Attributes.int",
      "system.statistics.pow.modifier": "DG.Attributes.pow",
      "system.statistics.cha.modifier": "DG.Attributes.cha",
    },
  },
  resources: {
    label: "DG.ActiveEffects.Groups.Resources",
    fields: {
      "system.health.maxBonus": "DG.ActiveEffects.Fields.MaxHP",
      "system.wp.maxBonus": "DG.ActiveEffects.Fields.MaxWP",
      "system.sanity.maxBonus": "DG.ActiveEffects.Fields.MaxSanity",
    },
  },
  rollTargets: {
    label: "DG.ActiveEffects.Groups.RollTargets",
    fields: {
      "system.rollTarget.allSkills": "DG.ActiveEffects.Fields.AllSkills",
      "system.rollTarget.sanity": "DG.ActiveEffects.Fields.SanityRolls",
      "system.rollTarget.statistics": "DG.ActiveEffects.Fields.StatisticRolls",
    },
  },
};

export const ROLL_TARGET_FIELD_KEYS = Object.keys(
  EFFECT_FIELD_GROUPS.rollTargets.fields,
);

export const SUPPORTED_ITEM_TYPES = new Set([
  "weapon",
  "armor",
  "gear",
  "bond",
  "motivation",
]);

/**
 * @param {ActiveEffect} effect
 * @returns {Record<string, { label: string, fields: Record<string, string> }>}
 */
export function getEffectFieldGroupsForDocument(effect) {
  const parent = effect.parent;

  if (parent?.documentName === "Actor") {
    if (parent.type !== "agent") return {};
    return EFFECT_FIELD_GROUPS;
  }

  if (parent?.documentName === "Item") {
    if (!SUPPORTED_ITEM_TYPES.has(parent.type)) return {};
    return EFFECT_FIELD_GROUPS;
  }

  return {};
}

/**
 * @param {Record<string, { label: string, fields: Record<string, string> }>} groups
 * @returns {Array<{ group: string, groupLabel: string, options: Array<{ value: string, label: string }> }>}
 */
export function buildEffectFieldSelectOptions(groups) {
  return Object.entries(groups).map(([groupId, group]) => ({
    group: groupId,
    groupLabel: game.i18n.localize(group.label),
    options: Object.entries(group.fields).map(([value, labelKey]) => ({
      value,
      label: game.i18n.localize(labelKey),
    })),
  }));
}
