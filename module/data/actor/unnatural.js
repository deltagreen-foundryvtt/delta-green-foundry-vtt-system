import UnnaturalSkillsActorData from "./base/unnatural-skills.js";
import CharacterData from "./base/character.js";

const { SchemaField, NumberField, StringField, BooleanField } =
  foundry.data.fields;

export default class UnnaturalData extends CharacterData {
  static defineSchema() {
    const superData = super.defineSchema();

    return {
      ...superData,
      ...UnnaturalSkillsActorData.defineSchema(),
      sanity: new SchemaField({
        notes: new StringField({ initial: "" }),
        failedLoss: new StringField({ initial: "1D4" }),
        successLoss: new StringField({ initial: "1" }),
      }),
      schemaVersion: new NumberField({ initial: 1.0 }),
      notes: new StringField({ initial: "" }),
      shortDescription: new StringField({ initial: "" }),
      showUntrainedSkills: new BooleanField({ initial: true }),
    };
  }
}
