import defineBaseItemSystemFields from "./base-fields.js";

const { NumberField, StringField, BooleanField } = foundry.data.fields;

export default class ArmorItemData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      ...defineBaseItemSystemFields(),
      protection: new NumberField({ initial: 3, integer: true }),
      equipped: new BooleanField({ initial: true }),
      expense: new StringField({ initial: "Standard" }),
    };
  }
}
