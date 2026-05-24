import HumanSkillsActorData from "./base/human-skills.js";
import CharacterData from "./base/character.js";
import DGHTMLField from "../fields/html-content-field.js";
import {
  calculateHealthMax,
  calculateMeleeDamageBonusFormula,
  clampSanityRitualValue,
  computeEquippedArmorProtection,
  initializeSanityIfUnset,
  prepareAgentSkillFlags,
  prepareBreakingPointHit,
  prepareSanityAdaptations,
  prepareStatisticsX5,
  removeLegacyRitualSkill,
} from "../../utils/derived-actor-data.js";

const { SchemaField, NumberField, StringField, BooleanField, HTMLField } =
  foundry.data.fields;

export default class AgentData extends CharacterData {
  static defineSchema() {
    const superData = super.defineSchema();

    return {
      ...superData,
      ...HumanSkillsActorData.defineSchema(),
      schemaVersion: new NumberField({ initial: 2.0 }),
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
        description: DGHTMLField(),
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

  /** @inheritdoc */
  prepareDerivedData() {
    prepareStatisticsX5(this.statistics);
    removeLegacyRitualSkill(this);
    clampSanityRitualValue(this.sanity);
    prepareAgentSkillFlags(this.skills);

    this.wp.max = this.statistics.pow.value;
    this.health.max = calculateHealthMax(this.statistics);
    initializeSanityIfUnset(this.sanity, this.statistics);
    this.sanity.max = 99 - this.skills.unnatural.proficiency;
    prepareSanityAdaptations(this.sanity.adaptations);
    prepareBreakingPointHit(this.sanity);

    this.health.protection = computeEquippedArmorProtection(
      this.parent.items,
    );
    this.statistics.str.meleeDamageBonusFormula =
      calculateMeleeDamageBonusFormula(this.statistics.str.value);

    if (this.physical.exhaustedPenalty > 0) {
      this.physical.exhaustedPenalty =
        -1 * Math.abs(this.physical.exhaustedPenalty);
    }
  }
}
