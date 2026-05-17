const { StringField } = foundry.data.fields;

/**
 * Shared system fields for all Delta Green item types (from legacy template base).
 * Item display name lives on the document (`Item#name`), not in system.
 */
export default function defineBaseItemSystemFields() {
  return {
    description: new StringField({ initial: "" }),
  };
}
