import defineBaseItemSystemFields from "./base-fields.js";

const { StringField, BooleanField } = foundry.data.fields;

export default class MotivationItemData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      ...defineBaseItemSystemFields(),
      disorder: new StringField({ initial: "" }),
      crossedOut: new BooleanField({ initial: false }),
      disorderCured: new BooleanField({ initial: false }),
    };
  }
}
