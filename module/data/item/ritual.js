import defineBaseItemSystemFields from "./base-fields.js";

const { NumberField, StringField, BooleanField, SchemaField, HTMLField } =
  foundry.data.fields;

export default class RitualItemData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      ...defineBaseItemSystemFields(),
      studyTime: new StringField({ initial: "" }),
      sanity: new SchemaField({
        notes: new StringField({ initial: "" }),
        failedLoss: new StringField({ initial: "1D10" }),
        successLoss: new StringField({ initial: "0" }),
      }),
      learnedSanity: new SchemaField({
        notes: new StringField({ initial: "" }),
        failedLoss: new StringField({ initial: "1D10" }),
        successLoss: new StringField({ initial: "0" }),
      }),
      unnaturalSkillIncrease: new NumberField({ initial: 1, integer: true }),
      activationCosts: new StringField({ initial: "" }),
      activationTime: new StringField({ initial: "" }),
      complexity: new StringField({ initial: "Simple" }),
      handlerNotes: new HTMLField({ initial: "", blank: true, textSearch: true }),
      revealed: new BooleanField({ initial: false }),
    };
  }
}
