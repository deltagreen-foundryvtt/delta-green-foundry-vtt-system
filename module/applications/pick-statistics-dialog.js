import { BASE_TEMPLATE_PATH } from "../config.js";
import { showDgDialog } from "./dg-dialog.js";

const { renderTemplate } = foundry.applications.handlebars;

/** @typedef {'roll' | 'assign' | 'skip'} PickStatisticsChoice */

/**
 * @returns {Promise<PickStatisticsChoice | null>}
 */
export async function showPickStatisticsDialog() {
  const content = await renderTemplate(
    `${BASE_TEMPLATE_PATH}/dialog/pick-statistics.html`,
    {},
  );

  return showDgDialog({
    modifier: "pick-statistics",
    content,
    window: {
      title: game.i18n.localize("DG.ProfessionSetup.PickStatistics.Title"),
    },
    position: { width: 480 },
    close: () => null,
    buttons: [
      {
        action: "roll",
        label: game.i18n.localize("DG.ProfessionSetup.PickStatistics.RollStats"),
        tooltip: game.i18n.localize(
          "DG.ProfessionSetup.PickStatistics.RollStatsTooltip",
        ),
        callback: () => "roll",
      },
      {
        action: "assign",
        label: game.i18n.localize(
          "DG.ProfessionSetup.PickStatistics.AssignStats",
        ),
        tooltip: game.i18n.localize(
          "DG.ProfessionSetup.PickStatistics.AssignStatsTooltip",
        ),
        callback: () => "assign",
      },
      {
        action: "skip",
        label: game.i18n.localize(
          "DG.ProfessionSetup.PickStatistics.LeaveStatsAlone",
        ),
        callback: () => "skip",
      },
    ],
  });
}
