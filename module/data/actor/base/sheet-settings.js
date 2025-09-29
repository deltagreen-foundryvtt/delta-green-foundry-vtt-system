const { SchemaField, NumberField, BooleanField } = foundry.data.fields;
const { TypeDataModel } = foundry.abstract;

export default class SheetSettingsActorData extends TypeDataModel {
  static defineSchema() {
    return {
      settings: new SchemaField({
        sorting: new SchemaField({
          weaponSortAlphabetical: new BooleanField({ initial: false }),
          armorSortAlphabetical: new BooleanField({ initial: false }),
          gearSortAlphabetical: new BooleanField({ initial: false }),
          tomeSortAlphabetical: new BooleanField({ initial: false }),
          ritualSortAlphabetical: new BooleanField({ initial: false }),
        }),
        rolling: new SchemaField({
          defaultPercentileModifier: new NumberField({ initial: 20 }),
        }),
      }),
    };
  }
}
