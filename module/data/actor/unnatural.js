import UnnaturalSkillsActorData from "./base/unnatural-skills.js";
import CharacterData from "./base/character.js";
import DGHTMLField from "../fields/html-content-field.js";
import {
  calculateHealthMax,
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
    prepareStatisticsX5(this.statistics);

    if (this.wp.maxNeedsUpdate) {
      this.wp.max = this.statistics.pow.value;
    }

    if (this.health.maxNeedsUpdate) {
      this.health.max = calculateHealthMax(this.statistics);
    }

    removeLegacyRitualSkill(this);
    this.health.protection = computeEquippedArmorProtection(this.parent.items);
    setSkillTargetProficiencies(this.skills);
  }
}
