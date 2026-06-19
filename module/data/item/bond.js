import defineBaseItemSystemFields from "./base-fields.js";

const { NumberField, StringField, BooleanField } = foundry.data.fields;

export default class BondItemData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      ...defineBaseItemSystemFields(),
      score: new NumberField({ initial: 10, integer: true }),
      relationship: new StringField({ initial: "" }),
      hasBeenDamagedSinceLastHomeScene: new BooleanField({ initial: false }),
    };
  }
}
