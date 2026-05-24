import HumanSkillsActorData from "./base/human-skills.js";
import CharacterData from "./base/character.js";
import DGHTMLField from "../fields/html-content-field.js";
import {
  calculateHealthMax,
  calculateMeleeDamageBonusFormula,
  clampSanityRitualValue,
  computeEquippedArmorProtection,
  initializeSanityIfUnset,
  prepareStatisticsX5,
  removeLegacyRitualSkill,
  setSkillTargetProficiencies,
} from "../../utils/derived-actor-data.js";

const { SchemaField, NumberField, StringField, BooleanField, HTMLField } =
  foundry.data.fields;

export default class NPCData extends CharacterData {
  static defineSchema() {
    const superData = super.defineSchema();

    return {
      ...superData,
      ...HumanSkillsActorData.defineSchema(),
      schemaVersion: new NumberField({ initial: 2.0 }),
      sanity: new SchemaField({
        value: new NumberField({ initial: 100 }),
        currentBreakingPoint: new NumberField({ initial: 101 }),
      }),
      biography: new SchemaField({
        profession: new StringField({ initial: "" }),
      }),
      notes: DGHTMLField(),
      shortDescription: new StringField({ initial: "" }),
      showUntrainedSkills: new BooleanField({ initial: true }),
    };
  }

  /** @inheritdoc */
  prepareDerivedData() {
    prepareStatisticsX5(this.statistics);
    initializeSanityIfUnset(this.sanity, this.statistics);
    this.sanity.max = 99 - this.skills.unnatural.proficiency;
    this.wp.max = this.statistics.pow.value;
    this.health.max = calculateHealthMax(this.statistics);
    this.statistics.str.meleeDamageBonusFormula =
      calculateMeleeDamageBonusFormula(this.statistics.str.value);
    removeLegacyRitualSkill(this);
    clampSanityRitualValue(this.sanity);
    this.health.protection = computeEquippedArmorProtection(this.parent.items);
    setSkillTargetProficiencies(this.skills);
  }
}
