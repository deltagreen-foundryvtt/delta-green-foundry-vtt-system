/**
 * Rich-text field specs keyed by actor sheet part id.
 * @type {Record<string, Record<string, { path: string, key: string }[]>>}
 */
const ACTOR_RICH_TEXT_BY_PART = {
  agent: {
    rightBar: [{ path: "physical.description", key: "description" }],
  },
  npc: {
    skills: [{ path: "notes", key: "description" }],
  },
  unnatural: {
    skills: [{ path: "notes", key: "description" }],
  },
  vehicle: {
    notes: [{ path: "description", key: "description" }],
  },
};

/**
 * Rich-text field specs keyed by item sheet part id.
 * @type {Record<string, { path: string, key: string, types?: string[] }[]>}
 */
const ITEM_RICH_TEXT_BY_PART = {
  description: [{ path: "description", key: "description" }],
  handler: [
    {
      path: "handlerNotes",
      key: "handlerNotes",
      types: ["tome", "ritual"],
    },
  ],
};

/**
 * @param {"Actor"|"Item"} documentName
 * @param {string} partId
 * @param {object} [options]
 * @param {string} [options.actorType]
 * @param {string} [options.itemType]
 * @param {boolean} [options.showNotesInSkills]
 * @returns {{ path: string, key: string }[]}
 */
export default function getRichTextFieldsForPart(
  documentName,
  partId,
  { actorType, itemType, showNotesInSkills = true } = {},
) {
  if (documentName === "Actor") {
    if (partId === "skills" && !showNotesInSkills) return [];
    return ACTOR_RICH_TEXT_BY_PART[actorType]?.[partId] ?? [];
  }

  if (documentName === "Item") {
    return (ITEM_RICH_TEXT_BY_PART[partId] ?? []).filter(
      (spec) => !spec.types || spec.types.includes(itemType),
    );
  }

  return [];
}
