import UnnaturalSkillsActorData from "./base/unnatural-skills.js";
import CharacterData from "./base/character.js";
import DGHTMLField from "../fields/html-content-field.js";
import {
  calculateHealthMax,
  cleanDerivedNumber,
  computeEquippedArmorProtection,
  prepareStatisticsX5,
  removeLegacyRitualSkill,
  setSkillTargetProficiencies,
} from "../../utils/derived-actor-data.js";

const { SchemaField, NumberField, StringField, BooleanField, HTMLField } =
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
      schemaVersion: new NumberField({ initial: 2.0 }),
      notes: DGHTMLField(),
      shortDescription: new StringField({ initial: "" }),
      showUntrainedSkills: new BooleanField({ initial: true }),
    };
  }

  /** @inheritdoc */
  prepareDerivedData() {
    const sourceStatistics = this.parent?._source?.system?.statistics;
    prepareStatisticsX5(this.statistics, sourceStatistics);

    if (this.wp.maxNeedsUpdate) {
      this.wp.max = cleanDerivedNumber(
        this,
        "wp.max",
        this.statistics.pow.effectiveValue ?? this.statistics.pow.value,
      );
    }

    if (this.health.maxNeedsUpdate) {
      this.health.max = cleanDerivedNumber(
        this,
        "health.max",
        calculateHealthMax(this.statistics, sourceStatistics),
      );
    }

    removeLegacyRitualSkill(this);
    this.health.protection = computeEquippedArmorProtection(this.parent.items);
    setSkillTargetProficiencies(this.skills);
  }
}
