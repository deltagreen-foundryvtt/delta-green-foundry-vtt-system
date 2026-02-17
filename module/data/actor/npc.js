import HumanSkillsActorData from "./base/human-skills.js";
import CharacterData from "./base/character.js";

const { SchemaField, NumberField, StringField, BooleanField } =
  foundry.data.fields;

export default class NPCData extends CharacterData {
  static defineSchema() {
    const superData = super.defineSchema();

    return {
      ...superData,
      ...HumanSkillsActorData.defineSchema(),
      schemaVersion: new NumberField({ initial: 1.0 }),
      sanity: new SchemaField({
        value: new NumberField({ initial: 100 }),
        currentBreakingPoint: new NumberField({ initial: 101 }),
      }),
      notes: new StringField({ initial: "" }),
      shortDescription: new StringField({ initial: "" }),
      showUntrainedSkills: new BooleanField({ initial: true }),
    };
  }
}
