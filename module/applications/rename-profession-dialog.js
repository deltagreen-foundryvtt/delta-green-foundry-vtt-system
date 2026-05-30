import { BASE_TEMPLATE_PATH } from "../config/index.js";
import { getDialogContentRoot, showDgDialog } from "./dg-dialog.js";

const { renderTemplate } = foundry.applications.handlebars;

/**
 * @param {Item} professionItem
 * @returns {Promise<boolean>} True if the name was updated.
 */
export default async function showRenameProfessionDialog(professionItem) {
  if (professionItem.type !== "profession") return false;

  const content = await renderTemplate(
    `${BASE_TEMPLATE_PATH}/dialog/rename-profession.html`,
    { name: professionItem.name },
  );

  const result = await showDgDialog({
    modifier: "rename-profession",
    content,
    position: { width: 360 },
    window: {
      title: game.i18n.localize("DG.AgentSheet.RenameProfession.Title"),
    },
    default: "submit",
    buttons: [
      {
        default: true,
        action: "submit",
        label: game.i18n.localize("DG.Profession.Dialog.Submit"),
        callback: (_event, _button, dialog) => {
          const name = getDialogContentRoot(dialog)
            ?.querySelector("[name='profession-rename']")
            ?.value?.trim();
          return name || null;
        },
      },
    ],
  });

  if (!result || result === professionItem.name) return false;

  await professionItem.update({ name: result });
  return true;
}
