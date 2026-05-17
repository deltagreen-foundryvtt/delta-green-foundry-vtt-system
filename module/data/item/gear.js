import defineBaseItemSystemFields from "./base-fields.js";

const { StringField, BooleanField } = foundry.data.fields;

export default class GearItemData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      ...defineBaseItemSystemFields(),
      equipped: new BooleanField({ initial: true }),
      expense: new StringField({ initial: "Standard" }),
    };
  }
}
