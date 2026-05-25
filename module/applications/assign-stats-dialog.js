import { BASE_TEMPLATE_PATH } from "../config.js";
import {
  STAT_KEYS,
  STAT_MAX,
  STAT_MIN,
  applyAgentStatistics,
  buildStatisticRows,
  getDefaultPointBuyValues,
  validatePointBuyValues,
} from "../utils/profession-stat-setup.js";

const { DialogV2 } = foundry.applications.api;
const { renderTemplate } = foundry.applications.handlebars;

/** @typedef {'submitted' | 'cancelled'} AssignStatsResult */

/**
 * @param {DialogV2} dialog
 * @returns {HTMLElement|null}
 */
function contentRoot(dialog) {
  return dialog.element?.querySelector(".dialog-content") ?? null;
}

/**
 * @param {DialogV2} dialog
 * @param {Record<string, number>} values
 */
function syncValuesFromDom(dialog, values) {
  const root = contentRoot(dialog);
  if (!root) return;

  for (const key of STAT_KEYS) {
    const input = root.querySelector(`[data-stat-key="${key}"]`);
    if (!input) continue;
    let value = Number(input.value);
    if (!Number.isFinite(value)) value = STAT_MIN;
    values[key] = Math.clamp(Math.trunc(value), STAT_MIN, STAT_MAX);
  }
}

/**
 * @param {DialogV2} dialog
 * @param {Record<string, number>} values
 */
function refreshAssignStatsUi(dialog, values) {
  syncValuesFromDom(dialog, values);
  const { isValid, remaining } = validatePointBuyValues(values);

  const root = contentRoot(dialog);
  const remainingEl = root?.querySelector("[data-points-remaining]");
  if (remainingEl) {
    remainingEl.textContent = game.i18n.format(
      "DG.ProfessionSetup.AssignStats.PointsRemaining",
      { remaining },
    );
    remainingEl.classList.toggle("is-invalid", remaining !== 0);
  }

  const submitBtn = dialog.element?.querySelector(
    'button[data-action="submit"]',
  );
  if (submitBtn) submitBtn.disabled = !isValid;
}

/**
 * @param {DialogV2} dialog
 * @param {Record<string, number>} values
 */
function bindAssignStatsListeners(dialog, values) {
  const root = contentRoot(dialog);
  if (!root) return;

  root.querySelectorAll("[data-stat-key]").forEach((input) => {
    input.addEventListener("input", () => {
      const key = input.dataset.statKey;
      if (!key) return;

      let value = Number(input.value);
      if (!Number.isFinite(value)) value = STAT_MIN;
      value = Math.clamp(Math.trunc(value), STAT_MIN, STAT_MAX);
      input.value = String(value);
      values[key] = value;
      refreshAssignStatsUi(dialog, values);
    });
    input.addEventListener("change", () =>
      refreshAssignStatsUi(dialog, values),
    );
  });
}

/**
 * @param {Actor} actor
 * @returns {Promise<AssignStatsResult>}
 */
export async function showAssignStatsDialog(actor) {
  /** @type {Record<string, number>} */
  const values = getDefaultPointBuyValues();
  const { remaining } = validatePointBuyValues(values);
  /** @type {AssignStatsResult} */
  let result = "cancelled";

  const content = await renderTemplate(
    `${BASE_TEMPLATE_PATH}/dialog/assign-stats.html`,
    {
      stats: buildStatisticRows(),
      values,
      statMin: STAT_MIN,
      statMax: STAT_MAX,
      remaining,
    },
  );

  return DialogV2.wait({
    content,
    window: {
      title: game.i18n.localize("DG.ProfessionSetup.AssignStats.Title"),
    },
    position: { width: 420 },
    classes: ["assign-stats-dialog-app"],
    form: { closeOnSubmit: false },
    render: (_event, dialog) => {
      bindAssignStatsListeners(dialog, values);
      refreshAssignStatsUi(dialog, values);
    },
    close: () => result,
    buttons: [
      {
        action: "cancel",
        label: game.i18n.localize("Cancel"),
        callback: async (_event, _button, dialog) => {
          result = "cancelled";
          await dialog.close();
        },
      },
      {
        action: "submit",
        label: game.i18n.localize("DG.ProfessionSetup.AssignStats.Submit"),
        default: true,
        disabled: true,
        callback: async (_event, _button, dialog) => {
          syncValuesFromDom(dialog, values);
          const { isValid } = validatePointBuyValues(values);
          if (!isValid) return false;

          await applyAgentStatistics(actor, { ...values });
          result = "submitted";
          await dialog.close();
          return false;
        },
      },
    ],
  });
}

export default { showAssignStatsDialog };
