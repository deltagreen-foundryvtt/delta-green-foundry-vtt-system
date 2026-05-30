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

export const TYPED_GROUP_I18N = {
  Art: "DG.TypeSkills.Art",
  Craft: "DG.TypeSkills.Craft",
  ForeignLanguage: "DG.TypeSkills.ForeignLanguage",
  MilitaryScience: "DG.TypeSkills.MilitaryScience",
  Pilot: "DG.TypeSkills.Pilot",
  Science: "DG.TypeSkills.Science",
  Other: "DG.TypeSkills.Other",
};

export const BONUS_SKILL_COUNT = 8;
export const BONUS_SKILL_INCREMENT = 20;

/** @type {ReadonlySet<string>} */
export const BONUS_SKILL_CATALOG_EXCLUDED_FIXED = new Set(["unnatural"]);
export const SKILL_CAP = 80;
/** Bonus picks that would waste this many points or more are rejected (e.g. 80 + 20% at cap). */
export const MAX_ALLOWED_BONUS_WASTE = 20;

export const TYPED_KEY_PATTERN =
  /^(Art|Craft|Foreign Language|ForeignLanguage|Military Science|MilitaryScience|Pilot|Science|Other)\s*\(([^)]+)\)\s*$/i;

/** Legacy internal keys from earlier builds (`typed:ForeignLanguage:abc12345`). */
export const INTERNAL_TYPED_KEY_PATTERN =
  /^typed:([A-Za-z]+):([A-Za-z0-9]{8,16})(?::(.+))?$/;
