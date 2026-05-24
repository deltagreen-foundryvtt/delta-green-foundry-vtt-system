/**
 * Rich-text field specs for actor sheets (by actor type).
 * @type {Record<string, { path: string, key: string }[]>}
 */
export const ACTOR_RICH_TEXT_BY_TYPE = {
  agent: [{ path: "physical.description", key: "description" }],
  npc: [{ path: "notes", key: "description" }],
  unnatural: [{ path: "notes", key: "description" }],
  vehicle: [{ path: "description", key: "description" }],
};

/**
 * Rich-text field specs for all item types.
 * @type {{ path: string, key: string, types?: string[] }[]}
 */
export const ITEM_RICH_TEXT_FIELDS = [
  { path: "description", key: "description" },
  {
    path: "handlerNotes",
    key: "handlerNotes",
    types: ["tome", "ritual"],
  },
];

/**
 * @param {string} itemType
 * @returns {{ path: string, key: string }[]}
 */
export function getItemRichTextFields(itemType) {
  return ITEM_RICH_TEXT_FIELDS.filter(
    (spec) => !spec.types || spec.types.includes(itemType),
  );
}
