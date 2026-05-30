import SheetSettingsActorData from "./base/sheet-settings.js";
import DGHTMLField from "../fields/html-content-field.js";
import { computeEquippedArmorProtection } from "../../data/derived/actor-derived.js";

const { SchemaField, NumberField, StringField, ArrayField } =
  foundry.data.fields;

export default class VehicleData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      ...SheetSettingsActorData.defineSchema(),
      name: new StringField({ initial: "" }),
      description: DGHTMLField(),
      shortDescription: new StringField({ initial: "" }),
      health: new SchemaField({
        value: new NumberField({ initial: 10 }),
        min: new NumberField({ initial: 0 }),
        max: new NumberField({ initial: 10 }),
      }),
      speed: new StringField({ initial: "" }),
      expense: new StringField({ initial: "Standard" }),
      passengers: new ArrayField(new StringField()),
    };
  }

  /** @inheritdoc */
  prepareDerivedData() {
    this.health.protection = computeEquippedArmorProtection(this.parent.items);
  }
}
