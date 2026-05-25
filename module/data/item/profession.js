import defineBaseItemSystemFields from "./base-fields.js";

const { NumberField, ObjectField } = foundry.data.fields;

/** Reserved key inside {@link ProfessionItemData.optionSkills}. */
export const PROFESSION_OPTION_PICKS_KEY = "optionPicks";

export default class ProfessionItemData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      ...defineBaseItemSystemFields(),
      bonds: new NumberField({ initial: 0, min: 0, max: 5, integer: true }),
      automaticSkills: new ObjectField({ initial: {} }),
      automaticSkillMeta: new ObjectField({ initial: {} }),
      optionSkills: new ObjectField({ initial: { [PROFESSION_OPTION_PICKS_KEY]: 0 } }),
      optionSkillMeta: new ObjectField({ initial: {} }),
    };
  }
}

/** @typedef {{ chooseOne?: boolean }} ProfessionSkillMeta */
