import { BASE_TEMPLATE_PATH } from "../config/index.js";
import {
  STAT_KEYS,
  STAT_MAX,
  STAT_MIN,
  applyAgentStatistics,
  buildStatisticRows,
  getDefaultPointBuyValues,
  validatePointBuyValues,
} from "../profession/stat-setup.js";
import { getDialogContentRoot, showDgDialog } from "./dg-dialog.js";

const { renderTemplate } = foundry.applications.handlebars;

/** @typedef {'submitted' | 'back'} AssignStatsOutcome */

/**
 * @param {DialogV2} dialog
 * @param {Record<string, number>} values
 */
function syncValuesFromDom(dialog, values) {
  const root = getDialogContentRoot(dialog);
  if (!root) return;

  for (const key of STAT_KEYS) {
    const input = root.querySelector(`[data-stat-key="${key}"]`);
    if (input) {
      let value = Number(input.value);
      if (!Number.isFinite(value)) value = STAT_MIN;
      values[key] = Math.clamp(Math.trunc(value), STAT_MIN, STAT_MAX);
    }
  }
}

/**
 * @param {DialogV2} dialog
 * @param {Record<string, number>} values
 */
function refreshAssignStatsUi(dialog, values) {
  syncValuesFromDom(dialog, values);
  const { isValid, remaining } = validatePointBuyValues(values);

  const root = getDialogContentRoot(dialog);
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
  const root = getDialogContentRoot(dialog);
  if (!root) return;

  root.querySelectorAll("[data-stat-key]").forEach((input) => {
    // While typing, only recompute the running total. Do not rewrite the field,
    // otherwise a partial multi-digit entry (e.g. "1" toward "10") gets clamped
    // mid-keystroke and corrupts the final value.
    input.addEventListener("input", () => refreshAssignStatsUi(dialog, values));

    // On commit (blur / Enter), clamp the field to the valid range.
    input.addEventListener("change", () => {
      const key = input.dataset.statKey;

      let value = Number(input.value);
      if (!Number.isFinite(value)) value = STAT_MIN;
      value = Math.clamp(Math.trunc(value), STAT_MIN, STAT_MAX);
      input.value = String(value);
      if (key) values[key] = value;
      refreshAssignStatsUi(dialog, values);
    });
  });
}

/**
 * @param {Actor} actor
 * @returns {Promise<{ outcome: 'submitted' } | { outcome: 'back' } | null>}
 */
export default async function showAssignStatsDialog(actor) {
  /** @type {Record<string, number>} */
  const values = getDefaultPointBuyValues();
  const { remaining } = validatePointBuyValues(values);
  /** @type {{ outcome: 'submitted' } | { outcome: 'back' } | null} */
  let result = null;

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

  return showDgDialog({
    modifier: "assign-stats",
    content,
    window: {
      title: game.i18n.localize("DG.ProfessionSetup.AssignStats.Title"),
    },
    position: { width: 420 },
    form: { closeOnSubmit: false },
    onRender: (dialog) => {
      bindAssignStatsListeners(dialog, values);
      refreshAssignStatsUi(dialog, values);
    },
    close: () => result,
    buttons: [
      {
        action: "back",
        label: game.i18n.localize("DG.ProfessionSetup.GoBack"),
        callback: async (_event, _button, dialog) => {
          result = { outcome: "back" };
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
          result = { outcome: "submitted" };
          await dialog.close();
          return false;
        },
      },
    ],
  });
}
