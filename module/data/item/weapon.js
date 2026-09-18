import defineBaseItemSystemFields from "./base-fields.js";

const { NumberField, StringField, BooleanField } = foundry.data.fields;

export default class WeaponItemData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      ...defineBaseItemSystemFields(),
      skill: new StringField({ initial: "" }),
      skillModifier: new NumberField({ initial: 0, integer: true }),
      customSkillTarget: new NumberField({ initial: 50, integer: true }),
      range: new StringField({ initial: "10M" }),
      damage: new StringField({ initial: "1D8" }),
      armorPiercing: new NumberField({ initial: 0, integer: true }),
      lethality: new NumberField({ initial: 0, integer: true }),
      /**
       * Deprecated:
       * isLethal is no longer required, but to retain compatibility with
       * existing worlds is kept as a read-only field.
       */
      isLethal: new BooleanField({ initial: false, persisted: false }),
      killRadius: new StringField({ initial: "N/A" }),
      ammo: new StringField({ initial: "" }),
      expense: new StringField({ initial: "Standard" }),
      equipped: new BooleanField({ initial: true }),
    };
  }
}
