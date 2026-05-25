import { BASE_TEMPLATE_PATH } from "../config.js";

const { DialogV2 } = foundry.applications.api;
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

  return DialogV2.wait({
    content,
    window: {
      title: game.i18n.localize("DG.ProfessionSetup.PickStatistics.Title"),
    },
    position: { width: 480 },
    classes: ["pick-statistics-dialog-app"],
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

export default { showPickStatisticsDialog };
