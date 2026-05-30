const { ArrayField, SchemaField, StringField, NumberField, AnyField } =
  foundry.data.fields;

/**
 * Delta Green Active Effect system data — matches core change schema with `final` as the default phase.
 * @extends {foundry.data.ActiveEffectTypeDataModel}
 */
export default class DGActiveEffectTypeDataModel extends foundry.data
  .ActiveEffectTypeDataModel {
  /** @override */
  static defineSchema() {
    return {
      changes: new ArrayField(
        new SchemaField({
          key: new StringField({ required: true }),
          type: new StringField({
            required: true,
            blank: false,
            initial: "add",
            validate: DGActiveEffectTypeDataModel.#validateType,
          }),
          value: new AnyField({
            required: true,
            nullable: true,
            serializable: true,
            initial: "",
          }),
          phase: new StringField({
            required: true,
            blank: false,
            initial: "final",
          }),
          priority: new NumberField(),
        }),
      ),
    };
  }

  /**
   * @param {string} type
   * @returns {true}
   */
  static #validateType(type) {
    if (type.length < 3)
      throw new Error("must be at least three characters long");
    if (
      !/^custom\.-?\d+$/.test(type) &&
      !type.split(".").every((s) => /^[a-z0-9]+$/i.test(s))
    ) {
      throw new Error(
        'A change type must either be a sequence of dot-delimited, alpha-numeric substrings or of the form "custom.{number}"',
      );
    }
    return true;
  }
}
