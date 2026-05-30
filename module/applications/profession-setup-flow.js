import { showPickSkillsDialog } from "./add-profession-dialog.js";
import { showAssignStatsDialog } from "./assign-stats-dialog.js";
import { showPickStatisticsDialog } from "./pick-statistics-dialog.js";
import { showRollStatsDialog } from "./roll-stats-dialog.js";

/**
 * @param {Actor} actor
 * @param {object} itemData
 * @returns {Item}
 */
function createProfessionStub(actor, itemData) {
  const data = foundry.utils.duplicate(itemData);
  delete data._id;
  const ItemDocument = foundry.utils.getDocumentClass("Item");
  return new ItemDocument(data, { parent: actor });
}

/**
 * Run the full profession setup flow: Pick Statistics → optional stat setup → Character Creation.
 *
 * @param {Item} professionItem Profession item or unsaved stub on the actor
 * @param {Actor} actor
 * @param {object} [options]
 * @param {TokenDocument|null} [options.token]
 * @returns {Promise<boolean>} True if Character Creation was submitted successfully.
 */
export async function runProfessionSetupFlow(
  professionItem,
  actor,
  { token = null } = {},
) {
  let statsComplete = false;

  while (!statsComplete) {
    const choice = await showPickStatisticsDialog();
    if (choice === null) return false;

    if (choice === "skip") {
      statsComplete = true;
    } else if (choice === "roll") {
      const result = await showRollStatsDialog(actor, { token });
      if (result === "submitted") statsComplete = true;
    } else if (choice === "assign") {
      const result = await showAssignStatsDialog(actor);
      if (result === "submitted") statsComplete = true;
    }
  }

  return showPickSkillsDialog(professionItem, actor);
}

/**
 * Assign a profession to an agent: full setup flow, then embed the item only on success.
 *
 * @param {Actor} actor
 * @param {object} itemData Item source data (e.g. from drop `toObject()` or create template)
 * @param {object} [options]
 * @param {TokenDocument|null} [options.token]
 * @returns {Promise<Item|null>}
 */
export async function assignProfessionToAgent(
  actor,
  itemData,
  { token = null } = {},
) {
  if (actor.items.some((i) => i.type === "profession")) {
    ui.notifications.info(game.i18n.localize("DG.Profession.AlreadyAssigned"), {
      localize: false,
    });
    return null;
  }

  const stub = createProfessionStub(actor, itemData);
  const submitted = await runProfessionSetupFlow(stub, actor, { token });
  if (!submitted) return null;

  const createData = stub.toObject();
  delete createData._id;
  const created = await actor.createEmbeddedDocuments("Item", [createData]);
  return created[0] ?? null;
}
