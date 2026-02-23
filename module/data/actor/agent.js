import HumanSkillsActorData from "./base/human-skills.js";
import CharacterData from "./base/character.js";

const { SchemaField, NumberField, StringField, BooleanField } =
  foundry.data.fields;

export default class AgentData extends CharacterData {
  static defineSchema() {
    const superData = super.defineSchema();

    return {
      ...superData,
      ...HumanSkillsActorData.defineSchema(),
      schemaVersion: new NumberField({ initial: 1.0 }),
      sanity: new SchemaField({
        value: new NumberField({ initial: 100 }),
        currentBreakingPoint: new NumberField({ initial: 101 }),
        adaptations: new SchemaField({
          violence: new SchemaField({
            incident1: new BooleanField({ initial: false }),
            incident2: new BooleanField({ initial: false }),
            incident3: new BooleanField({ initial: false }),
          }),
          helplessness: new SchemaField({
            incident1: new BooleanField({ initial: false }),
            incident2: new BooleanField({ initial: false }),
            incident3: new BooleanField({ initial: false }),
          }),
        }),
      }),
      physical: new SchemaField({
        description: new StringField({
          initial: "",
        }),
        wounds: new StringField({ initial: "" }),
        firstAidAttempted: new BooleanField({ initial: false }),
        exhausted: new BooleanField({ initial: false }),
        exhaustedPenalty: new NumberField({ initial: -20 }),
      }),
      biography: new SchemaField({
        profession: new StringField({ initial: "" }),
        employer: new StringField({ initial: "" }),
        nationality: new StringField({ initial: "" }),
        sex: new StringField({ initial: "" }),
        age: new StringField({ initial: "" }),
        education: new StringField({ initial: "" }),
      }),
      corruption: new SchemaField({
        value: new NumberField({ initial: 0 }),
        haveSeenTheYellowSign: new BooleanField({ initial: false }),
        gift: new StringField({ initial: "" }),
        insight: new StringField({ initial: "" }),
      }),
    };
  }
}
