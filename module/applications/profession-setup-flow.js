import showPickSkillsDialog from "./add-profession-dialog.js";
import showAssignStatsDialog from "./assign-stats-dialog.js";
import showDamagedVeteransDialog from "./damaged-veterans-dialog.js";
import showHardExperienceDialog from "./hard-experience-dialog.js";
import showPickStatisticsDialog from "./pick-statistics-dialog.js";
import showRollStatsDialog from "./roll-stats-dialog.js";
import showThingsDisorderDialog from "./things-disorder-dialog.js";
import { commitProfessionSetup } from "../profession/index.js";

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
 * @param {Actor} actor
 * @param {object} [options]
 * @param {TokenDocument|null} [options.token]
 * @returns {Promise<boolean>}
 */
async function runStatsPhase(actor, { token = null } = {}) {
  const choice = await showPickStatisticsDialog();
  if (choice === null) return false;
  if (choice === "skip") return true;

  if (choice === "roll") {
    const result = await showRollStatsDialog(actor, { token });
    if (result === null) return false;
    if (result.outcome === "back") return runStatsPhase(actor, { token });
    return true;
  }

  if (choice === "assign") {
    const result = await showAssignStatsDialog(actor);
    if (result === null) return false;
    if (result.outcome === "back") return runStatsPhase(actor, { token });
    return true;
  }

  return false;
}

/**
 * @param {import("../profession/commit-character-creation.js").CharacterCreationPayload} payload
 * @param {object} [options]
 * @param {string} [options.selectedPath]
 * @param {import("./hard-experience-dialog.js").HardExperienceDialogState} [options.heState]
 * @param {import("./things-disorder-dialog.js").ThingsDisorderDialogState} [options.tdState]
 * @returns {Promise<object|null>}
 */
async function resolveVeteranResult(
  payload,
  { selectedPath, heState, tdState } = {},
) {
  const dvResult = await showDamagedVeteransDialog(payload, { selectedPath });
  if (dvResult === null) return null;
  if (dvResult.outcome === "back") return { outcome: "back" };

  const { path } = dvResult;

  if (path === "hardExperience") {
    const heResult = await showHardExperienceDialog(payload, heState);
    if (heResult === null) return null;
    if (heResult.outcome === "back") {
      return resolveVeteranResult(payload, {
        selectedPath: "hardExperience",
        heState: {
          bonusCatalogIds: heResult.bonusCatalogIds,
          bonusTypedLabels: heResult.bonusTypedLabels,
          removedBondIndex: heResult.removedBondIndex,
        },
      });
    }

    return {
      path: "hardExperience",
      bonusCatalogIds: heResult.bonusCatalogIds,
      bonusTypedLabels: heResult.bonusTypedLabels,
      removedBondIndex: heResult.removedBondIndex,
    };
  }

  if (path === "thingsMan") {
    const tdResult = await showThingsDisorderDialog(tdState);
    if (tdResult === null) return null;
    if (tdResult.outcome === "back") {
      return resolveVeteranResult(payload, {
        selectedPath: "thingsMan",
        tdState: { disorder: tdResult.disorder },
      });
    }

    return {
      path: "thingsMan",
      disorder: tdResult.disorder,
    };
  }

  return { path };
}

/**
 * @param {Item} professionItem
 * @param {Actor} actor
 * @param {import("./add-profession-dialog.js").CharacterCreationDraft} [characterDraft]
 * @returns {Promise<boolean>}
 */
async function runCharacterCreationPhase(
  professionItem,
  actor,
  characterDraft,
) {
  const ccResult = await showPickSkillsDialog(professionItem, actor, {
    draft: characterDraft,
  });
  if (ccResult === null) return false;

  const veteranResult = await resolveVeteranResult(ccResult.payload);
  if (veteranResult === null) return false;
  if (veteranResult.outcome === "back") {
    return runCharacterCreationPhase(professionItem, actor, ccResult.draft);
  }

  await commitProfessionSetup(
    actor,
    professionItem,
    ccResult.payload,
    veteranResult,
  );
  return true;
}

/**
 * Run the full profession setup flow: Pick Statistics → optional stat setup → Character Creation → Damaged Veterans.
 *
 * @param {Item} professionItem Profession item or unsaved stub on the actor
 * @param {Actor} actor
 * @param {object} [options]
 * @param {TokenDocument|null} [options.token]
 * @returns {Promise<boolean>} True if the full setup flow completed successfully.
 */
async function runProfessionSetupFlow(
  professionItem,
  actor,
  { token = null } = {},
) {
  const statsComplete = await runStatsPhase(actor, { token });
  if (!statsComplete) return false;

  return runCharacterCreationPhase(professionItem, actor);
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
export default async function assignProfessionToAgent(
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

  return actor.items.find((item) => item.type === "profession") ?? null;
}
