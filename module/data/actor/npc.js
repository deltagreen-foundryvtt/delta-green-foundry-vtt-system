import HumanSkillsActorData from "./base/human-skills.js";
import CharacterData from "./base/character.js";
import DGHTMLField from "../fields/html-content-field.js";
import {
  calculateHealthMax,
  calculateMeleeDamageBonusFormula,
  clampSanityRitualValue,
  cleanDerivedNumber,
  computeEquippedArmorProtection,
  initializeSanityIfUnset,
  prepareStatisticsX5,
  removeLegacyRitualSkill,
  setSkillTargetProficiencies,
} from "../../data/derived/actor-derived.js";

const { SchemaField, NumberField, StringField, BooleanField } =
  foundry.data.fields;

export default class NPCData extends CharacterData {
  static defineSchema() {
    const superData = super.defineSchema();

    return {
      ...superData,
      ...HumanSkillsActorData.defineSchema(),
      schemaVersion: new NumberField({ initial: 2.0 }),
      sanity: new SchemaField({
        value: new NumberField({ initial: 100, min: 0, integer: true }),
        max: new NumberField({ initial: 99, min: 0, integer: true }),
        currentBreakingPoint: new NumberField({ initial: 101, integer: true }),
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
    const sourceStatistics = this.parent?._source?.system?.statistics;
    prepareStatisticsX5(this.statistics, sourceStatistics);
    initializeSanityIfUnset(this.sanity, this.statistics);
    this.sanity.max = cleanDerivedNumber(
      this,
      "sanity.max",
      99 - this.skills.unnatural.proficiency,
    );
    this.wp.max = cleanDerivedNumber(
      this,
      "wp.max",
      this.statistics.pow.effectiveValue ?? this.statistics.pow.value,
    );
    this.health.max = cleanDerivedNumber(
      this,
      "health.max",
      calculateHealthMax(this.statistics, sourceStatistics),
    );
    this.statistics.str.meleeDamageBonusFormula =
      calculateMeleeDamageBonusFormula(
        this.statistics.str.effectiveValue ?? this.statistics.str.value,
      );
    removeLegacyRitualSkill(this);
    clampSanityRitualValue(this.sanity);
    this.health.protection = computeEquippedArmorProtection(this.parent.items);
    setSkillTargetProficiencies(this.skills);
  }
}
