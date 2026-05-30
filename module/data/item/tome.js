import defineBaseItemSystemFields from "./base-fields.js";
import DGHTMLField from "../fields/html-content-field.js";

const { NumberField, StringField, BooleanField, SchemaField } =
  foundry.data.fields;

export default class TomeItemData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      ...defineBaseItemSystemFields(),
      language: new StringField({ initial: "" }),
      studyTime: new StringField({ initial: "" }),
      unnaturalSkillIncrease: new NumberField({ initial: 5, integer: true }),
      occultSkillIncrease: new NumberField({ initial: 3, integer: true }),
      sanity: new SchemaField({
        notes: new StringField({ initial: "" }),
        failedLoss: new StringField({ initial: "1D6" }),
        successLoss: new StringField({ initial: "1D4" }),
      }),
      handlerNotes: DGHTMLField(),
      revealed: new BooleanField({ initial: false }),
    };
  }
}
